/**
 * Check specific shipment data and test strategic detection
 */

import pg from 'pg';
import dotenv from 'dotenv';
import StrategicDetectionEngine from './src/services/strategicDetectionEngine.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkShipment() {
    const shipmentId = '0a2792c5-8205-4902-beb0-d4c46cbed143';
    
    try {
        console.log(`🔍 Checking shipment: ${shipmentId}`);
        console.log('==========================================\n');
        
        // 1. Check if shipment exists
        const shipmentResult = await pool.query(
            'SELECT * FROM shipments WHERE shipment_id = $1',
            [shipmentId]
        );
        
        if (shipmentResult.rows.length === 0) {
            console.log('❌ Shipment not found in database');
            return;
        }
        
        console.log('✅ Shipment exists:', shipmentResult.rows[0]);
        console.log('');
        
        // 2. Check strategic detection results
        const detectionResult = await pool.query(`
            SELECT 
                id, item_description, hs_code, final_confidence_score,
                is_strategic, strategic_codes, required_permits,
                export_blocked, manual_review_required, created_at
            FROM strategic_detection_results
            WHERE shipment_id = $1
            ORDER BY created_at ASC
        `, [shipmentId]);
        
        console.log(`📊 Strategic detection results: ${detectionResult.rows.length} items`);
        if (detectionResult.rows.length > 0) {
            detectionResult.rows.forEach((row, index) => {
                console.log(`\n${index + 1}. ${row.item_description}`);
                console.log(`   Strategic: ${row.is_strategic ? '⚠️  YES' : '✅ NO'}`);
                console.log(`   Confidence: ${row.final_confidence_score}%`);
                console.log(`   Strategic Codes: ${row.strategic_codes || 'None'}`);
                console.log(`   Required Permits: ${row.required_permits || 'None'}`);
                console.log(`   Export Blocked: ${row.export_blocked ? '🚫 YES' : '✅ NO'}`);
            });
        } else {
            console.log('⚠️ No strategic detection results found');
        }
        console.log('');
        
        // 3. Check uploaded documents
        const documentsResult = await pool.query(`
            SELECT document_id, original_filename, document_type, ocr_results
            FROM uploaded_documents
            WHERE shipment_id = $1
        `, [shipmentId]);
        
        console.log(`📄 Uploaded documents: ${documentsResult.rows.length} files`);
        documentsResult.rows.forEach((doc, index) => {
            console.log(`${index + 1}. ${doc.original_filename} (${doc.document_type})`);
            if (doc.ocr_results && doc.ocr_results.product_items) {
                console.log(`   Product items found: ${doc.ocr_results.product_items.length}`);
                doc.ocr_results.product_items.forEach((item, i) => {
                    console.log(`     ${i + 1}. ${item.description || item.item_description || 'Unknown'}`);
                });
            }
        });
        console.log('');
        
        // 4. Try running strategic detection manually on the OCR data
        if (documentsResult.rows.length > 0) {
            const doc = documentsResult.rows[0];
            if (doc.ocr_results && doc.ocr_results.product_items && doc.ocr_results.product_items.length > 0) {
                console.log('🔄 Running manual strategic detection on extracted products...');
                
                const engine = new StrategicDetectionEngine(pool);
                await engine.initialize();
                
                const productItems = doc.ocr_results.product_items.map(item => ({
                    description: item.description || item.item_description || 'Unknown product',
                    hs_code: item.hs_code || item.hsCode || '',
                    quantity: item.quantity || item.qty || '1',
                    unit_price: item.unit_price || item.unitPrice || '0',
                    line_total: item.line_total || item.lineTotal || item.total_amount || '0'
                }));
                
                console.log('📦 Products to analyze:');
                productItems.forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.description} (HS: ${item.hs_code})`);
                });
                
                // Run detection
                const results = await engine.processShipment(shipmentId, productItems);
                
                console.log('\n🎯 MANUAL DETECTION RESULTS:');
                console.log(`Strategic Items Found: ${results.strategic_items_found}`);
                console.log(`Compliance Score: ${results.overall_compliance_score}%`);
                console.log(`Export Blocked: ${results.export_blocked ? '🚫 YES' : '✅ NO'}`);
                console.log(`Required Permits: ${results.required_permits.join(', ')}`);
            } else {
                console.log('⚠️ No product items found in OCR results to test');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkShipment();