#!/usr/bin/env node

/**
 * Enhanced Knowledge Ingestion CLI Script
 * Usage: node enhanced-ingest.js [options]
 */
import 'dotenv/config';
import pkg from 'pg';
import { ingestKnowledgeFolder } from '../services/enhanced-ingestion.js';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Clear existing knowledge base
 */
async function clearKnowledgeBase() {
  console.log('🗑️  Clearing existing knowledge base...');
  try {
    const result = await pool.query('DELETE FROM knowledge_chunks WHERE id IS NOT NULL');
    console.log(`✅ Cleared ${result.rowCount} existing chunks`);
    return result.rowCount;
  } catch (error) {
    console.error('❌ Error clearing knowledge base:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  
  console.log('🚀 Enhanced GIFS Knowledge Base Ingestion Tool');
  console.log('============================================\n');
  
  try {
    // Check database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
    
    // Check OpenAI configuration
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.warn('⚠️  OpenAI API key not configured. Using fake embeddings.');
      console.warn('   Set OPENAI_API_KEY in your environment for proper embeddings.\n');
    } else {
      console.log('✅ OpenAI API key configured\n');
    }
    
    // Clear existing data if requested
    if (shouldClear) {
      await clearKnowledgeBase();
      console.log('');
    }
    
    // Run enhanced ingestion
    const startTime = Date.now();
    const stats = await ingestKnowledgeFolder(pool, {
      knowledgePath: '/knowledge'
    });
    const duration = (Date.now() - startTime) / 1000;
    
    // Final summary
    console.log('\n🎉 Enhanced Ingestion Summary');
    console.log('============================');
    console.log(`📁 Files processed: ${stats.filesProcessed}`);
    console.log(`📦 Chunks created: ${stats.chunksStored}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`⏱️  Total time: ${duration.toFixed(2)}s`);
    console.log(`⚡ Performance: ${(stats.chunksStored / duration).toFixed(2)} chunks/sec`);
    
    if (stats.errors > 0) {
      console.log('\n⚠️  Some files had errors. Check the logs above for details.');
    }
    
    // Show database stats
    const countResult = await pool.query('SELECT COUNT(*) as total FROM knowledge_chunks');
    console.log(`\n📊 Total chunks in database: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('\n💥 Enhanced ingestion failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
