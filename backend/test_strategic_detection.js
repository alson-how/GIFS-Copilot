/**
 * Test Script for Strategic Item Detection
 * Verifies that the detection API correctly identifies strategic items
 */

import StrategicDetectionEngine from './src/services/strategicDetectionEngine.js';
import pg from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function testStrategicDetection() {
    console.log('🧪 Starting Strategic Item Detection Test');
    console.log('=========================================\n');
    
    try {
        // Initialize detection engine
        const engine = new StrategicDetectionEngine(pool);
        await engine.initialize();
        
        // Test data with strategic items from your commercial invoice
        const testShipmentId = uuidv4(); // Generate proper UUID
        
        // Create a test shipment record first
        try {
            await pool.query(`
                INSERT INTO shipments (shipment_id, destination_country) 
                VALUES ($1, $2)
                ON CONFLICT (shipment_id) DO NOTHING
            `, [testShipmentId, 'Test Country']);
            console.log(`✅ Created test shipment: ${testShipmentId}`);
        } catch (shipmentError) {
            console.log('⚠️ Could not create test shipment, continuing with detection only');
        }
        const testProductItems = [
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
            },
            {
                description: 'Server Memory Modules 128GB',
                hs_code: '8473.30.201',
                quantity: '100',
                unit_price: '450.00',
                line_total: '45000.00'
            },
            {
                description: 'Fiber Optic Cables - 50m',
                hs_code: '8544.70.007',
                quantity: '75',
                unit_price: '85.00',
                line_total: '6375.00'
            }
        ];
        
        console.log(`🔍 Testing shipment: ${testShipmentId}`);
        console.log(`📦 Processing ${testProductItems.length} items:`);
        testProductItems.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.description} (HS: ${item.hs_code})`);
        });
        console.log('');
        
        // Run strategic detection
        const results = await engine.processShipment(testShipmentId, testProductItems);
        
        // Display results
        console.log('📊 DETECTION RESULTS');
        console.log('==================');
        console.log(`Total Items: ${results.total_items}`);
        console.log(`Strategic Items Found: ${results.strategic_items_found}`);
        console.log(`Export Blocked: ${results.export_blocked ? '🚫 YES' : '✅ NO'}`);
        console.log(`Compliance Score: ${results.overall_compliance_score}%`);
        console.log(`Required Permits: ${results.required_permits.join(', ')}`);
        console.log('');
        
        // Show individual item results
        console.log('🔍 INDIVIDUAL ITEM ANALYSIS');
        console.log('==========================');
        results.detection_results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.product_description || 'Unknown'}`);
            console.log(`   Strategic: ${result.is_strategic ? '⚠️  YES' : '✅ NO'}`);
            console.log(`   Confidence: ${result.final_confidence || 0}%`);
            if (result.strategic_codes && result.strategic_codes.length > 0) {
                console.log(`   Strategic Codes: ${result.strategic_codes.join(', ')}`);
            }
            if (result.required_permits && result.required_permits.length > 0) {
                console.log(`   Required Permits: ${result.required_permits.join(', ')}`);
            }
        });
        
        // Test expected outcomes
        console.log('\n🧪 VALIDATION CHECKS');
        console.log('===================');
        
        const expectedStrategicItems = testProductItems.filter(item => 
            item.description.toLowerCase().includes('ai accelerator') ||
            item.description.toLowerCase().includes('network switch') ||
            item.description.toLowerCase().includes('server memory') ||
            item.description.toLowerCase().includes('fiber optic')
        ).length;
        
        console.log(`Expected strategic items: ${expectedStrategicItems}`);
        console.log(`Detected strategic items: ${results.strategic_items_found}`);
        
        if (results.strategic_items_found > 0) {
            console.log('✅ PASS: Strategic items detected');
        } else {
            console.log('❌ FAIL: No strategic items detected');
        }
        
        if (results.overall_compliance_score === 0 && results.strategic_items_found > 0) {
            console.log('✅ PASS: Compliance score is 0% for strategic items (correct)');
        } else if (results.overall_compliance_score === 100 && results.strategic_items_found === 0) {
            console.log('✅ PASS: Compliance score is 100% for non-strategic items (correct)');
        } else {
            console.log(`❌ FAIL: Unexpected compliance score: ${results.overall_compliance_score}%`);
        }
        
        if (results.export_blocked && results.strategic_items_found > 0) {
            console.log('✅ PASS: Export blocked due to strategic items (correct)');
        } else if (!results.export_blocked && results.strategic_items_found === 0) {
            console.log('✅ PASS: Export allowed for non-strategic items (correct)');
        } else {
            console.log('❌ FAIL: Incorrect export blocking logic');
        }
        
        if (results.required_permits.length > 0 && results.strategic_items_found > 0) {
            console.log('✅ PASS: Required permits listed for strategic items');
        } else if (results.required_permits.length === 0 && results.strategic_items_found === 0) {
            console.log('✅ PASS: No permits required for non-strategic items');
        } else {
            console.log('❌ FAIL: Incorrect permit requirements');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testStrategicDetection();