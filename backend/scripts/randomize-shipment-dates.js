/**
 * Script to randomize shipment updated_at dates within September 2025
 * This will distribute existing shipments across the calendar month for testing
 */

import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Generate a random date within September 2025
 * @returns {Date} Random date in September 2025
 */
function getRandomSeptemberDate() {
  const year = 2025;
  const month = 8; // September (0-indexed)
  
  // Random day between 1-30 (September has 30 days)
  const day = Math.floor(Math.random() * 30) + 1;
  
  // Random hour between 8-18 (business hours)
  const hour = Math.floor(Math.random() * 11) + 8;
  
  // Random minute
  const minute = Math.floor(Math.random() * 60);
  
  // Random second
  const second = Math.floor(Math.random() * 60);
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Randomize shipment dates
 */
async function randomizeShipmentDates() {
  try {
    console.log('🚀 Starting shipment date randomization...');
    
    // First, get all existing shipments
    const getShipmentsQuery = 'SELECT shipment_id, status FROM shipments LIMIT 100';
    const result = await pool.query(getShipmentsQuery);
    
    console.log(`📦 Found ${result.rows.length} shipments to update`);
    
    if (result.rows.length === 0) {
      console.log('❌ No shipments found. Creating some sample data first...');
      await createSampleShipments();
      return;
    }
    
    // Update each shipment with a random September date
    const updatePromises = result.rows.map(async (shipment, index) => {
      const randomDate = getRandomSeptemberDate();
      
      const updateQuery = `
        UPDATE shipments 
        SET updated_at = $1 
        WHERE shipment_id = $2
      `;
      
      await pool.query(updateQuery, [randomDate.toISOString(), shipment.shipment_id]);
      
      console.log(`✅ Updated shipment ${index + 1}/${result.rows.length}: ${shipment.shipment_id.substring(0, 8)}... -> ${randomDate.toISOString().split('T')[0]}`);
      
      return shipment.shipment_id;
    });
    
    await Promise.all(updatePromises);
    
    console.log('🎉 Successfully randomized all shipment dates within September 2025!');
    
    // Show distribution summary
    await showDateDistribution();
    
  } catch (error) {
    console.error('❌ Error randomizing shipment dates:', error);
  } finally {
    await pool.end();
  }
}

/**
 * Create sample shipments if none exist
 */
async function createSampleShipments() {
  const sampleShipments = [
    {
      end_user_name: 'Tech Solutions Inc',
      destination_country: 'SG',
      product_type: 'semiconductors',
      status: 'PENDING_QUOTE',
      commercial_value: 15000.00,
      currency: 'USD',
      shipment_priority: 'High'
    },
    {
      end_user_name: 'Global Electronics Ltd',
      destination_country: 'MY',
      product_type: 'ai_accelerator',
      status: 'UNDER_REVIEW',
      commercial_value: 25000.00,
      currency: 'USD',
      shipment_priority: 'Medium'
    },
    {
      end_user_name: 'Semiconductor Corp',
      destination_country: 'TW',
      product_type: 'memory_chips',
      status: 'CONFIRMED',
      commercial_value: 18500.00,
      currency: 'USD',
      shipment_priority: 'Standard'
    },
    {
      end_user_name: 'Innovation Labs',
      destination_country: 'JP',
      product_type: 'processors',
      status: 'IN_TRANSIT',
      commercial_value: 32000.00,
      currency: 'USD',
      shipment_priority: 'High'
    },
    {
      end_user_name: 'Digital Systems',
      destination_country: 'KR',
      product_type: 'circuit_boards',
      status: 'DELIVERED',
      commercial_value: 12500.00,
      currency: 'USD',
      shipment_priority: 'Low'
    },
    {
      end_user_name: 'Advanced Tech',
      destination_country: 'CN',
      product_type: 'semiconductors',
      status: 'PICKUP_SCHEDULED',
      commercial_value: 22000.00,
      currency: 'USD',
      shipment_priority: 'Medium'
    },
    {
      end_user_name: 'Microtech Industries',
      destination_country: 'TH',
      product_type: 'ai_accelerator',
      status: 'AT_WAREHOUSE',
      commercial_value: 28000.00,
      currency: 'USD',
      shipment_priority: 'High'
    },
    {
      end_user_name: 'Electronic Solutions',
      destination_country: 'VN',
      product_type: 'memory_chips',
      status: 'CUSTOMS_EXPORT',
      commercial_value: 16800.00,
      currency: 'USD',
      shipment_priority: 'Standard'
    }
  ];
  
  console.log('📝 Creating sample shipments...');
  
  for (let i = 0; i < sampleShipments.length; i++) {
    const shipment = sampleShipments[i];
    const randomDate = getRandomSeptemberDate();
    
    const insertQuery = `
      INSERT INTO shipments (
        shipment_id, end_user_name, destination_country, product_type, 
        status, commercial_value, currency, shipment_priority, 
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $8
      )
    `;
    
    await pool.query(insertQuery, [
      shipment.end_user_name,
      shipment.destination_country,
      shipment.product_type,
      shipment.status,
      shipment.commercial_value,
      shipment.currency,
      shipment.shipment_priority,
      randomDate.toISOString()
    ]);
    
    console.log(`✅ Created sample shipment ${i + 1}: ${shipment.end_user_name} -> ${randomDate.toISOString().split('T')[0]}`);
  }
  
  console.log('🎉 Sample shipments created successfully!');
}

/**
 * Show distribution of shipments across September dates
 */
async function showDateDistribution() {
  const query = `
    SELECT 
      DATE(updated_at) as date,
      COUNT(*) as shipment_count,
      ARRAY_AGG(DISTINCT status) as statuses
    FROM shipments 
    WHERE updated_at >= '2025-09-01' AND updated_at < '2025-10-01'
    GROUP BY DATE(updated_at)
    ORDER BY DATE(updated_at)
  `;
  
  const result = await pool.query(query);
  
  console.log('\n📊 September 2025 Shipment Distribution:');
  console.log('=====================================');
  
  result.rows.forEach(row => {
    console.log(`${row.date.toISOString().split('T')[0]}: ${row.shipment_count} shipment(s) - ${row.statuses.join(', ')}`);
  });
  
  console.log(`\nTotal: ${result.rows.reduce((sum, row) => sum + parseInt(row.shipment_count), 0)} shipments distributed across ${result.rows.length} days`);
}

// Run the script
randomizeShipmentDates();