/**
 * Admin Authentication Context
 * Provides admin authentication state and methods with role-based access
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [permissions, setPermissions] = useState([]);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Verify token with backend
        const response = await fetch('/api/auth/verify-token', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data.userType === 'admin') {
            // Token is valid, get admin profile
            await loadAdminProfile(token);
          } else {
            // Invalid or wrong user type
            logout();
          }
        } else {
          // Token verification failed
          logout();
        }
      } catch (error) {
        console.error('Admin auth check failed:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const loadAdminProfile = async (token) => {
    try {
      // In a real app, you'd fetch the admin profile here
      // For now, we'll decode it from the token payload (not secure in production)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      setAdmin({
        id: payload.id,
        username: payload.username,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
        permissions: payload.permissions || []
      });
      
      setPermissions(payload.permissions || []);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to load admin profile:', error);
      logout();
    }
  };

  const login = async (username, password, rememberMe = false) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, rememberMe })
      });

      const result = await response.json();

      if (result.success) {
        const { token, admin: adminData } = result.data;
        
        // Store token
        localStorage.setItem('admin_token', token);
        
        // Update state
        setAdmin(adminData);
        setPermissions(adminData.permissions || []);
        setIsAuthenticated(true);

        return { success: true, admin: adminData };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Admin login failed:', error);
      return { 
        success: false, 
        error: 'Login failed. Please check your connection and try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      const token = localStorage.getItem('admin_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Admin logout request failed:', error);
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('admin_token');
      setAdmin(null);
      setPermissions([]);
      setIsAuthenticated(false);
    }
  };

  const hasRole = (requiredRole) => {
    if (!admin || !admin.role) return false;
    
    const userRoles = Array.isArray(admin.role) ? admin.role : [admin.role];
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    return requiredRoles.some(role => userRoles.includes(role));
  };

  const hasPermission = (requiredPermission) => {
    if (!permissions || permissions.length === 0) return false;
    
    const requiredPermissions = Array.isArray(requiredPermission) 
      ? requiredPermission 
      : [requiredPermission];
    
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const canAccess = (resource, action = 'read') => {
    // Super admin has access to everything
    if (hasRole('super_admin')) return true;
    
    // Define resource-based permissions
    const resourcePermissions = {
      dashboard: ['read'],
      quotes: ['read', 'write', 'manage'],
      shipments: ['read', 'write', 'track'],
      customers: ['read', 'write', 'manage'],
      reports: ['read', 'generate'],
      settings: ['read', 'write'],
      users: ['read', 'write', 'manage']
    };
    
    const requiredPermission = `${resource}_${action}`;
    return hasPermission(requiredPermission) || hasPermission(`${resource}_manage`);
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const result = await response.json();

      if (result.success) {
        setAdmin({ ...admin, ...result.data });
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Admin profile update failed:', error);
      return { 
        success: false, 
        error: 'Profile update failed. Please try again.' 
      };
    }
  };

  const getToken = () => {
    return localStorage.getItem('admin_token');
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getToken();
    
    if (!token) {
      throw new Error('No admin authentication token available');
    }

    const authOptions = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, authOptions);

    // Handle unauthorized responses
    if (response.status === 401) {
      logout();
      throw new Error('Admin authentication expired. Please log in again.');
    }

    // Handle forbidden responses
    if (response.status === 403) {
      throw new Error('Insufficient permissions for this action.');
    }

    return response;
  };

  const switchRole = async (newRole) => {
    // Only allow role switching for super admins or if explicitly permitted
    if (!hasRole('super_admin') && !hasPermission('switch_role')) {
      throw new Error('Insufficient permissions to switch roles');
    }

    try {
      const response = await makeAuthenticatedRequest('/api/admin/switch-role', {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
      });

      const result = await response.json();

      if (result.success) {
        // Update admin data with new role
        setAdmin({ ...admin, role: newRole, permissions: result.data.permissions });
        setPermissions(result.data.permissions);
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Role switch failed:', error);
      return { success: false, error: 'Failed to switch role' };
    }
  };

  const value = {
    admin,
    isLoading,
    isAuthenticated,
    permissions,
    login,
    logout,
    hasRole,
    hasPermission,
    canAccess,
    updateProfile,
    switchRole,
    getToken,
    makeAuthenticatedRequest
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthContext;