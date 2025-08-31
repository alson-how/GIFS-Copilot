/**
 * API Endpoint Mapping: v1 → v2
 * Comprehensive mapping for migrating from legacy API endpoints to v2 architecture
 */

// Base API configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API || 'http://localhost:8080',
  V1_PREFIX: '/api',
  V2_PREFIX: '/api/v2',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

// API endpoint mappings with migration status
export const ENDPOINT_MAPPING = {
  // ===== SHIPMENTS API =====
  shipments: {
    // List shipments with pagination and filters
    list: {
      v1: 'GET /api/shipments',
      v2: 'GET /api/v2/shipments',
      status: 'READY', // v2 endpoint exists
      notes: 'Direct mapping available'
    },
    
    // Get single shipment by ID
    getById: {
      v1: 'GET /api/shipments/{id}',
      v2: 'GET /api/v2/shipments/{id}',
      status: 'READY',
      notes: 'Direct mapping available'
    },
    
    // Create/update shipment basics
    createBasics: {
      v1: 'POST /api/shipments/basics',
      v2: 'POST /api/v2/shipments',
      status: 'READY',
      notes: 'Payload structure may need adjustment'
    },
    
    // Get complete shipment data
    getComplete: {
      v1: 'GET /api/shipments/{id}/complete', // doesn't exist in v1
      v2: 'GET /api/v2/shipments/{id}/complete',
      status: 'NEW_FEATURE',
      notes: 'New v2 feature - provides complete shipment view'
    },
    
    // Search shipments
    search: {
      v1: 'GET /api/shipments?search=...', // handled via query params
      v2: 'POST /api/v2/shipments/search',
      status: 'ENHANCED',
      notes: 'v2 provides advanced search via POST body'
    },
    
    // Update shipment
    update: {
      v1: 'PUT /api/shipments/{id}', // doesn't exist in v1
      v2: 'PUT /api/v2/shipments/{id}',
      status: 'NEW_FEATURE',
      notes: 'New v2 feature - full shipment updates'
    },
    
    // Update status only
    updateStatus: {
      v1: 'PATCH /api/shipments/{id}/status', // doesn't exist in v1
      v2: 'PATCH /api/v2/shipments/{id}/status',
      status: 'NEW_FEATURE',
      notes: 'New v2 feature - status-only updates'
    },
    
    // Get active shipments
    getActive: {
      v1: 'GET /api/shipments?status=active', // handled via query params
      v2: 'GET /api/v2/shipments/active',
      status: 'ENHANCED',
      notes: 'v2 provides dedicated endpoint for active shipments'
    },
    
    // Get shipment statistics
    getStatistics: {
      v1: 'GET /api/shipments/stats', // doesn't exist in v1
      v2: 'GET /api/v2/shipments/statistics',
      status: 'NEW_FEATURE',
      notes: 'New v2 feature - shipment analytics'
    },
    
    // Bulk operations
    bulkUpdateStatus: {
      v1: null, // doesn't exist in v1
      v2: 'PATCH /api/v2/shipments/bulk/status',
      status: 'NEW_FEATURE',
      notes: 'New v2 feature - bulk status updates'
    },
    
    // Delete shipment
    delete: {
      v1: 'DELETE /api/shipments/{id}', // doesn't exist in v1
      v2: 'DELETE /api/v2/shipments/{id}',
      status: 'NEW_FEATURE',
      notes: 'New v2 feature - shipment deletion'
    }
  },
  
  // ===== COMPLIANCE API =====
  compliance: {
    // STA Screening
    staScreening: {
      v1: 'GET /api/comprehensive-screening/{shipmentId}',
      v2: 'POST /api/v2/compliance/sta-screening',
      status: 'NEEDS_MIGRATION',
      notes: 'Changed from GET to POST, different payload structure'
    },
    
    // AI Chip Processing
    aiChip: {
      v1: 'POST /api/strategic/detect', // partial match
      v2: 'POST /api/v2/compliance/ai-chip',
      status: 'ENHANCED',
      notes: 'v2 provides dedicated AI chip processing'
    },
    
    // End User Screening
    screening: {
      v1: [
        'POST /api/comprehensive-screening/initialize',
        'POST /api/comprehensive-screening/screen-lists',
        'POST /api/comprehensive-screening/save'
      ],
      v2: 'POST /api/v2/compliance/screening',
      status: 'CONSOLIDATED',
      notes: 'v2 consolidates multiple v1 endpoints into one'
    },
    
    // Documents Processing
    documentsProcessing: {
      v1: [
        'POST /api/documents/upload',
        'POST /api/documents/upload-supporting'
      ],
      v2: 'POST /api/v2/compliance/docs',
      status: 'CONSOLIDATED',
      notes: 'v2 consolidates document processing'
    },
    
    // Get compliance data
    getData: {
      v1: 'GET /api/strategic/status/{shipmentId}',
      v2: 'GET /api/v2/compliance/{shipmentId}',
      status: 'READY',
      notes: 'Direct mapping with enhanced data structure'
    },
    
    // Get compliance statistics
    getStatistics: {
      v1: null, // doesn't exist in v1
      v2: 'GET /api/v2/compliance/statistics',
      status: 'NEW_FEATURE',
      notes: 'New v2 feature - compliance analytics'
    }
  },
  
  // ===== MISSING v2 ENDPOINTS (NEED BACKEND IMPLEMENTATION) =====
  missing: {
    // File Upload System
    uploads: {
      v1: [
        'POST /api/uploads',
        'GET /api/uploads?shipment_id={id}',
        'POST /api/uploads/permit/{shipmentId}/{permitType}',
        'POST /api/uploads/insurance/{shipmentId}'
      ],
      v2: 'NEEDS_IMPLEMENTATION',
      status: 'MISSING',
      notes: 'File upload system needs v2 implementation'
    },
    
    // Document Generation
    documentGeneration: {
      v1: [
        'GET /api/document-generation/{shipmentId}',
        'POST /api/document-generation/generate'
      ],
      v2: 'NEEDS_IMPLEMENTATION',
      status: 'MISSING',
      notes: 'Document generation needs v2 implementation'
    },
    
    // Invoice Detection/OCR
    invoiceDetection: {
      v1: [
        'GET /api/invoice-detection/{id}',
        'POST /api/invoice-detection/upload'
      ],
      v2: 'NEEDS_IMPLEMENTATION',
      status: 'MISSING',
      notes: 'OCR/Invoice processing needs v2 implementation'
    },
    
    // Strategic Items Advanced
    strategicAdvanced: {
      v1: [
        'GET /api/strategic/export/validation/{shipmentId}',
        'POST /api/strategic/permits/upload'
      ],
      v2: 'NEEDS_IMPLEMENTATION',
      status: 'MISSING',
      notes: 'Advanced strategic items features need v2 implementation'
    },
    
    // Policy Processing
    policy: {
      v1: 'POST /api/policy/process-files',
      v2: 'NEEDS_IMPLEMENTATION',
      status: 'MISSING',
      notes: 'Policy processing needs v2 implementation'
    },
    
    // Form K2
    formK2: {
      v1: 'POST /api/k2/render',
      v2: 'NEEDS_IMPLEMENTATION',
      status: 'MISSING',
      notes: 'K2 form rendering needs v2 implementation'
    },
    
    // Permit Documents
    permitDocuments: {
      v1: [
        'GET /api/permit-documents',
        'POST /api/permit-documents/upload'
      ],
      v2: 'NEEDS_IMPLEMENTATION',
      status: 'MISSING',
      notes: 'Permit document management needs v2 implementation'
    },
    
    // Batch Processing
    batchProcessing: {
      v1: 'POST /api/batch-processing/initialize',
      v2: 'NEEDS_IMPLEMENTATION',
      status: 'MISSING',
      notes: 'Batch processing needs v2 implementation'
    }
  }
};

// Migration priority levels
export const MIGRATION_PRIORITIES = {
  HIGH: [
    'shipments.list',
    'shipments.getById', 
    'shipments.createBasics',
    'compliance.getData'
  ],
  MEDIUM: [
    'compliance.staScreening',
    'compliance.screening',
    'shipments.search',
    'shipments.getActive'
  ],
  LOW: [
    'shipments.getStatistics',
    'compliance.getStatistics',
    'shipments.bulkUpdateStatus'
  ]
};

// Utility functions for endpoint mapping
export const endpointUtils = {
  /**
   * Get v2 endpoint for a v1 endpoint key
   */
  getV2Endpoint: (category, operation) => {
    const mapping = ENDPOINT_MAPPING[category]?.[operation];
    if (!mapping) return null;
    
    if (mapping.status === 'MISSING' || mapping.status === 'NEEDS_IMPLEMENTATION') {
      console.warn(`v2 endpoint not available for ${category}.${operation}`);
      return null;
    }
    
    return mapping.v2;
  },
  
  /**
   * Check if v2 endpoint is ready for migration
   */
  isReadyForMigration: (category, operation) => {
    const mapping = ENDPOINT_MAPPING[category]?.[operation];
    return mapping && ['READY', 'ENHANCED', 'NEW_FEATURE'].includes(mapping.status);
  },
  
  /**
   * Get migration status for an endpoint
   */
  getMigrationStatus: (category, operation) => {
    const mapping = ENDPOINT_MAPPING[category]?.[operation];
    return mapping ? mapping.status : 'UNKNOWN';
  },
  
  /**
   * Build full URL for v2 endpoint
   */
  buildV2Url: (endpoint, params = {}) => {
    let url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    // Replace path parameters
    Object.keys(params).forEach(key => {
      url = url.replace(`{${key}}`, params[key]);
    });
    
    return url;
  }
};

export default ENDPOINT_MAPPING;