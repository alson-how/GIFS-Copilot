/**
 * Axios Configuration with Interceptors
 * Handles automatic token attachment and refresh
 */

import axios from 'axios';

// Create axios instances for different user types
const createAxiosInstance = (userType) => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(`${userType}_access_token`);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token refresh
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // If request failed due to 401 and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem(`${userType}_refresh_token`);
          
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Try to refresh the token
          const response = await axios.post(
            `${instance.defaults.baseURL}/auth/${userType}/refresh`,
            { refreshToken }
          );

          if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            
            // Store new tokens
            localStorage.setItem(`${userType}_access_token`, accessToken);
            localStorage.setItem(`${userType}_refresh_token`, newRefreshToken);

            // Update the authorization header and retry the original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem(`${userType}_access_token`);
          localStorage.removeItem(`${userType}_refresh_token`);
          
          // Dispatch custom event to notify auth context
          window.dispatchEvent(new CustomEvent('authTokenExpired', { 
            detail: { userType } 
          }));
          
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Create instances for different user types
export const customerAxios = createAxiosInstance('customer');
export const adminAxios = createAxiosInstance('admin');

// Default export for general use (customer)
export default customerAxios;