import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('customer_access_token') || localStorage.getItem('customerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customerData');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Address Service
 * Handles all address-related API operations
 */
export class AddressService {
  
  /**
   * Get all addresses for the current customer
   * @param {Object} params - Query parameters
   * @param {string} [params.type] - Filter by 'shipping' or 'billing'
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=20] - Items per page
   * @param {string} [params.search] - Search term
   * @returns {Promise<Object>} Address list response
   */
  static async getAddresses(params = {}) {
    try {
      // Debug authentication
      const token = localStorage.getItem('customer_access_token') || localStorage.getItem('customerToken');
      console.log('AddressService.getAddresses - Token exists:', !!token);
      console.log('AddressService.getAddresses - Making request to /customer/addresses');
      
      const response = await api.get('/customer/addresses', { params });
      console.log('AddressService.getAddresses - Success:', response.status);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * Get a single address by ID
   * @param {string} id - Address ID
   * @returns {Promise<Object>} Address response
   */
  static async getAddress(id) {
    try {
      const response = await api.get(`/customer/addresses/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch address ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new address
   * @param {Object} addressData - Address data
   * @returns {Promise<Object>} Created address response
   */
  static async createAddress(addressData) {
    try {
      const response = await api.post('/customer/addresses', addressData);
      return response.data;
    } catch (error) {
      console.error('Failed to create address:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing address
   * @param {string} id - Address ID
   * @param {Object} addressData - Updated address data
   * @returns {Promise<Object>} Updated address response
   */
  static async updateAddress(id, addressData) {
    try {
      const response = await api.put(`/customer/addresses/${id}`, addressData);
      return response.data;
    } catch (error) {
      console.error(`Failed to update address ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete an address (soft delete)
   * @param {string} id - Address ID
   * @returns {Promise<Object>} Delete response
   */
  static async deleteAddress(id) {
    try {
      const response = await api.delete(`/customer/addresses/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete address ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Set an address as default
   * @param {string} id - Address ID
   * @returns {Promise<Object>} Updated address response
   */
  static async setDefaultAddress(id) {
    try {
      const response = await api.patch(`/customer/addresses/${id}/set-default`);
      return response.data;
    } catch (error) {
      console.error(`Failed to set default address ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Validate an address
   * @param {Object} params - Validation parameters
   * @param {string} params.postcode - Postcode
   * @param {string} params.city - City
   * @param {string} params.state - State
   * @param {string} params.country - Country code
   * @returns {Promise<Object>} Validation response
   */
  static async validateAddress(params) {
    try {
      const response = await api.get('/customer/addresses/validate', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to validate address:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors and convert them to user-friendly messages
   * @param {Error} error - Axios error
   * @returns {Error} Formatted error
   */
  static handleError(error) {
    if (!error.response) {
      // Network error
      return new Error('Network error. Please check your connection and try again.');
    }

    const { status, data } = error.response;
    const errorMessage = data?.error || 'An unexpected error occurred';
    const errorCode = data?.code || 'UNKNOWN_ERROR';

    switch (status) {
      case 400:
        if (errorCode === 'VALIDATION_ERROR') {
          return new Error(data.details ? data.details.join(', ') : errorMessage);
        }
        return new Error(errorMessage);
      
      case 401:
        return new Error('Authentication required. Please log in again.');
      
      case 403:
        return new Error('You do not have permission to perform this action.');
      
      case 404:
        return new Error('Address not found.');
      
      case 409:
        return new Error('This address conflicts with an existing address.');
      
      case 429:
        return new Error('Too many requests. Please wait a moment and try again.');
      
      case 500:
        return new Error('Server error. Please try again later.');
      
      default:
        return new Error(errorMessage);
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  static isAuthenticated() {
    return !!(localStorage.getItem('customer_access_token') || localStorage.getItem('customerToken'));
  }

  /**
   * Get stored customer data
   * @returns {Object|null} Customer data or null
   */
  static getCustomerData() {
    try {
      const data = localStorage.getItem('customerData');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to parse customer data:', error);
      return null;
    }
  }

  /**
   * Clear authentication data
   */
  static clearAuth() {
    localStorage.removeItem('customer_access_token');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerData');
  }
}

/**
 * Auth Service for handling authentication
 */
export class AuthService {
  
  /**
   * Customer login
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - Customer email
   * @param {string} credentials.password - Customer password
   * @returns {Promise<Object>} Login response
   */
  static async login(credentials) {
    try {
      const response = await api.post('/auth/customer/login', credentials);
      
      if (response.data.success && response.data.token) {
        // Store auth data
        localStorage.setItem('customer_access_token', response.data.token);
        if (response.data.customer) {
          localStorage.setItem('customerData', JSON.stringify(response.data.customer));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      
      // Handle specific login errors
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      // Handle network/service errors
      if (!error.response) {
        throw new Error('Login service temporarily unavailable. Please try again later.');
      }
      
      throw new Error('Login failed. Please check your credentials and try again.');
    }
  }

  /**
   * Customer logout
   * @returns {Promise<void>}
   */
  static async logout() {
    try {
      // Clear local storage first
      AddressService.clearAuth();
      
      // Attempt to notify server (optional, don't wait for response)
      api.post('/auth/logout').catch(() => {
        // Ignore logout errors - user is logged out locally
      });
      
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local auth even if server call fails
      AddressService.clearAuth();
    }
  }

  /**
   * Register new customer
   * @param {Object} userData - Registration data
   * @returns {Promise<Object>} Registration response
   */
  static async register(userData) {
    try {
      const response = await api.post('/auth/customer/register', userData);
      
      if (response.data.success && response.data.token) {
        // Auto-login after successful registration
        localStorage.setItem('customer_access_token', response.data.token);
        if (response.data.customer) {
          localStorage.setItem('customerData', JSON.stringify(response.data.customer));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw AddressService.handleError(error);
    }
  }

  /**
   * Verify authentication token
   * @returns {Promise<boolean>} Token validity
   */
  static async verifyToken() {
    try {
      const response = await api.get('/auth/verify');
      return response.data.success;
    } catch (error) {
      // Token is invalid
      AddressService.clearAuth();
      return false;
    }
  }
}

export default AddressService;