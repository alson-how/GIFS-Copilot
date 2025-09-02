/**
 * Admin Authentication Middleware
 * Handles admin portal authentication and role-based authorization
 */

import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const authAdmin = (req, res, next) => {
  let token = null;
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied. Admin authentication required.' 
      });
    }

    token = authHeader.replace('Bearer ', '');
    
    if (!process.env.ADMIN_JWT_SECRET && !process.env.JWT_SECRET) {
      logger.error('ADMIN_JWT_SECRET or JWT_SECRET environment variable not set');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET);
    
    // Ensure this is an admin token
    if (decoded.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Admin privileges required.' 
      });
    }

    // Add admin info to request
    req.admin = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions || [],
      userType: decoded.userType
    };

    logger.info(`Admin authenticated: ${decoded.email}`, { 
      adminId: decoded.id,
      role: decoded.role,
      endpoint: req.path
    });

    next();
  } catch (error) {
    logger.error('Admin authentication error:', { 
      errorName: error.name, 
      errorMessage: error.message,
      token: token ? 'present' : 'missing'
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid admin token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Admin token expired' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'Admin authentication server error' 
    });
  }
};

// Role-based authorization middleware
export const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        error: 'Admin authentication required' 
      });
    }

    const userRoles = Array.isArray(req.admin.role) ? req.admin.role.map(r => r.toLowerCase()) : [req.admin.role.toLowerCase()];
    const requiredRolesList = Array.isArray(requiredRoles) ? requiredRoles.map(r => r.toLowerCase()) : [requiredRoles.toLowerCase()];
    
    const hasRequiredRole = requiredRolesList.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      logger.warn(`Admin access denied: insufficient role`, {
        adminId: req.admin.id,
        userRoles,
        requiredRoles: requiredRolesList,
        endpoint: req.path
      });
      
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required role: ${requiredRolesList.join(' or ')}` 
      });
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        error: 'Admin authentication required' 
      });
    }

    const userPermissions = req.admin.permissions || [];
    const requiredPermissionsList = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    const hasRequiredPermission = requiredPermissionsList.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasRequiredPermission) {
      logger.warn(`Admin access denied: insufficient permissions`, {
        adminId: req.admin.id,
        userPermissions,
        requiredPermissions: requiredPermissionsList,
        endpoint: req.path
      });
      
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required permission: ${requiredPermissionsList.join(' or ')}` 
      });
    }

    next();
  };
};

export default { authAdmin, requireRole, requirePermission };