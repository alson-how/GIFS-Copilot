/**
 * Debug Strategic Items Detection
 * Test the strategic detection system directly
 */

import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
import StrategicDetectionEngine from './src/services/strategicDetectionEngine.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function testDetection() {
    console.log('🧪 Testing Strategic Items Detection...');
    
    const engine = new StrategicDetectionEngine(pool);
    await engine.initialize();
    
    // Test product items from the OCR data
    const testItems = [
        {
            description: "AI Accelerator Cards - Model TX4090",
            hs_code: "8473.30.905",
            technical_specs: {
                semiconductor_category: "ai_accelerator",
                technology_origin: "singapore",
                quantity: 50,
                unit_price: 2850.00,
                commercial_value: 142500.00
            }
        },
        {
            description: "High-Speed Network Switches",
            hs_code: "8517.62.002",
            technical_specs: {
                semiconductor_category: "network_equipment",
                technology_origin: "singapore",
                quantity: 25,
                unit_price: 1200.00,
                commercial_value: 30000.00
            }
        },
        {
            description: "Server Memory Modules 128GB",
            hs_code: "8473.30.201",
            technical_specs: {
                semiconductor_category: "memory",
                technology_origin: "singapore",
                quantity: 100,
                unit_price: 450.00,
                commercial_value: 45000.00
            }
        }
    ];
    
    console.log('\n🔍 Testing each item individually...\n');
    
    for (let i = 0; i < testItems.length; i++) {
        const item = testItems[i];
        console.log(`\n📦 Testing Item ${i + 1}: ${item.description}`);
        console.log(`   HS Code: ${item.hs_code}`);
        console.log(`   Value: $${item.technical_specs.commercial_value}`);
        
        try {
            const result = await engine.ragService.detectStrategicItems(item);
            
            console.log(`   🎯 Result: ${result.is_strategic ? '🚨 STRATEGIC' : '✅ NON-STRATEGIC'}`);
            console.log(`   📊 Confidence: ${result.final_confidence}%`);
            
            if (result.is_strategic) {
                console.log(`   🏷️  Strategic Codes: ${result.strategic_codes.join(', ')}`);
                console.log(`   📋 Required Permits: ${result.required_permits.join(', ')}`);
            }
            
            if (result.detection_summary.length > 0) {
                console.log(`   🔬 Detection Layers:`);
                result.detection_summary.forEach(layer => {
                    console.log(`      - ${layer.layer}: ${layer.confidence}% (${layer.matches_count} matches)`);
                });
            }
            
        } catch (error) {
            console.error(`   ❌ Detection failed: ${error.message}`);
        }
    }
    
    console.log('\n🧪 Testing complete!');
    process.exit(0);
}

testDetection().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
