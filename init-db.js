/**
 * Database initialization script
 * Creates the necessary tables and extensions
 */
import 'dotenv/config';
import fs from 'fs/promises';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://gifs_user:gifs_password@localhost:5432/gifs_logistics'
});

async function initializeDatabase() {
  console.log('🔧 Initializing database schema...');
  
  try {
    // Read schema file
    const schemaSQL = await fs.readFile('./backend/src/db/schema.sql', 'utf-8');
    
    // Execute schema
    await pool.query(schemaSQL);
    
    console.log('✅ Database schema initialized successfully');
    
    // Test connection
    const result = await pool.query('SELECT COUNT(*) FROM knowledge_chunks');
    console.log(`📊 Knowledge chunks table ready (${result.rows[0].count} existing chunks)`);
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

initializeDatabase().catch(console.error);
