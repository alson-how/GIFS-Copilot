/**
 * Customer Authentication Middleware
 * Handles customer portal authentication and authorization
 */

import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const authCustomer = (req, res, next) => {
  console.log('authCustomer (REQUIRED) called for:', req.path);
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('authCustomer rejecting - no auth header');
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied. No valid token provided.' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const jwtSecret = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    // Ensure this is a customer token
    if (decoded.userType !== 'customer') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Customer access required.' 
      });
    }

    // Add customer info to request
    req.customer = {
      id: decoded.id,
      email: decoded.email,
      companyName: decoded.companyName,
      userType: decoded.userType
    };

    logger.info(`Customer authenticated: ${decoded.email}`, { 
      customerId: decoded.id,
      endpoint: req.path
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }

    logger.error('Customer authentication error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication server error' 
    });
  }
};

// Optional authentication - allows both authenticated and guest access
export const authCustomerOptional = (req, res, next) => {
  console.log('authCustomerOptional called for:', req.path);
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided - continue as guest
    console.log('No auth header, continuing as guest');
    req.customer = null;
    return next();
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET);
    
    if (decoded.userType === 'customer') {
      req.customer = {
        id: decoded.id,
        email: decoded.email,
        companyName: decoded.companyName,
        userType: decoded.userType
      };
    }
  } catch (error) {
    // Invalid token - continue as guest
    logger.warn('Invalid customer token in optional auth:', error.message);
  }

  next();
};

export default { authCustomer, authCustomerOptional };