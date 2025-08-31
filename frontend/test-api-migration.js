#!/usr/bin/env node
/**
 * API Migration Test Script
 * Run this script to test v2 API endpoints and validate migration readiness
 * 
 * Usage: node test-api-migration.js
 */

// Simple test runner that doesn't require a full React environment
const API_CONFIG = {
  BASE_URL: process.env.VITE_API || 'http://localhost:8080',
  V2_PREFIX: '/api/v2'
};

/**
 * Simple fetch wrapper for testing
 */
const testFetch = async (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;
  
  console.log(`Testing: ${options.method || 'GET'} ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const result = {
      status: response.status,
      ok: response.ok,
      url: fullUrl
    };
    
    if (response.ok) {
      try {
        result.data = await response.json();
      } catch {
        result.data = await response.text();
      }
    } else {
      result.error = await response.text();
    }
    
    return result;
  } catch (error) {
    return {
      status: 0,
      ok: false,
      url: fullUrl,
      error: error.message
    };
  }
};

/**
 * Test v2 endpoints that should be ready
 */
const testReadyEndpoints = async () => {
  console.log('\n🧪 Testing Ready v2 Endpoints...');
  console.log('=' .repeat(50));
  
  const endpoints = [
    {
      name: 'Health Check',
      method: 'GET',
      url: '/health',
      expected: 'Should return system health status'
    },
    {
      name: 'List Shipments', 
      method: 'GET',
      url: '/api/v2/shipments',
      expected: 'Should return paginated shipments list'
    },
    {
      name: 'Get Active Shipments',
      method: 'GET', 
      url: '/api/v2/shipments/active',
      expected: 'Should return active shipments'
    },
    {
      name: 'Get Shipments Statistics',
      method: 'GET',
      url: '/api/v2/shipments/statistics', 
      expected: 'Should return shipment analytics'
    },
    {
      name: 'Get Compliance Statistics',
      method: 'GET',
      url: '/api/v2/compliance/statistics',
      expected: 'Should return compliance analytics'
    }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testFetch(endpoint.url, { method: endpoint.method });
    
    console.log(`\n📋 ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
    
    if (result.ok) {
      console.log(`   ✅ Success: ${endpoint.expected}`);
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    
    results.push({
      ...endpoint,
      ...result,
      success: result.ok
    });
  }
  
  return results;
};

/**
 * Test v2 endpoints that need specific data
 */
const testDataEndpoints = async () => {
  console.log('\n🧪 Testing Data-Specific v2 Endpoints...');
  console.log('=' .repeat(50));
  
  // First try to get a shipment ID from the list endpoint
  const listResult = await testFetch('/api/v2/shipments?limit=1');
  let testShipmentId = 'test-shipment-id';
  
  if (listResult.ok && listResult.data?.data && listResult.data.data.length > 0) {
    testShipmentId = listResult.data.data[0].id || listResult.data.data[0].shipment_id;
    console.log(`\n📦 Using existing shipment ID: ${testShipmentId}`);
  } else {
    console.log(`\n📦 Using test shipment ID: ${testShipmentId}`);
  }
  
  const endpoints = [
    {
      name: 'Get Shipment by ID',
      method: 'GET',
      url: `/api/v2/shipments/${testShipmentId}`,
      expected: 'Should return specific shipment details'
    },
    {
      name: 'Get Complete Shipment Data',
      method: 'GET',
      url: `/api/v2/shipments/${testShipmentId}/complete`,
      expected: 'Should return complete shipment view'
    },
    {
      name: 'Get Compliance Data',
      method: 'GET', 
      url: `/api/v2/compliance/${testShipmentId}`,
      expected: 'Should return compliance status'
    }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testFetch(endpoint.url, { method: endpoint.method });
    
    console.log(`\n📋 ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
    
    if (result.ok) {
      console.log(`   ✅ Success: ${endpoint.expected}`);
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    
    results.push({
      ...endpoint,
      ...result,
      success: result.ok
    });
  }
  
  return results;
};

/**
 * Test POST endpoints with sample data
 */
const testPostEndpoints = async () => {
  console.log('\n🧪 Testing v2 POST Endpoints...');
  console.log('=' .repeat(50));
  
  const sampleShipment = {
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
      semiconductorCategory: 'standard_ic_asics',
      technologyOrigin: 'malaysia',
      hsCode: '8542310000',
      quantity: '100',
      unit: 'PCS',
      unitPrice: '1.50',
      endUsePurpose: 'Consumer electronics',
      productDescription: 'Test semiconductor',
      commercialValue: '150.00'
    }]
  };
  
  const sampleSearch = {
    query: 'test',
    filters: {
      status: 'active',
      destination: 'China'
    }
  };
  
  const endpoints = [
    {
      name: 'Create Shipment',
      method: 'POST',
      url: '/api/v2/shipments',
      data: sampleShipment,
      expected: 'Should create new shipment'
    },
    {
      name: 'Search Shipments',
      method: 'POST',
      url: '/api/v2/shipments/search',
      data: sampleSearch,
      expected: 'Should return search results'
    }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testFetch(endpoint.url, {
      method: endpoint.method,
      body: JSON.stringify(endpoint.data),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`\n📋 ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
    
    if (result.ok) {
      console.log(`   ✅ Success: ${endpoint.expected}`);
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    
    results.push({
      ...endpoint,
      ...result,
      success: result.ok
    });
  }
  
  return results;
};

/**
 * Generate summary report
 */
const generateSummary = (allResults) => {
  const total = allResults.length;
  const successful = allResults.filter(r => r.success).length;
  const failed = total - successful;
  
  console.log('\n📊 MIGRATION TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Endpoints Tested: ${total}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Endpoints:');
    allResults.filter(r => !r.success).forEach(result => {
      console.log(`   • ${result.name}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 Migration Readiness:');
  if (successful === total) {
    console.log('   🟢 READY - All v2 endpoints are working!');
  } else if (successful > total * 0.7) {
    console.log('   🟡 PARTIALLY READY - Most endpoints working, some issues to resolve');
  } else {
    console.log('   🔴 NOT READY - Significant issues found, backend work needed');
  }
  
  return {
    total,
    successful,
    failed,
    successRate: (successful / total) * 100
  };
};

/**
 * Main test runner
 */
const main = async () => {
  console.log('🚀 API Migration Test Suite');
  console.log('Testing backend v2 endpoints for migration readiness\n');
  console.log(`Target API: ${API_CONFIG.BASE_URL}`);
  
  try {
    // Test different endpoint categories
    const readyResults = await testReadyEndpoints();
    const dataResults = await testDataEndpoints();
    const postResults = await testPostEndpoints();
    
    // Combine all results
    const allResults = [...readyResults, ...dataResults, ...postResults];
    
    // Generate summary
    const summary = generateSummary(allResults);
    
    console.log('\n📋 Next Steps:');
    if (summary.failed > 0) {
      console.log('   1. ⚠️  Fix failing backend v2 endpoints');
      console.log('   2. 🔄 Re-run tests until all pass');
      console.log('   3. 📦 Begin frontend component migration');
    } else {
      console.log('   1. ✅ Backend v2 endpoints are ready!');
      console.log('   2. 📦 Begin migrating frontend components');
      console.log('   3. 🧹 Remove legacy v1 endpoints after migration');
    }
    
    console.log('\n🏁 Test completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
};

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testReadyEndpoints,
  testDataEndpoints,
  testPostEndpoints,
  generateSummary
};