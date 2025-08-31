/**
 * API Migration Testing Utilities
 * Tools for testing v2 API endpoints and validating migration
 */

import { apiService } from '../services/apiV2.js';
import { ENDPOINT_MAPPING } from '../config/apiMapping.js';

// ===========================
// ENDPOINT TESTING UTILITIES
// ===========================

/**
 * Test individual API endpoint
 */
export const testEndpoint = async (category, operation, testData = {}) => {
  const mapping = ENDPOINT_MAPPING[category]?.[operation];
  
  if (!mapping) {
    return {
      success: false,
      error: `No mapping found for ${category}.${operation}`
    };
  }
  
  if (mapping.status === 'MISSING' || mapping.status === 'NEEDS_IMPLEMENTATION') {
    return {
      success: false,
      error: `v2 endpoint not implemented for ${category}.${operation}`,
      status: mapping.status,
      notes: mapping.notes
    };
  }
  
  try {
    let result;
    
    // Route to appropriate API service based on category and operation
    switch (category) {
      case 'shipments':
        result = await testShipmentsEndpoint(operation, testData);
        break;
      case 'compliance':
        result = await testComplianceEndpoint(operation, testData);
        break;
      default:
        throw new Error(`Unknown category: ${category}`);
    }
    
    return {
      success: true,
      data: result,
      endpoint: mapping.v2,
      notes: mapping.notes
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      endpoint: mapping.v2,
      notes: mapping.notes
    };
  }
};

/**
 * Test shipments API endpoints
 */
const testShipmentsEndpoint = async (operation, testData) => {
  const { shipments } = apiService;
  
  switch (operation) {
    case 'list':
      return await shipments.list(testData.params || {});
    
    case 'getById':
      if (!testData.id) throw new Error('ID required for getById test');
      return await shipments.getById(testData.id);
    
    case 'getComplete':
      if (!testData.id) throw new Error('ID required for getComplete test');
      return await shipments.getComplete(testData.id);
    
    case 'createBasics':
    case 'create':
      return await shipments.create(testData.shipment || getTestShipmentData());
    
    case 'search':
      return await shipments.search(testData.searchCriteria || { query: 'test' });
    
    case 'update':
      if (!testData.id) throw new Error('ID required for update test');
      return await shipments.update(testData.id, testData.shipment || {});
    
    case 'updateStatus':
      if (!testData.id) throw new Error('ID required for updateStatus test');
      return await shipments.updateStatus(testData.id, testData.status || 'active');
    
    case 'getActive':
      return await shipments.getActive(testData.params || {});
    
    case 'getStatistics':
      return await shipments.getStatistics(testData.params || {});
    
    case 'bulkUpdateStatus':
      return await shipments.bulkUpdateStatus(
        testData.shipmentIds || ['test-id'],
        testData.status || 'active'
      );
    
    case 'delete':
      if (!testData.id) throw new Error('ID required for delete test');
      return await shipments.delete(testData.id);
    
    default:
      throw new Error(`Unknown shipments operation: ${operation}`);
  }
};

/**
 * Test compliance API endpoints
 */
const testComplianceEndpoint = async (operation, testData) => {
  const { compliance } = apiService;
  
  switch (operation) {
    case 'staScreening':
      return await compliance.performStaScreening(
        testData.screeningData || getTestScreeningData()
      );
    
    case 'aiChip':
      return await compliance.processAiChip(
        testData.aiChipData || getTestAiChipData()
      );
    
    case 'screening':
      return await compliance.performScreening(
        testData.screeningData || getTestScreeningData()
      );
    
    case 'documentsProcessing':
      return await compliance.processDocuments(
        testData.documentsData || getTestDocumentsData()
      );
    
    case 'getData':
      if (!testData.shipmentId) throw new Error('Shipment ID required for getData test');
      return await compliance.getComplianceData(testData.shipmentId);
    
    case 'getStatistics':
      return await compliance.getStatistics(testData.params || {});
    
    default:
      throw new Error(`Unknown compliance operation: ${operation}`);
  }
};

// ===========================
// TEST DATA GENERATORS
// ===========================

/**
 * Generate test shipment data
 */
const getTestShipmentData = () => ({
  shipmentId: `test-${Date.now()}`,
  exportDate: '2024-03-15',
  mode: 'air',
  destination: 'China',
  endUser: 'Test Company Ltd.',
  currency: 'USD',
  incoterms: 'FOB',
  insuranceRequired: true,
  consigneeRegistration: 'TEST123456789',
  shipmentPriority: 'Standard',
  productItems: [{
    id: `item-${Date.now()}`,
    semiconductorCategory: 'standard_ic_asics',
    technologyOrigin: 'malaysia',
    hsCode: '8542310000',
    quantity: '100',
    unit: 'PCS',
    unitPrice: '1.50',
    endUsePurpose: 'Consumer electronics',
    productDescription: 'Test semiconductor',
    commercialValue: '150.00',
    isStrategic: false,
    isAIChip: false
  }]
});

/**
 * Generate test screening data
 */
const getTestScreeningData = () => ({
  shipmentId: `test-${Date.now()}`,
  endUser: 'Test Company Ltd.',
  products: [{
    description: 'Test semiconductor',
    hsCode: '8542310000',
    category: 'standard_ic_asics'
  }]
});

/**
 * Generate test AI chip data
 */
const getTestAiChipData = () => ({
  shipmentId: `test-${Date.now()}`,
  products: [{
    description: 'AI accelerator chip',
    category: 'ai_accelerators',
    isAIChip: true
  }]
});

/**
 * Generate test documents data
 */
const getTestDocumentsData = () => ({
  shipmentId: `test-${Date.now()}`,
  documentType: 'invoice',
  files: []
});

// ===========================
// COMPREHENSIVE TEST SUITES
// ===========================

/**
 * Test all ready v2 endpoints
 */
export const testAllReadyEndpoints = async () => {
  const results = [];
  
  // Test ready shipments endpoints
  const readyShipmentsTests = [
    { category: 'shipments', operation: 'list' },
    { category: 'shipments', operation: 'getActive' },
    { category: 'shipments', operation: 'search' },
    { category: 'shipments', operation: 'getStatistics' }
  ];
  
  for (const test of readyShipmentsTests) {
    const result = await testEndpoint(test.category, test.operation, {
      params: { page: 1, limit: 10 },
      searchCriteria: { query: 'test' }
    });
    results.push({ ...test, result });
  }
  
  // Test ready compliance endpoints
  const readyComplianceTests = [
    { category: 'compliance', operation: 'getStatistics' }
  ];
  
  for (const test of readyComplianceTests) {
    const result = await testEndpoint(test.category, test.operation, {
      params: { timeframe: '30days' }
    });
    results.push({ ...test, result });
  }
  
  return results;
};

/**
 * Test endpoints that need specific data
 */
export const testEndpointsWithData = async (testData) => {
  const results = [];
  
  const dataRequiredTests = [
    { category: 'shipments', operation: 'getById', data: { id: testData.shipmentId } },
    { category: 'shipments', operation: 'getComplete', data: { id: testData.shipmentId } },
    { category: 'compliance', operation: 'getData', data: { shipmentId: testData.shipmentId } }
  ];
  
  for (const test of dataRequiredTests) {
    const result = await testEndpoint(test.category, test.operation, test.data);
    results.push({ ...test, result });
  }
  
  return results;
};

/**
 * Generate migration readiness report
 */
export const generateMigrationReport = async () => {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      ready: 0,
      missing: 0,
      enhanced: 0,
      newFeature: 0,
      total: 0
    },
    endpoints: [],
    recommendations: []
  };
  
  // Analyze all mapped endpoints
  Object.keys(ENDPOINT_MAPPING).forEach(category => {
    if (category === 'missing') return; // Skip the missing section
    
    Object.keys(ENDPOINT_MAPPING[category]).forEach(operation => {
      const mapping = ENDPOINT_MAPPING[category][operation];
      
      report.endpoints.push({
        category,
        operation,
        v1Endpoint: mapping.v1,
        v2Endpoint: mapping.v2,
        status: mapping.status,
        notes: mapping.notes
      });
      
      // Update summary counts
      switch (mapping.status) {
        case 'READY':
          report.summary.ready++;
          break;
        case 'MISSING':
        case 'NEEDS_IMPLEMENTATION':
          report.summary.missing++;
          break;
        case 'ENHANCED':
        case 'CONSOLIDATED':
          report.summary.enhanced++;
          break;
        case 'NEW_FEATURE':
          report.summary.newFeature++;
          break;
      }
      
      report.summary.total++;
    });
  });
  
  // Add recommendations based on analysis
  if (report.summary.ready > 0) {
    report.recommendations.push(
      `${report.summary.ready} endpoints are ready for immediate migration`
    );
  }
  
  if (report.summary.missing > 0) {
    report.recommendations.push(
      `${report.summary.missing} endpoints need backend v2 implementation before migration`
    );
  }
  
  if (report.summary.enhanced > 0) {
    report.recommendations.push(
      `${report.summary.enhanced} endpoints have enhanced v2 features - review payload structures`
    );
  }
  
  return report;
};

/**
 * Test API service health and connectivity
 */
export const testAPIHealth = async () => {
  try {
    const healthResult = await apiService.utils.healthCheck();
    
    return {
      success: true,
      data: healthResult,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

export default {
  testEndpoint,
  testAllReadyEndpoints,
  testEndpointsWithData,
  generateMigrationReport,
  testAPIHealth
};