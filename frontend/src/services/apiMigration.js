/**
 * API Migration Service
 * Provides v2 API calls while maintaining backward compatibility with v1
 */

// Import v2 API utilities
import { getJSON, postJSON } from './api.js';

// ===========================
// MIGRATION CONFIGURATION
// ===========================

const MIGRATION_CONFIG = {
  // Set to true to use v2 API, false to use v1 API
  USE_V2_API: true,
  
  // Endpoints that are ready for v2 migration
  V2_READY_ENDPOINTS: [
    'shipments.list',
    'shipments.getById',
    'shipments.createBasics',
    'shipments.getComplete',
    'shipments.search',
    'shipments.update',
    'shipments.updateStatus',
    'shipments.getActive',
    'shipments.getStatistics',
    'shipments.bulkUpdateStatus',
    'shipments.delete'
    // Note: compliance, uploads and strategic endpoints are temporarily disabled due to v2 API issues
  ],
  
  // Endpoints that still need v1 fallback
  V1_FALLBACK_ENDPOINTS: [
    'documents.upload',
    'documents.uploadSupporting',
    'compliance.staScreening',
    'compliance.aiChip',
    'compliance.screening',
    'compliance.docs',
    'compliance.getByShipmentId',
    'compliance.getStatistics',
    'uploads.upload',
    'uploads.list',
    'uploads.getByShipmentId',
    'uploads.getStatistics',
    'uploads.download',
    'strategic.detect',
    'strategic.getShipmentStatus',
    'strategic.validateExport',
    'strategic.getReviewItems',
    'strategic.uploadPermits',
    'invoiceDetection.upload',
    'policy.answer',
    'policy.processFiles',
    'batchProcessing.initialize',
    'batchProcessing.upload',
    'comprehensiveScreening.initialize',
    'comprehensiveScreening.save',
    'comprehensiveScreening.screenLists',
    'comprehensiveScreening.uploadDocument',
    'permitDocuments.list',
    'permitDocuments.upload',
    'documentGeneration.generate',
    'documentGeneration.download',
    'formK2.render'
  ]
};

// ===========================
// MIGRATION UTILITIES
// ===========================

/**
 * Check if an endpoint is ready for v2 migration
 */
function isV2Ready(category, operation) {
  const endpointKey = `${category}.${operation}`;
  return MIGRATION_CONFIG.V2_READY_ENDPOINTS.includes(endpointKey);
}

/**
 * Check if we should use v2 API
 */
function shouldUseV2(category, operation) {
  return MIGRATION_CONFIG.USE_V2_API && isV2Ready(category, operation);
}

/**
 * Log migration status
 */
function logMigration(category, operation, version) {
  console.log(`[API Migration] ${category}.${operation} → ${version}`);
}

// ===========================
// MIGRATED API FUNCTIONS
// ===========================

/**
 * Shipments API - Migrated to v2
 */
export const shipmentsAPI = {
  // List shipments
  async list(params = {}) {
    if (shouldUseV2('shipments', 'list')) {
      logMigration('shipments', 'list', 'v2');
      return getJSON(`/api/v2/shipments?${new URLSearchParams(params)}`);
    } else {
      logMigration('shipments', 'list', 'v1');
      return getJSON(`/api/shipments?${new URLSearchParams(params)}`);
    }
  },

  // Get shipment by ID
  async getById(id) {
    if (shouldUseV2('shipments', 'getById')) {
      logMigration('shipments', 'getById', 'v2');
      return getJSON(`/api/v2/shipments/${id}`);
    } else {
      logMigration('shipments', 'getById', 'v1');
      return getJSON(`/api/shipments/${id}`);
    }
  },

  // Create shipment basics
  async createBasics(data) {
    if (shouldUseV2('shipments', 'createBasics')) {
      logMigration('shipments', 'createBasics', 'v2');
      return postJSON('/api/v2/shipments', data);
    } else {
      logMigration('shipments', 'createBasics', 'v1');
      return postJSON('/api/shipments/basics', data);
    }
  },

  // Get complete shipment data
  async getComplete(id) {
    if (shouldUseV2('shipments', 'getComplete')) {
      logMigration('shipments', 'getComplete', 'v2');
      return getJSON(`/api/v2/shipments/${id}/complete`);
    } else {
      logMigration('shipments', 'getComplete', 'v1');
      // Fallback to basic getById for v1
      return getJSON(`/api/shipments/${id}`);
    }
  },

  // Search shipments
  async search(criteria) {
    if (shouldUseV2('shipments', 'search')) {
      logMigration('shipments', 'search', 'v2');
      return getJSON(`/api/v2/shipments/search?${new URLSearchParams(criteria)}`);
    } else {
      logMigration('shipments', 'search', 'v1');
      // Convert search criteria to query params for v1
      const params = new URLSearchParams();
      if (criteria.query) params.append('search', criteria.query);
      if (criteria.status) params.append('status', criteria.status);
      if (criteria.limit) params.append('limit', criteria.limit);
      return getJSON(`/api/shipments?${params}`);
    }
  },

  // Update shipment
  async update(id, data) {
    if (shouldUseV2('shipments', 'update')) {
      logMigration('shipments', 'update', 'v2');
      return postJSON(`/api/v2/shipments/${id}`, data);
    } else {
      logMigration('shipments', 'update', 'v1');
      // v1 doesn't support full updates, fallback to basics
      return postJSON('/api/shipments/basics', { shipment_id: id, ...data });
    }
  },

  // Update status
  async updateStatus(id, status) {
    if (shouldUseV2('shipments', 'updateStatus')) {
      logMigration('shipments', 'updateStatus', 'v2');
      return postJSON(`/api/v2/shipments/${id}/status`, { status });
    } else {
      logMigration('shipments', 'updateStatus', 'v1');
      // v1 doesn't support status updates
      throw new Error('Status updates not supported in v1 API');
    }
  },

  // Get active shipments
  async getActive(params = {}) {
    if (shouldUseV2('shipments', 'getActive')) {
      logMigration('shipments', 'getActive', 'v2');
      return getJSON(`/api/v2/shipments/active?${new URLSearchParams(params)}`);
    } else {
      logMigration('shipments', 'getActive', 'v1');
      return getJSON(`/api/shipments?status=active&${new URLSearchParams(params)}`);
    }
  },

  // Get statistics
  async getStatistics(params = {}) {
    if (shouldUseV2('shipments', 'getStatistics')) {
      logMigration('shipments', 'getStatistics', 'v2');
      return getJSON(`/api/v2/shipments/statistics?${new URLSearchParams(params)}`);
    } else {
      logMigration('shipments', 'getStatistics', 'v1');
      // v1 doesn't support statistics
      throw new Error('Statistics not supported in v1 API');
    }
  },

  // Bulk update status
  async bulkUpdateStatus(shipmentIds, status) {
    if (shouldUseV2('shipments', 'bulkUpdateStatus')) {
      logMigration('shipments', 'bulkUpdateStatus', 'v2');
      return postJSON('/api/v2/shipments/bulk-status', { shipmentIds, status });
    } else {
      logMigration('shipments', 'bulkUpdateStatus', 'v1');
      // v1 doesn't support bulk operations
      throw new Error('Bulk operations not supported in v1 API');
    }
  },

  // Delete shipment
  async delete(id) {
    if (shouldUseV2('shipments', 'delete')) {
      logMigration('shipments', 'delete', 'v2');
      return postJSON(`/api/v2/shipments/${id}`, {}, { method: 'DELETE' });
    } else {
      logMigration('shipments', 'delete', 'v1');
      // v1 doesn't support deletion
      throw new Error('Shipment deletion not supported in v1 API');
    }
  }
};

/**
 * Compliance API - Migrated to v2
 */
export const complianceAPI = {
  // STA Screening
  async staScreening(data) {
    logMigration('compliance', 'staScreening', 'v1');
    return postJSON('/api/compliance/sta-screening', data);
  },

  // AI Chip
  async aiChip(data) {
    logMigration('compliance', 'aiChip', 'v1');
    return postJSON('/api/compliance/ai-chip', data);
  },

  // Screening
  async screening(data) {
    logMigration('compliance', 'screening', 'v1');
    return postJSON('/api/compliance/screening', data);
  },

  // Docs
  async docs(data) {
    logMigration('compliance', 'docs', 'v1');
    return postJSON('/api/compliance/docs', data);
  },

  // Get compliance by shipment ID
  async getByShipmentId(shipmentId) {
    logMigration('compliance', 'getByShipmentId', 'v1');
    // v1 doesn't support getting compliance by shipment ID
    throw new Error('Compliance retrieval not supported in v1 API');
  },

  // Get statistics
  async getStatistics(params = {}) {
    logMigration('compliance', 'getStatistics', 'v1');
    // v1 doesn't support statistics
    throw new Error('Compliance statistics not supported in v1 API');
  }
};

/**
 * Uploads API - Migrated to v2
 */
export const uploadsAPI = {
  // Upload files
  async upload({ shipment_id, tag, files }) {
    if (shouldUseV2('uploads', 'upload')) {
      logMigration('uploads', 'upload', 'v2');
      const form = new FormData();
      form.append('shipment_id', shipment_id);
      form.append('tag', tag || 'other');
      for (const f of files) form.append('files', f);
      return fetch('/api/v2/uploads', { method: 'POST', body: form }).then(r => r.json());
    } else {
      logMigration('uploads', 'upload', 'v1');
      const form = new FormData();
      form.append('shipment_id', shipment_id);
      form.append('tag', tag || 'other');
      for (const f of files) form.append('files', f);
      return fetch('/api/uploads', { method: 'POST', body: form }).then(r => r.json());
    }
  },

  // List files for shipment
  async list(shipmentId, params = {}) {
    if (shouldUseV2('uploads', 'list')) {
      logMigration('uploads', 'list', 'v2');
      const queryParams = new URLSearchParams({ ...params });
      return getJSON(`/api/v2/uploads/${shipmentId}?${queryParams}`);
    } else {
      logMigration('uploads', 'list', 'v1');
      return getJSON(`/api/uploads?shipment_id=${encodeURIComponent(shipmentId)}`);
    }
  },

  // Get files by shipment ID
  async getByShipmentId(shipmentId, params = {}) {
    if (shouldUseV2('uploads', 'getByShipmentId')) {
      logMigration('uploads', 'getByShipmentId', 'v2');
      const queryParams = new URLSearchParams({ ...params });
      return getJSON(`/api/v2/uploads/${shipmentId}?${queryParams}`);
    } else {
      logMigration('uploads', 'getByShipmentId', 'v1');
      return getJSON(`/api/uploads?shipment_id=${encodeURIComponent(shipmentId)}`);
    }
  },

  // Get upload statistics
  async getStatistics(shipmentId) {
    if (shouldUseV2('uploads', 'getStatistics')) {
      logMigration('uploads', 'getStatistics', 'v2');
      return getJSON(`/api/v2/uploads/${shipmentId}/stats`);
    } else {
      logMigration('uploads', 'getStatistics', 'v1');
      return getJSON(`/api/uploads?shipment_id=${encodeURIComponent(shipmentId)}`);
    }
  },

  // Download file
  async download(fileId, shipmentId) {
    if (shouldUseV2('uploads', 'download')) {
      logMigration('uploads', 'download', 'v2');
      return getJSON(`/api/v2/uploads/file/${fileId}/download?shipment_id=${encodeURIComponent(shipmentId)}`);
    } else {
      logMigration('uploads', 'download', 'v1');
      return getJSON(`/api/uploads/file/${fileId}/download?shipment_id=${encodeURIComponent(shipmentId)}`);
    }
  }
};

/**
 * Strategic Items API - Migrated to v2
 */
export const strategicAPI = {
  // Detect strategic items
  async detect(data) {
    if (shouldUseV2('strategic', 'detect')) {
      logMigration('strategic', 'detect', 'v2');
      return postJSON('/api/v2/strategic/detect', data);
    } else {
      logMigration('strategic', 'detect', 'v1');
      return postJSON('/api/strategic/detect', data);
    }
  },

  // Get shipment status
  async getShipmentStatus(shipmentId) {
    if (shouldUseV2('strategic', 'getShipmentStatus')) {
      logMigration('strategic', 'getShipmentStatus', 'v2');
      return getJSON(`/api/v2/strategic/shipment/${shipmentId}`);
    } else {
      logMigration('strategic', 'getShipmentStatus', 'v1');
      return getJSON(`/api/strategic/status/${shipmentId}`);
    }
  },

  // Validate export
  async validateExport(shipmentId) {
    if (shouldUseV2('strategic', 'validateExport')) {
      logMigration('strategic', 'validateExport', 'v2');
      return getJSON(`/api/v2/strategic/validation/${shipmentId}`);
    } else {
      logMigration('strategic', 'validateExport', 'v1');
      return getJSON(`/api/strategic/export/validation/${shipmentId}`);
    }
  },

  // Get review items
  async getReviewItems(params = {}) {
    if (shouldUseV2('strategic', 'getReviewItems')) {
      logMigration('strategic', 'getReviewItems', 'v2');
      const queryParams = new URLSearchParams(params);
      return getJSON(`/api/v2/strategic/review?${queryParams}`);
    } else {
      logMigration('strategic', 'getReviewItems', 'v1');
      return getJSON('/api/strategic/review');
    }
  },

  // Upload permits
  async uploadPermits(formData) {
    if (shouldUseV2('strategic', 'uploadPermits')) {
      logMigration('strategic', 'uploadPermits', 'v2');
      return fetch('/api/v2/strategic/permits/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());
    } else {
      logMigration('strategic', 'uploadPermits', 'v1');
      return fetch('/api/strategic/permits/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());
    }
  }
};

/**
 * Legacy API functions - Still using v1
 */
export const legacyAPI = {
  // Documents
  async uploadDocument(formData) {
    logMigration('documents', 'upload', 'v1');
    return fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  },

  async uploadSupportingDocument(formData) {
    logMigration('documents', 'uploadSupporting', 'v1');
    return fetch('/api/documents/upload-supporting', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  },

  // Strategic Items (using v1 API due to v2 issues)
  async detectStrategicItems(data) {
    logMigration('strategic', 'detect', 'v1');
    return postJSON('/api/strategic/detect', data);
  },

  async getStrategicStatus(shipmentId) {
    logMigration('strategic', 'status', 'v1');
    return getJSON(`/api/strategic/status/${shipmentId}`);
  },

  async getExportValidation(shipmentId) {
    logMigration('strategic', 'exportValidation', 'v1');
    return getJSON(`/api/strategic/export/validation/${shipmentId}`);
  },

  async uploadPermit(formData) {
    logMigration('strategic', 'permitsUpload', 'v1');
    return fetch('/api/strategic/permits/upload', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  },

  // Invoice Detection
  async uploadInvoice(formData) {
    logMigration('invoiceDetection', 'upload', 'v1');
    return fetch('/api/invoice-detection/upload', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  },

  // Policy
  async answerPolicy(query) {
    logMigration('policy', 'answer', 'v1');
    return getJSON(`/api/policy/answer?q=${encodeURIComponent(query)}`);
  },

  async processFiles(formData) {
    logMigration('policy', 'processFiles', 'v1');
    return fetch('/api/policy/process-files', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  },

  // Batch Processing
  async initializeBatch(data) {
    logMigration('batchProcessing', 'initialize', 'v1');
    return postJSON('/api/batch-processing/initialize', data);
  },

  async uploadBatch(formData) {
    logMigration('batchProcessing', 'upload', 'v1');
    return fetch('/api/batch-processing/upload', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  },

  // Comprehensive Screening
  async initializeScreening(data) {
    logMigration('comprehensiveScreening', 'initialize', 'v1');
    return postJSON('/api/comprehensive-screening/initialize', data);
  },

  async saveScreening(data) {
    logMigration('comprehensiveScreening', 'save', 'v1');
    return postJSON('/api/comprehensive-screening/save', data);
  },

  async getScreenLists() {
    logMigration('comprehensiveScreening', 'screenLists', 'v1');
    return getJSON('/api/comprehensive-screening/screen-lists');
  },

  async uploadScreeningDocument(formData) {
    logMigration('comprehensiveScreening', 'uploadDocument', 'v1');
    return fetch('/api/comprehensive-screening/upload-document', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  },

  async getScreeningStatus(shipmentId) {
    logMigration('comprehensiveScreening', 'getStatus', 'v1');
    return getJSON(`/api/comprehensive-screening/${shipmentId}`);
  },

  // Permit Documents
  async listPermitDocuments() {
    logMigration('permitDocuments', 'list', 'v1');
    return getJSON('/api/permit-documents');
  },

  async uploadPermitDocument(formData) {
    logMigration('permitDocuments', 'upload', 'v1');
    return fetch('/api/permit-documents/upload', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
  },

  // Document Generation
  async generateDocuments(shipmentId, data) {
    logMigration('documentGeneration', 'generate', 'v1');
    return postJSON('/api/document-generation/generate', { shipmentId, ...data });
  },

  async downloadDocument(shipmentId, docType) {
    logMigration('documentGeneration', 'download', 'v1');
    return getJSON(`/api/document-generation/download/${shipmentId}/${docType.downloadKey}`);
  },

  async getDocumentStatus(shipmentId) {
    logMigration('documentGeneration', 'getStatus', 'v1');
    return getJSON(`/api/document-generation/${shipmentId}`);
  },

  // Form K2
  async renderK2Form(data) {
    logMigration('formK2', 'render', 'v1');
    return postJSON('/api/k2/render', data);
  },

  // Uploads
  async listUploads(shipmentId) {
    logMigration('uploads', 'list', 'v1');
    return getJSON(`/api/uploads?shipment_id=${encodeURIComponent(shipmentId)}`);
  },

  async uploadFiles({ shipment_id, tag, files }) {
    logMigration('uploads', 'upload', 'v1');
    const form = new FormData();
    form.append('shipment_id', shipment_id);
    form.append('tag', tag || 'other');
    for (const f of files) form.append('files', f);
    return fetch('/api/uploads', { method: 'POST', body: form }).then(r => r.json());
  }
};

// ===========================
// MAIN API SERVICE
// ===========================

/**
 * Main API service that combines v2 and legacy APIs
 */
export const apiService = {
  // v2 Services (ready for use)
  shipments: shipmentsAPI,
  compliance: complianceAPI,
  uploads: uploadsAPI,
  strategic: strategicAPI,
  
  // Legacy services (temporary - will be migrated to v2)
  ...legacyAPI,
  
  // Migration utilities
  isV2Ready: (category, operation) => isV2Ready(category, operation),
  shouldUseV2: (category, operation) => shouldUseV2(category, operation),
  getMigrationConfig: () => ({ ...MIGRATION_CONFIG })
};

// ===========================
// BACKWARD COMPATIBILITY
// ===========================

// Export legacy functions for backward compatibility
export const postBasics = (data) => shipmentsAPI.createBasics(data);
export const uploadFiles = legacyAPI.uploadFiles;
export const listFiles = legacyAPI.listUploads;

// Export the main service as default
export default apiService;
