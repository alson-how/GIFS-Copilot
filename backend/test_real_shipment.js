/**
 * Test the API endpoint with a real shipment that has strategic items
 */

import fetch from 'node-fetch';

async function testStrategicAPI() {
    // Use one of the recent shipments that has strategic items
    const testShipmentId = '010b50bf-1b3a-434c-8eff-60b4401961a3'; // Has 1/1 strategic item
    
    console.log('🧪 Testing Strategic Items API');
    console.log('==============================\n');
    console.log(`Testing shipment: ${testShipmentId}`);
    
    try {
        // Test the status endpoint
        const statusUrl = `http://localhost:8080/api/strategic/status/${testShipmentId}`;
        console.log(`🔍 Calling: ${statusUrl}`);
        
        const response = await fetch(statusUrl);
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ API Error:', data);
            return;
        }
        
        console.log('\n📊 API RESPONSE:');
        console.log('================');
        console.log(JSON.stringify(data, null, 2));
        
        // Analyze the results
        console.log('\n🔍 ANALYSIS:');
        console.log('============');
        
        const strategic_status = data.data.strategic_status;
        console.log(`Total Items: ${strategic_status.total_items}`);
        console.log(`Strategic Items: ${strategic_status.strategic_items}`);
        console.log(`Has Strategic Items: ${strategic_status.has_strategic_items}`);
        console.log(`Export Blocked: ${strategic_status.export_blocked}`);
        console.log(`Required Permits: ${strategic_status.required_permits.join(', ') || 'None'}`);
        
        const permit_status = data.data.permit_status;
        console.log(`Compliance Status: ${permit_status.compliance_status}`);
        
        const detection_results = data.data.detection_results;
        console.log(`Detection Results Count: ${detection_results.length}`);
        
        if (detection_results.length > 0) {
            console.log('\nDetection Details:');
            detection_results.forEach((result, index) => {
                console.log(`${index + 1}. ${result.item_description}`);
                console.log(`   Strategic: ${result.is_strategic ? '⚠️  YES' : '✅ NO'}`);
                console.log(`   Confidence: ${result.final_confidence_score}%`);
                console.log(`   Required Permits: ${result.required_permits.join(', ') || 'None'}`);
            });
        }
        
        // Test what we expect vs what we got
        console.log('\n✅ EXPECTED vs ACTUAL:');
        console.log('======================');
        
        if (strategic_status.strategic_items > 0) {
            console.log('✅ PASS: Strategic items detected');
        } else {
            console.log('❌ FAIL: No strategic items detected (expected some)');
        }
        
        if (strategic_status.has_strategic_items && strategic_status.export_blocked) {
            console.log('✅ PASS: Export blocked due to strategic items');
        } else if (!strategic_status.has_strategic_items && !strategic_status.export_blocked) {
            console.log('✅ PASS: No export blocking for non-strategic items');
        } else {
            console.log('❌ FAIL: Inconsistent export blocking logic');
        }
        
        if (permit_status.compliance_status === 'non_compliant' && strategic_status.strategic_items > 0) {
            console.log('✅ PASS: Non-compliant status for strategic items (correct)');
        } else if (permit_status.compliance_status === 'compliant' && strategic_status.strategic_items === 0) {
            console.log('✅ PASS: Compliant status for non-strategic items (correct)');
        } else {
            console.log(`❌ FAIL: Unexpected compliance status: ${permit_status.compliance_status}`);
        }
        
    } catch (error) {
        console.error('❌ Error calling API:', error.message);
    }
}

testStrategicAPI();