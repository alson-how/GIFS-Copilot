/**
 * Customer Authentication Context
 * Provides customer authentication state and methods
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, directApiRequest } from '../config/api.js';

const CustomerAuthContext = createContext();

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('customer_access_token');
        
        if (!token) {
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
          
          if (result.success && result.data.userType === 'customer') {
            // Token is valid, get customer profile
            await loadCustomerProfile(token);
          } else {
            // Invalid or wrong user type
            logout();
          }
        } else {
          // Token verification failed
          logout();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const loadCustomerProfile = async (token) => {
    try {
      // In a real app, you'd fetch the customer profile here
      // For now, we'll decode it from the token payload (not secure in production)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      setCustomer({
        id: payload.id,
        email: payload.email,
        companyName: payload.companyName,
        firstName: payload.firstName,
        lastName: payload.lastName
      });
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to load customer profile:', error);
      logout();
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      setIsLoading(true);

      const response = await apiRequest('/auth/customer/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe })
      });

      const result = await response.json();

      if (result.success) {
        const { accessToken, refreshToken, customer: customerData } = result.data;
        
        // Store tokens
        localStorage.setItem('customer_access_token', accessToken);
        localStorage.setItem('customer_refresh_token', refreshToken);
        
        // Update state
        setCustomer(customerData);
        setIsAuthenticated(true);

        return { success: true, customer: customerData };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: 'Login failed. Please check your connection and try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (registrationData) => {
    try {
      setIsLoading(true);

      const response = await apiRequest('/auth/customer/register', {
        method: 'POST',
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        error: 'Registration failed. Please check your connection and try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      const token = localStorage.getItem('customer_access_token');
      if (token) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customer_refresh_token');
      setCustomer(null);
      setIsAuthenticated(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('customer_access_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await directApiRequest('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const result = await response.json();

      if (result.success) {
        setCustomer({ ...customer, ...result.data });
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      return { 
        success: false, 
        error: 'Profile update failed. Please try again.' 
      };
    }
  };

  const getToken = () => {
    return localStorage.getItem('customer_access_token');
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token available');
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
      throw new Error('Authentication expired. Please log in again.');
    }

    return response;
  };

  const value = {
    customer,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    getToken,
    makeAuthenticatedRequest
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export default CustomerAuthContext;