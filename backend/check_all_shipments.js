/**
 * Check all shipments in database and find recent ones
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkAllShipments() {
    try {
        console.log('🔍 Checking all shipments in database');
        console.log('=====================================\n');
        
        // Get all shipments
        const shipmentResult = await pool.query(`
            SELECT shipment_id, destination_country, created_at
            FROM shipments
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        console.log(`📊 Found ${shipmentResult.rows.length} shipments (showing latest 10):`);
        shipmentResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.shipment_id}`);
            console.log(`   Destination: ${row.destination_country}`);
            console.log(`   Created: ${row.created_at}`);
            console.log('');
        });
        
        // Check strategic detection results for all shipments
        const detectionResult = await pool.query(`
            SELECT shipment_id, COUNT(*) as total_items,
                   COUNT(CASE WHEN is_strategic = true THEN 1 END) as strategic_items
            FROM strategic_detection_results
            GROUP BY shipment_id
            ORDER BY MAX(created_at) DESC
        `);
        
        console.log(`🔍 Strategic detection data for ${detectionResult.rows.length} shipments:`);
        detectionResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.shipment_id}: ${row.strategic_items}/${row.total_items} strategic`);
        });
        console.log('');
        
        // Check uploaded documents
        const documentsResult = await pool.query(`
            SELECT shipment_id, original_filename, document_type, created_at
            FROM uploaded_documents
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        console.log(`📄 Recent uploaded documents (${documentsResult.rows.length}):`);
        documentsResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.shipment_id}: ${row.original_filename} (${row.document_type})`);
            console.log(`   Uploaded: ${row.created_at}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkAllShipments();