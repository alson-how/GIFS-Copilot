/**
 * Test the compliance check endpoint to see the compliance score
 */

import fetch from 'node-fetch';

async function testComplianceCheck() {
    const testShipmentId = '010b50bf-1b3a-434c-8eff-60b4401961a3'; // Has strategic items
    
    console.log('🧪 Testing Compliance Check API');
    console.log('================================\n');
    
    try {
        // Test the compliance check endpoint
        const complianceUrl = `http://localhost:8080/api/strategic/compliance/check/${testShipmentId}`;
        console.log(`🔍 Calling: ${complianceUrl}`);
        
        const response = await fetch(complianceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ API Error:', data);
            return;
        }
        
        console.log('\n📊 COMPLIANCE CHECK RESPONSE:');
        console.log('==============================');
        console.log(JSON.stringify(data, null, 2));
        
        // Check if compliance_score exists and is 0%
        if (data.data && data.data.compliance_score !== undefined) {
            console.log(`\n🎯 Compliance Score: ${data.data.compliance_score}%`);
            
            if (data.data.compliance_score === 0) {
                console.log('✅ PASS: Compliance score is 0% for strategic items (correct)');
            } else {
                console.log(`❌ FAIL: Expected 0% compliance score, got ${data.data.compliance_score}%`);
            }
        } else {
            console.log('⚠️ No compliance_score field in response');
        }
        
    } catch (error) {
        console.error('❌ Error calling compliance API:', error.message);
    }
    
    // Also test with a direct API call to detect endpoint
    console.log('\n🔄 Testing detect endpoint directly...');
    
    try {
        const detectUrl = 'http://localhost:8080/api/strategic/detect';
        console.log(`🔍 Calling: ${detectUrl}`);
        
        // Test with the known strategic items
        const detectResponse = await fetch(detectUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                shipment_id: testShipmentId,
                product_items: [
                    {
                        description: 'AI Accelerator Cards - Model TX4090',
                        hs_code: '8473.30.905',
                        quantity: '50',
                        unit_price: '2850.00',
                        line_total: '142500.00'
                    },
                    {
                        description: 'High-Speed Network Switches',
                        hs_code: '8517.62.002',
                        quantity: '25',
                        unit_price: '1200.00',
                        line_total: '30000.00'
                    }
                ]
            })
        });
        
        const detectData = await detectResponse.json();
        
        if (!detectResponse.ok) {
            console.error('❌ Detect API Error:', detectData);
            return;
        }
        
        console.log('\n📊 DETECT RESPONSE:');
        console.log('==================');
        console.log(JSON.stringify(detectData, null, 2));
        
        // Check the compliance score in the detect response
        if (detectData.data && detectData.data.overall_compliance_score !== undefined) {
            console.log(`\n🎯 Overall Compliance Score: ${detectData.data.overall_compliance_score}%`);
            
            if (detectData.data.overall_compliance_score === 0) {
                console.log('✅ PASS: Overall compliance score is 0% for strategic items (CORRECT!)');
            } else {
                console.log(`❌ FAIL: Expected 0% compliance score, got ${detectData.data.overall_compliance_score}%`);
            }
            
            console.log(`Strategic Items Found: ${detectData.data.strategic_items_found}`);
            console.log(`Export Blocked: ${detectData.data.export_blocked ? '🚫 YES' : '✅ NO'}`);
        }
        
    } catch (error) {
        console.error('❌ Error calling detect API:', error.message);
    }
}

testComplianceCheck();