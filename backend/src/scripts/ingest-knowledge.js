#!/usr/bin/env node

/**
 * Knowledge Ingestion CLI Script
 * Usage: node ingest-knowledge.js [options]
 */
import 'dotenv/config';
import pkg from 'pg';
import { ingestKnowledgeFolder, clearKnowledgeBase, getIngestionStats } from '../services/knowledge-ingestion.js';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Display help information
 */
function showHelp() {
  console.log(`
🧠 Knowledge Base Ingestion Tool

Usage: node ingest-knowledge.js [options]

Options:
  --help, -h          Show this help message
  --clear             Clear existing knowledge base before ingestion
  --stats             Show current knowledge base statistics
  --dry-run           Process files but don't store in database
  --batch-size N      Number of files to process in parallel (default: 10)
  --chunk-size N      Target chunk size in characters (default: 1000)
  --country CODE      Override country detection (e.g., MY, SG, HK)

Examples:
  node ingest-knowledge.js                    # Ingest all files
  node ingest-knowledge.js --clear            # Clear DB and ingest
  node ingest-knowledge.js --stats            # Show statistics only
  node ingest-knowledge.js --dry-run          # Test without storing
  node ingest-knowledge.js --batch-size 5     # Process 5 files at once
  `);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    clear: false,
    stats: false,
    dryRun: false,
    help: false,
    batchSize: 10,
    chunkSize: 1000,
    country: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--clear':
        options.clear = true;
        break;
      case '--stats':
        options.stats = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 10;
        break;
      case '--chunk-size':
        options.chunkSize = parseInt(args[++i]) || 1000;
        break;
      case '--country':
        options.country = args[++i];
        break;
      default:
        console.warn(`⚠️  Unknown option: ${arg}`);
    }
  }

  return options;
}

/**
 * Display knowledge base statistics
 */
async function displayStats() {
  console.log('📊 Knowledge Base Statistics\n');
  
  try {
    const stats = await getIngestionStats(pool);
    
    console.log('📈 Overview:');
    console.log(`   Total chunks: ${stats.overview.total_chunks}`);
    console.log(`   Countries: ${stats.overview.countries}`);
    console.log(`   Unique tags: ${stats.overview.unique_tags}`);
    console.log(`   Average chunk size: ${Math.round(stats.overview.avg_chunk_size)} characters`);
    
    if (stats.overview.oldest_chunk) {
      console.log(`   Oldest chunk: ${new Date(stats.overview.oldest_chunk).toLocaleDateString()}`);
      console.log(`   Newest chunk: ${new Date(stats.overview.newest_chunk).toLocaleDateString()}`);
    }
    
    console.log('\n🏷️  Top Tags:');
    stats.topTags.forEach((tag, index) => {
      console.log(`   ${index + 1}. ${tag.tag}: ${tag.count} chunks`);
    });
    
    console.log('\n🌍 Countries:');
    stats.countries.forEach((country, index) => {
      console.log(`   ${index + 1}. ${country.country}: ${country.count} chunks`);
    });
    
  } catch (error) {
    console.error('❌ Error getting statistics:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  console.log('🚀 GIFS Knowledge Base Ingestion Tool');
  console.log('=====================================\n');
  
  try {
    // Check database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
    
    // Show statistics if requested
    if (options.stats) {
      await displayStats();
      return;
    }
    
    // Check OpenAI configuration
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.warn('⚠️  OpenAI API key not configured. Using fake embeddings.');
      console.warn('   Set OPENAI_API_KEY in your environment for proper embeddings.\n');
    } else {
      console.log('✅ OpenAI API key configured\n');
    }
    
    // Clear existing data if requested
    if (options.clear) {
      const cleared = await clearKnowledgeBase(pool);
      console.log(`🗑️  Cleared ${cleared} existing chunks\n`);
    }
    
    if (options.dryRun) {
      console.log('🧪 DRY RUN MODE - No data will be stored\n');
    }
    
    // Run ingestion
    const ingestionOptions = {
      batchSize: options.batchSize,
      chunkSize: options.chunkSize
    };
    
    if (options.country) {
      ingestionOptions.defaultCountry = options.country.toUpperCase();
    }
    
    const startTime = Date.now();
    const stats = await ingestKnowledgeFolder(pool, ingestionOptions);
    const duration = (Date.now() - startTime) / 1000;
    
    // Final summary
    console.log('\n🎉 Ingestion Summary');
    console.log('===================');
    console.log(`📁 Files processed: ${stats.filesProcessed}`);
    console.log(`📦 Chunks created: ${stats.chunksStored}`);
    console.log(`⏭️  Files skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`⏱️  Total time: ${duration.toFixed(2)}s`);
    console.log(`⚡ Performance: ${(stats.chunksStored / duration).toFixed(2)} chunks/sec`);
    
    if (stats.errors > 0) {
      console.log('\n⚠️  Some files had errors. Check the logs above for details.');
    }
    
    // Show updated statistics
    console.log('\n📊 Updated Database Statistics:');
    await displayStats();
    
  } catch (error) {
    console.error('\n💥 Ingestion failed:', error);
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
