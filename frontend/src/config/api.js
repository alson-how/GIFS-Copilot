/**
 * API Configuration
 * Centralized API URL and request handling
 */

// Get API base URL from environment with fallback
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
export const API_HOST = import.meta.env.VITE_API || 'http://localhost:8080';

console.log('API Configuration:', {
  VITE_API: import.meta.env.VITE_API,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  API_BASE_URL,
  API_HOST
});

/**
 * Make an API request with proper base URL
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export const apiRequest = async (endpoint, options = {}) => {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  console.log('API Request:', url);
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
};

/**
 * Make an API request to a specific service (bypasses /api prefix)
 * @param {string} fullPath - Full API path including /api
 * @param {RequestInit} options - Fetch options  
 * @returns {Promise<Response>}
 */
export const directApiRequest = async (fullPath, options = {}) => {
  const url = `${API_HOST}${fullPath}`;
  
  console.log('Direct API Request:', url);
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
};

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {RequestInit} options - Fetch options
 * @param {string} tokenType - Token type ('customer' or 'admin')
 * @returns {Promise<Response>}
 */
export const authenticatedApiRequest = async (endpoint, options = {}, tokenType = 'customer') => {
  const token = localStorage.getItem(`${tokenType}_access_token`) || localStorage.getItem(`${tokenType}Token`);
  
  return apiRequest(endpoint, {
    ...options,
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  });
};

export default {
  API_BASE_URL,
  API_HOST,
  apiRequest,
  directApiRequest,
  authenticatedApiRequest
};