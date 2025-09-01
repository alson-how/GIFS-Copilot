/**
 * Admin Authentication Context
 * Provides admin authentication state and methods with role-based access
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, directApiRequest } from '../config/api.js';

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
        // Clean up any bad tokens first
        const token1 = localStorage.getItem('admin_access_token');
        const token2 = localStorage.getItem('admin_token');
        
        console.log('🔍 Auth check - token1:', token1?.substring(0, 50) + '...' || token1);
        console.log('🔍 Auth check - token2:', token2?.substring(0, 50) + '...' || token2);
        
        // Remove any tokens that are the string 'null' or 'undefined'
        if (token1 === 'null' || token1 === 'undefined') {
          console.log('🧹 Cleaning up bad admin_access_token:', token1);
          localStorage.removeItem('admin_access_token');
        }
        if (token2 === 'null' || token2 === 'undefined') {
          console.log('🧹 Cleaning up bad admin_token:', token2);
          localStorage.removeItem('admin_token');
        }
        
        const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
        
        if (!token || token === 'null' || token === 'undefined') {
          console.log('🔍 No valid token found, skipping auth check');
          setIsLoading(false);
          return;
        }

        // Verify token with backend
        const response = await apiRequest('/auth/verify-token', {
          headers: {
            'Authorization': `Bearer ${token}`
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
      logout();
    }
  };

  const login = async (username, password, rememberMe = false) => {
    try {
      setIsLoading(true);
      
      // Clear any existing bad tokens first
      console.log('🧹 Clearing existing tokens before login...');
      clearAllTokens();

      const response = await apiRequest('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, rememberMe })
      });

      const result = await response.json();
      console.log('Admin login result:', result);
      console.log('AccessToken from result:', result?.data?.accessToken);
      console.log('AccessToken type:', typeof result?.data?.accessToken);
      console.log('AccessToken length:', result?.data?.accessToken?.length);

      if (result.success) {
        const { accessToken, admin: adminData } = result.data;
        
        console.log('Extracted accessToken:', accessToken);
        console.log('Extracted accessToken type:', typeof accessToken);
        console.log('Extracted accessToken is null/undefined?', accessToken === null || accessToken === undefined);
        
        // Validate token before storing
        if (!accessToken || accessToken === 'null' || accessToken === 'undefined') {
          console.error('❌ Invalid token received from login API:', accessToken);
          return { 
            success: false, 
            error: 'Invalid authentication token received from server' 
          };
        }
        
        console.log('✅ Storing valid accessToken:', accessToken.substring(0, 50) + '...');
        // Store token with correct key for API compatibility
        localStorage.setItem('admin_access_token', accessToken);
        localStorage.setItem('admin_token', accessToken); // Keep for backward compatibility
        
        // Verify token was stored correctly
        const storedToken = localStorage.getItem('admin_access_token');
        console.log('✅ Verified stored token:', storedToken?.substring(0, 50) + '...');
        console.log('✅ Token stored successfully:', storedToken === accessToken);
        
        // Update state
        setAdmin(adminData);
        setPermissions(adminData.permissions || []);
        setIsAuthenticated(true);

        return { success: true, admin: adminData };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
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
      const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
      if (token) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_token');
      // Also clear any other potential token keys that might exist
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin_access_token');
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
      const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await directApiRequest('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
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
      return { 
        success: false, 
        error: 'Profile update failed. Please try again.' 
      };
    }
  };

  const getToken = () => {
    const token1 = localStorage.getItem('admin_access_token');
    const token2 = localStorage.getItem('admin_token');
    
    // Clean up bad tokens
    if (token1 === 'null' || token1 === 'undefined') {
      localStorage.removeItem('admin_access_token');
    }
    if (token2 === 'null' || token2 === 'undefined') {
      localStorage.removeItem('admin_token');
    }
    
    const finalToken = (token1 !== 'null' && token1 !== 'undefined' ? token1 : null) || 
                      (token2 !== 'null' && token2 !== 'undefined' ? token2 : null);
    
    console.log('🔍 getToken() debug:');
    console.log('  - admin_access_token:', token1?.substring(0, 50) + '...' || token1);
    console.log('  - admin_token:', token2?.substring(0, 50) + '...' || token2);
    console.log('  - final token:', finalToken?.substring(0, 50) + '...' || finalToken);
    console.log('  - is null string?', finalToken === 'null');
    
    return finalToken;
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

  const clearAllTokens = () => {
    console.log('🧹 Clearing all admin tokens from localStorage');
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_access_token');
    
    // Also clear any other variations that might exist
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('admin') && key.includes('token')) {
        console.log('🧹 Removing additional admin token key:', key);
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ All admin tokens cleared');
  };

  const switchRole = async (newRole) => {
    // Only allow role switching for super admins or if explicitly permitted
    if (!hasRole('super_admin') && !hasPermission('switch_role')) {
      throw new Error('Insufficient permissions to switch roles');
    }

    try {
      const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
      const response = await directApiRequest('/api/admin/switch-role', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
    makeAuthenticatedRequest,
    clearAllTokens
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthContext;