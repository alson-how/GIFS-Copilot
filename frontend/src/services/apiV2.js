/**
 * API Service Layer v2
 * Comprehensive service for all v2 API endpoints with consistent error handling,
 * request/response interceptors, and TypeScript-ready structure
 */

import { API_CONFIG, endpointUtils } from '../config/apiMapping.js';

// ===========================
// CORE API UTILITIES
// ===========================

/**
 * Base API client with interceptors and error handling
 */
class APIClient {
  constructor(baseURL = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
  }

  /**
   * Base request method with interceptors
   */
  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: this.timeout,
      ...options
    };

    // Request interceptor
    console.log(`[API] ${requestOptions.method} ${fullUrl}`);
    
    try {
      const response = await this.fetchWithTimeout(fullUrl, requestOptions);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      
      // Response interceptor
      const data = await response.json();
      console.log(`[API] Response:`, data);
      
      return data;
    } catch (error) {
      console.error(`[API] Error:`, error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Fetch with timeout support
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Handle error responses
   */
  async handleErrorResponse(response) {
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
    } catch {
      errorMessage = await response.text() || `HTTP ${response.status}`;
    }
    
    throw new APIError(errorMessage, response.status, response);
  }

  /**
   * Normalize different error types
   */
  normalizeError(error) {
    if (error instanceof APIError) {
      return error;
    }
    
    if (error.name === 'AbortError') {
      return new APIError('Request timeout', 408);
    }
    
    if (!navigator.onLine) {
      return new APIError('No internet connection', 0);
    }
    
    return new APIError(error.message || 'Network error', 0);
  }

  // HTTP Method Shortcuts
  get(url, options = {}) {
    return this.request(url, { method: 'GET', ...options });
  }

  post(url, data, options = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  put(url, data, options = {}) {
    return this.request(url, {
      method: 'PUT', 
      body: JSON.stringify(data),
      ...options
    });
  }

  patch(url, data, options = {}) {
    return this.request(url, {
      method: 'PATCH',
      body: JSON.stringify(data), 
      ...options
    });
  }

  delete(url, options = {}) {
    return this.request(url, { method: 'DELETE', ...options });
  }

  /**
   * Upload files with FormData
   */
  upload(url, formData, options = {}) {
    const uploadOptions = {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let browser set it with boundary
        ...(options.headers || {})
      },
      ...options
    };
    delete uploadOptions.headers['Content-Type'];
    
    return this.request(url, uploadOptions);
  }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, status = 0, response = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
  
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
  
  get isServerError() {
    return this.status >= 500;
  }
  
  get isNetworkError() {
    return this.status === 0;
  }
}

// Create API client instance
const apiClient = new APIClient();

// ===========================
// SHIPMENTS API SERVICE
// ===========================

export const shipmentsAPI = {
  /**
   * List shipments with pagination and filters
   */
  async list(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v2/shipments${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(url);
  },

  /**
   * Get single shipment by ID
   */
  async getById(id) {
    return apiClient.get(`/api/v2/shipments/${id}`);
  },

  /**
   * Get complete shipment data (new v2 feature)
   */
  async getComplete(id) {
    return apiClient.get(`/api/v2/shipments/${id}/complete`);
  },

  /**
   * Create new shipment
   */
  async create(data) {
    return apiClient.post('/api/v2/shipments', data);
  },

  /**
   * Search shipments (enhanced v2 feature)
   */
  async search(searchCriteria) {
    return apiClient.post('/api/v2/shipments/search', searchCriteria);
  },

  /**
   * Update existing shipment
   */
  async update(id, data) {
    return apiClient.put(`/api/v2/shipments/${id}`, data);
  },

  /**
   * Update shipment status only
   */
  async updateStatus(id, status) {
    return apiClient.patch(`/api/v2/shipments/${id}/status`, { status });
  },

  /**
   * Get active shipments
   */
  async getActive(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v2/shipments/active${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(url);
  },

  /**
   * Get shipment statistics
   */
  async getStatistics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v2/shipments/statistics${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(url);
  },

  /**
   * Bulk update shipment statuses
   */
  async bulkUpdateStatus(shipmentIds, status) {
    return apiClient.patch('/api/v2/shipments/bulk/status', {
      shipmentIds,
      status
    });
  },

  /**
   * Delete shipment
   */
  async delete(id) {
    return apiClient.delete(`/api/v2/shipments/${id}`);
  }
};

// ===========================
// COMPLIANCE API SERVICE 
// ===========================

export const complianceAPI = {
  /**
   * Perform STA screening
   */
  async performStaScreening(data) {
    return apiClient.post('/api/v2/compliance/sta-screening', data);
  },

  /**
   * Process AI chip control
   */
  async processAiChip(data) {
    return apiClient.post('/api/v2/compliance/ai-chip', data);
  },

  /**
   * Perform comprehensive screening
   */
  async performScreening(data) {
    return apiClient.post('/api/v2/compliance/screening', data);
  },

  /**
   * Process compliance documents
   */
  async processDocuments(data) {
    return apiClient.post('/api/v2/compliance/docs', data);
  },

  /**
   * Get compliance data for shipment
   */
  async getComplianceData(shipmentId) {
    return apiClient.get(`/api/v2/compliance/${shipmentId}`);
  },

  /**
   * Get compliance statistics
   */
  async getStatistics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v2/compliance/statistics${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(url);
  }
};

// ===========================
// LEGACY API WRAPPERS (FOR GRADUAL MIGRATION)
// ===========================

/**
 * Legacy API wrappers that will use v1 endpoints until v2 is implemented
 * These maintain the same interface but use the old endpoints temporarily
 */
export const legacyAPI = {
  /**
   * File upload (v1 wrapper - will be replaced when v2 is available)
   */
  async uploadFiles({ shipment_id, tag, files }) {
    const formData = new FormData();
    formData.append('shipment_id', shipment_id);
    formData.append('tag', tag || 'other');
    files.forEach(file => formData.append('files', file));
    
    return apiClient.upload('/api/uploads', formData);
  },

  /**
   * List files (v1 wrapper)
   */
  async listFiles(shipment_id) {
    return apiClient.get(`/api/uploads?shipment_id=${encodeURIComponent(shipment_id)}`);
  },

  /**
   * Strategic items detection (v1 wrapper)
   */
  async detectStrategicItems(data) {
    return apiClient.post('/api/strategic/detect', data);
  },

  /**
   * Document generation (v1 wrapper)
   */
  async generateDocuments(data) {
    return apiClient.post('/api/document-generation/generate', data);
  },

  /**
   * Get generated documents (v1 wrapper)
   */
  async getGeneratedDocuments(shipmentId) {
    return apiClient.get(`/api/document-generation/${shipmentId}`);
  },

  /**
   * Upload invoice for OCR (v1 wrapper)
   */
  async uploadInvoiceOCR(formData) {
    return apiClient.upload('/api/invoice-detection/upload', formData);
  },

  /**
   * Get invoice OCR results (v1 wrapper)
   */
  async getInvoiceOCR(id) {
    return apiClient.get(`/api/invoice-detection/${id}`);
  },

  /**
   * Process policy files (v1 wrapper)
   */
  async processPolicyFiles(formData) {
    return apiClient.upload('/api/policy/process-files', formData);
  },

  /**
   * Render K2 form (v1 wrapper)
   */
  async renderK2Form(data) {
    return apiClient.post('/api/k2/render', data);
  },

  /**
   * Initialize batch processing (v1 wrapper)
   */
  async initializeBatchProcessing(data) {
    return apiClient.post('/api/batch-processing/initialize', data);
  }
};

// ===========================
// UNIFIED API SERVICE
// ===========================

/**
 * Main API service that combines v2 and legacy APIs
 * This provides a single interface for the entire application
 */
export const apiService = {
  // v2 Services (ready for use)
  shipments: shipmentsAPI,
  compliance: complianceAPI,
  
  // Legacy services (temporary - will be migrated to v2)
  legacy: legacyAPI,
  
  // Utility methods
  utils: {
    /**
     * Check API health
     */
    async healthCheck() {
      return apiClient.get('/health');
    },
    
    /**
     * Get API configuration
     */
    getConfig() {
      return API_CONFIG;
    },
    
    /**
     * Check if endpoint is ready for v2 migration
     */
    isV2Ready(category, operation) {
      return endpointUtils.isReadyForMigration(category, operation);
    }
  }
};

// Export individual services for modular imports
export { APIError, APIClient };
export default apiService;

// ===========================
// BACKWARD COMPATIBILITY
// ===========================

/**
 * Backward compatibility exports for existing components
 * These can be gradually replaced as components are migrated
 */
export const postJSON = (path, body) => apiClient.post(path, body);
export const getJSON = (path) => apiClient.get(path);
export const postBasics = (data) => shipmentsAPI.create(data);
export const uploadFiles = legacyAPI.uploadFiles;
export const listFiles = legacyAPI.listFiles;