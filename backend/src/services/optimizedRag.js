/**
 * Optimized RAG service with caching and performance improvements
 * Target: <2 second response times
 */
import OpenAI from 'openai';
import crypto from 'node:crypto';

// Initialize OpenAI client conditionally
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Configuration
const CONFIG = {
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  chatModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxChunks: parseInt(process.env.RAG_MAX_CHUNKS) || 3, // Reduced from 5 to 3
  similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD) || 0.7,
  embeddingDimension: 1536,
  maxTokens: 800, // Reduced from 1000
  temperature: 0.2, // Reduced for faster processing
};

// In-memory caches
const embeddingCache = new Map();
const queryCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 1000;

/**
 * Clean expired cache entries
 */
function cleanCache(cache) {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
  
  // If still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, cache.size - MAX_CACHE_SIZE);
    
    entries.forEach(([key]) => cache.delete(key));
  }
}

/**
 * Generate embeddings with caching
 */
async function generateEmbeddingCached(text) {
  if (!openai) {
    return fakeEmbed(text);
  }
  
  // Create cache key
  const cacheKey = crypto.createHash('sha256').update(text.trim()).digest('hex');
  
  // Check cache first
  const cached = embeddingCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const response = await openai.embeddings.create({
      model: CONFIG.embeddingModel,
      input: text.trim(),
    });
    
    const embedding = response.data[0].embedding;
    
    // Cache the result
    embeddingCache.set(cacheKey, {
      data: embedding,
      timestamp: Date.now()
    });
    
    // Clean cache periodically
    if (embeddingCache.size % 100 === 0) {
      cleanCache(embeddingCache);
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return fakeEmbed(text);
  }
}

/**
 * Fallback fake embedding function
 */
function fakeEmbed(text) {
  const bytes = crypto.createHash('sha256').update(text).digest();
  const arr = Array.from(bytes.slice(0, 64)).map(b => (b - 128) / 128);
  while (arr.length < CONFIG.embeddingDimension) {
    arr.push(0);
  }
  return arr.slice(0, CONFIG.embeddingDimension);
}

/**
 * Optimized knowledge chunk retrieval
 */
async function retrieveKnowledgeChunksOptimized(query, pool, country = 'MY') {
  try {
    const embedding = await generateEmbeddingCached(query);
    
    // Optimized query with better indexing
    const sql = `
      SELECT 
        id, 
        title, 
        section, 
        LEFT(text, 500) as text,  -- Limit text length for faster processing
        country,
        tags,
        1 - (embedding <=> $1::vector) AS similarity_score
      FROM knowledge_chunks
      WHERE 
        country = $2 
        AND (1 - (embedding <=> $1::vector)) >= $3
      ORDER BY embedding <=> $1::vector
      LIMIT $4`;
    
    const result = await pool.query(sql, [
      `[${embedding.join(',')}]`,
      country,
      CONFIG.similarityThreshold,
      CONFIG.maxChunks
    ]);
    
    return result.rows || [];
  } catch (error) {
    console.error('Error retrieving knowledge chunks:', error);
    return [];
  }
}

/**
 * Optimized answer generation with smaller context
 */
async function generateAnswerOptimized(query, chunks, country = 'MY') {
  if (!openai) {
    const context = chunks.map(chunk => 
      `**${chunk.title}**: ${chunk.text.slice(0, 150)}...`
    ).join('\n\n');
    
    return `Based on the available information:\n\n${context}\n\nNote: OpenAI API is not configured.`;
  }
  
  try {
    // Reduced context for faster processing
    const context = chunks.map(chunk => 
      `**${chunk.title}** (${chunk.section}): ${chunk.text}`
    ).join('\n\n');
    
    // Shorter system prompt
    const systemPrompt = `You are an AI assistant for ${country === 'MY' ? 'Malaysia' : country} logistics compliance. 
    
Provide accurate, concise answers about export regulations, semiconductor controls, and trade authorization based on the context below:

${context}`;

    const userPrompt = `Question: ${query}

Please provide a concise answer based on the context provided.`;

    const response = await openai.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: CONFIG.temperature,
      max_tokens: CONFIG.maxTokens,
    });

    return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
  } catch (error) {
    console.error('Error generating answer:', error);
    return 'I encountered an error while processing your question. Please try again.';
  }
}

/**
 * Main optimized RAG function with query caching
 */
export async function answerFromRAGOptimized(query, pool, country = 'MY') {
  try {
    // Validate inputs
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (!pool) {
      throw new Error('Database pool is required');
    }

    // Create cache key for entire query
    const queryCacheKey = crypto.createHash('sha256')
      .update(`${query}:${country}`)
      .digest('hex');
    
    // Check query cache first
    const cached = queryCache.get(queryCacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      const fallbackResponse = {
        answer: "OpenAI API is not configured. Please set your OPENAI_API_KEY in the environment variables.",
        sources: [],
        error: "API_KEY_MISSING"
      };
      return fallbackResponse;
    }

    // Retrieve knowledge chunks
    const chunks = await retrieveKnowledgeChunksOptimized(query, pool, country);

    if (chunks.length === 0) {
      const noResultsResponse = {
        answer: `I don't have specific policy information for "${query}" in my knowledge base. Would you like me to create a compliance ticket for further investigation?`,
        sources: [],
        suggestion: "CREATE_TICKET"
      };
      return noResultsResponse;
    }

    // Generate AI-powered answer
    const answer = await generateAnswerOptimized(query, chunks, country);

    // Prepare lightweight source information
    const sources = chunks.map(chunk => ({
      id: chunk.id,
      title: chunk.title,
      section: chunk.section,
      similarity_score: parseFloat(chunk.similarity_score).toFixed(3),
      preview: chunk.text.slice(0, 150) + (chunk.text.length > 150 ? '...' : '')
    }));

    const result = {
      answer,
      sources,
      metadata: {
        chunks_retrieved: chunks.length,
        country,
        cached: false,
        response_time: Date.now()
      }
    };

    // Cache the result
    queryCache.set(queryCacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Clean cache periodically
    if (queryCache.size % 50 === 0) {
      cleanCache(queryCache);
    }

    return result;

  } catch (error) {
    console.error('Optimized RAG Error:', error);
    return {
      answer: "I encountered an error while processing your question. Please try again or contact support.",
      sources: [],
      error: error.message
    };
  }
}

/**
 * Warm up caches with common queries
 */
export async function warmupCache(pool, commonQueries = []) {
  const defaultQueries = [
    "What is the Strategic Trade Act 2010?",
    "What are the export control requirements?",
    "How to get STA permit?",
    "What is end user screening?",
    "AI chip export controls"
  ];
  
  const queries = [...defaultQueries, ...commonQueries];
  
  console.log('Warming up RAG cache with common queries...');
  
  const warmupPromises = queries.map(query => 
    answerFromRAGOptimized(query, pool).catch(err => 
      console.error(`Warmup failed for query: ${query}`, err)
    )
  );
  
  await Promise.all(warmupPromises);
  console.log(`Cache warmed up with ${queries.length} queries`);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    embeddings: {
      size: embeddingCache.size,
      maxSize: MAX_CACHE_SIZE
    },
    queries: {
      size: queryCache.size,
      maxSize: MAX_CACHE_SIZE
    },
    ttl: CACHE_TTL / 1000 / 60 // in minutes
  };
}

/**
 * Clear all caches
 */
export function clearCaches() {
  embeddingCache.clear();
  queryCache.clear();
  console.log('All caches cleared');
}

export { CONFIG as RAG_CONFIG_OPTIMIZED };