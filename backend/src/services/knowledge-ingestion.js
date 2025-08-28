/**
 * Knowledge Base Ingestion Service
 * Processes files from the knowledge folder and stores them in the vector database
 */
import fs from 'fs/promises';
import path from 'path';
// import pdfParse from 'pdf-parse'; // Temporarily disabled
import { JSDOM } from 'jsdom';
import { storeKnowledgeChunk } from './rag.js';

/**
 * Configuration for ingestion process
 */
const INGESTION_CONFIG = {
  knowledgePath: path.join(process.cwd(), '../knowledge'),
  supportedExtensions: ['.md', '.txt', '.html', '.htm'], // PDFs temporarily disabled
  chunkSize: 1000, // Target chunk size in characters
  chunkOverlap: 200, // Overlap between chunks
  batchSize: 10, // Number of chunks to process in parallel
  excludeFiles: ['.DS_Store', 'README.md'],
  countryMapping: {
    'malaysia': 'MY',
    'my': 'MY',
    'singapore': 'SG',
    'hong kong': 'HK',
    'hk': 'HK'
  }
};

/**
 * Parse markdown files
 */
async function parseMarkdown(filePath, fileName) {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Extract title from filename or first heading
  let title = fileName.replace(/\.(md|txt)$/i, '').replace(/[_-]/g, ' ');
  const firstHeading = content.match(/^#\s+(.+)$/m);
  if (firstHeading) {
    title = firstHeading[1].trim();
  }

  // Split into sections based on headings
  const sections = [];
  const lines = content.split('\n');
  let currentSection = { title, level: 0, content: '', startLine: 0 };
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    const headingMatch = line.match(/^(#+)\s+(.+)$/);
    
    if (headingMatch) {
      // Save previous section if it has content
      if (currentSection.content.trim()) {
        sections.push({
          ...currentSection,
          content: currentSection.content.trim(),
          endLine: lineNumber - 1
        });
      }
      
      // Start new section
      currentSection = {
        title: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: '',
        startLine: lineNumber
      };
    } else {
      currentSection.content += line + '\n';
    }
  }

  // Add final section
  if (currentSection.content.trim()) {
    sections.push({
      ...currentSection,
      content: currentSection.content.trim(),
      endLine: lineNumber
    });
  }

  return {
    title,
    sections: sections.length > 0 ? sections : [{
      title,
      level: 1,
      content: content.trim(),
      startLine: 1,
      endLine: lineNumber
    }]
  };
}

/**
 * Parse PDF files (temporarily disabled)
 */
async function parsePDF(filePath, fileName) {
  throw new Error('PDF parsing is temporarily disabled due to dependency issues');
}

/**
 * Parse HTML files
 */
async function parseHTML(filePath, fileName) {
  const content = await fs.readFile(filePath, 'utf-8');
  const dom = new JSDOM(content);
  const document = dom.window.document;
  
  // Extract title from <title> tag or filename
  let title = document.querySelector('title')?.textContent || 
             fileName.replace(/\.(html|htm)$/i, '').replace(/[_-]/g, ' ');
  
  // Extract text content, preserving some structure
  const textContent = document.body?.textContent || document.textContent || '';
  
  return {
    title,
    sections: [{
      title,
      level: 1,
      content: textContent.trim().replace(/\s+/g, ' '),
      startLine: 1,
      endLine: textContent.split('\n').length
    }]
  };
}

/**
 * Split text into chunks with overlap
 */
function splitIntoChunks(text, maxSize = INGESTION_CONFIG.chunkSize, overlap = INGESTION_CONFIG.chunkOverlap) {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxSize;
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('.', end);
      const paragraphEnd = text.lastIndexOf('\n\n', end);
      const breakPoint = Math.max(sentenceEnd, paragraphEnd);
      
      if (breakPoint > start + maxSize * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks;
}

/**
 * Extract metadata from filename and content
 */
function extractMetadata(fileName, content) {
  const metadata = {
    country: 'MY', // Default to Malaysia
    tags: [],
    category: 'general'
  };

  const lowerFileName = fileName.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Detect country
  for (const [keyword, country] of Object.entries(INGESTION_CONFIG.countryMapping)) {
    if (lowerFileName.includes(keyword) || lowerContent.includes(keyword)) {
      metadata.country = country;
      break;
    }
  }

  // Extract tags from filename and content
  const tagKeywords = {
    'strategic': ['strategic', 'sta', 'strategic trade'],
    'customs': ['customs', 'kastam', 'jkdm'],
    'export': ['export', 'eksport'],
    'import': ['import'],
    'permit': ['permit', 'license', 'epermit'],
    'documentation': ['form', 'document', 'k1', 'k2', 'k3', 'k8', 'k9'],
    'ai-chips': ['ai chip', 'artificial intelligence', 'semiconductor'],
    'screening': ['screening', 'end user', 'sanctioned'],
    'sirim': ['sirim', 'certification'],
    'procedure': ['procedure', 'guideline', 'panduan']
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(keyword => lowerFileName.includes(keyword) || lowerContent.includes(keyword))) {
      metadata.tags.push(tag);
    }
  }

  // Determine category
  if (metadata.tags.includes('strategic') || metadata.tags.includes('ai-chips')) {
    metadata.category = 'strategic-trade';
  } else if (metadata.tags.includes('customs') || metadata.tags.includes('documentation')) {
    metadata.category = 'customs';
  } else if (metadata.tags.includes('procedure')) {
    metadata.category = 'procedures';
  } else if (metadata.tags.includes('sirim')) {
    metadata.category = 'certification';
  }

  return metadata;
}

/**
 * Process a single file
 */
async function processFile(filePath, pool, stats) {
  const fileName = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();

  console.log(`📄 Processing: ${fileName}`);

  try {
    let parsedData;

    // Parse based on file type
    switch (extension) {
      case '.md':
      case '.txt':
        parsedData = await parseMarkdown(filePath, fileName);
        break;
      case '.pdf':
        parsedData = await parsePDF(filePath, fileName);
        break;
      case '.html':
      case '.htm':
        parsedData = await parseHTML(filePath, fileName);
        break;
      default:
        console.log(`⚠️  Unsupported file type: ${extension}`);
        stats.skipped++;
        return;
    }

    const metadata = extractMetadata(fileName, parsedData.sections[0]?.content || '');
    let chunkCount = 0;

    // Process each section
    for (const section of parsedData.sections) {
      const chunks = splitIntoChunks(section.content);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim().length < 50) continue; // Skip very short chunks

        const chunkTitle = chunks.length > 1 
          ? `${section.title} (Part ${i + 1})`
          : section.title;

        const knowledgeChunk = {
          title: chunkTitle,
          section: `${fileName}:${section.startLine}-${section.endLine}`,
          country: metadata.country,
          tags: metadata.tags,
          text: chunk.trim()
        };

        try {
          await storeKnowledgeChunk(knowledgeChunk, pool);
          chunkCount++;
          stats.chunksStored++;
        } catch (error) {
          console.error(`❌ Error storing chunk from ${fileName}:`, error.message);
          stats.errors++;
        }
      }
    }

    console.log(`✅ ${fileName}: ${chunkCount} chunks stored`);
    stats.filesProcessed++;

  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message);
    stats.errors++;
  }
}

/**
 * Main ingestion function
 */
export async function ingestKnowledgeFolder(pool, options = {}) {
  const config = { ...INGESTION_CONFIG, ...options };
  
  console.log('🚀 Starting knowledge folder ingestion...');
  console.log(`📁 Knowledge path: ${config.knowledgePath}`);

  const stats = {
    filesProcessed: 0,
    chunksStored: 0,
    skipped: 0,
    errors: 0,
    startTime: Date.now()
  };

  try {
    // Check if knowledge folder exists
    await fs.access(config.knowledgePath);
    const files = await fs.readdir(config.knowledgePath);
    
    // Filter supported files
    const supportedFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return config.supportedExtensions.includes(ext) && 
             !config.excludeFiles.includes(file);
    });

    console.log(`📊 Found ${supportedFiles.length} supported files`);

    // Process files in batches
    for (let i = 0; i < supportedFiles.length; i += config.batchSize) {
      const batch = supportedFiles.slice(i, i + config.batchSize);
      const promises = batch.map(file => 
        processFile(path.join(config.knowledgePath, file), pool, stats)
      );
      
      await Promise.all(promises);
      
      // Show progress
      console.log(`📈 Progress: ${Math.min(i + config.batchSize, supportedFiles.length)}/${supportedFiles.length} files`);
    }

    // Create indexes for better performance
    console.log('🔧 Creating database indexes...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_kn_emb 
        ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_kn_country ON knowledge_chunks (country);
        CREATE INDEX IF NOT EXISTS idx_kn_tags ON knowledge_chunks USING GIN (tags);
        CREATE INDEX IF NOT EXISTS idx_kn_created ON knowledge_chunks (created_at);
      `);
      
      await pool.query('ANALYZE knowledge_chunks;');
      console.log('✅ Database indexes created');
    } catch (indexError) {
      console.warn('⚠️  Could not create some indexes:', indexError.message);
    }

    // Final statistics
    const duration = (Date.now() - stats.startTime) / 1000;
    console.log('\n🎉 Ingestion completed!');
    console.log(`📊 Statistics:`);
    console.log(`   Files processed: ${stats.filesProcessed}`);
    console.log(`   Chunks stored: ${stats.chunksStored}`);
    console.log(`   Files skipped: ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Duration: ${duration.toFixed(2)}s`);
    console.log(`   Chunks per second: ${(stats.chunksStored / duration).toFixed(2)}`);

    return stats;

  } catch (error) {
    console.error('💥 Ingestion failed:', error);
    throw error;
  }
}

/**
 * Clear existing knowledge base
 */
export async function clearKnowledgeBase(pool) {
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
 * Get ingestion statistics
 */
export async function getIngestionStats(pool) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT country) as countries,
        COUNT(DISTINCT unnest(tags)) as unique_tags,
        AVG(length(text)) as avg_chunk_size,
        MIN(created_at) as oldest_chunk,
        MAX(created_at) as newest_chunk
      FROM knowledge_chunks
    `);
    
    const tagResult = await pool.query(`
      SELECT unnest(tags) as tag, COUNT(*) as count
      FROM knowledge_chunks
      GROUP BY unnest(tags)
      ORDER BY count DESC
      LIMIT 10
    `);

    const countryResult = await pool.query(`
      SELECT country, COUNT(*) as count
      FROM knowledge_chunks
      GROUP BY country
      ORDER BY count DESC
    `);

    return {
      overview: result.rows[0],
      topTags: tagResult.rows,
      countries: countryResult.rows
    };
  } catch (error) {
    console.error('Error getting ingestion stats:', error);
    throw error;
  }
}
