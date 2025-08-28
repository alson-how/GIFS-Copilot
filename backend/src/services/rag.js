/**
 * RAG service using OpenAI embeddings and chat completion with pgvector
 * Handles knowledge retrieval and answer generation for logistics compliance
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
  maxChunks: parseInt(process.env.RAG_MAX_CHUNKS) || 5,
  similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD) || 0.7,
  embeddingDimension: 1536, // text-embedding-3-small dimension
};

/**
 * Generate embeddings using OpenAI
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
async function generateEmbedding(text) {
  if (!openai) {
    console.warn('OpenAI client not initialized, using fake embeddings');
    return fakeEmbed(text);
  }
  
  try {
    const response = await openai.embeddings.create({
      model: CONFIG.embeddingModel,
      input: text.trim(),
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback to fake embedding if OpenAI fails
    return fakeEmbed(text);
  }
}

/**
 * Fallback fake embedding function (for development/testing)
 * @param {string} text - Text to embed
 * @returns {number[]} - Fake embedding vector
 */
function fakeEmbed(text) {
  const bytes = crypto.createHash('sha256').update(text).digest();
  const arr = Array.from(bytes.slice(0, 64)).map(b => (b - 128) / 128);
  // Pad to match embedding dimension for consistency
  while (arr.length < CONFIG.embeddingDimension) {
    arr.push(0);
  }
  return arr.slice(0, CONFIG.embeddingDimension);
}

/**
 * Retrieve relevant knowledge chunks from the database
 * @param {string} query - Search query
 * @param {object} pool - Database connection pool
 * @param {string} country - Country filter (default: 'MY')
 * @returns {Promise<object[]>} - Array of relevant chunks
 */
async function retrieveKnowledgeChunks(query, pool, country = 'MY') {
  try {
    const embedding = await generateEmbedding(query);
    
    // Query with cosine similarity using pgvector
  const sql = `
      SELECT 
        id, 
        title, 
        section, 
        text, 
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
      `[${embedding.join(',')}]`, // Convert to PostgreSQL vector format
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
 * Generate contextual answer using OpenAI Chat Completion
 * @param {string} query - User query
 * @param {object[]} chunks - Retrieved knowledge chunks
 * @param {string} country - Country context
 * @returns {Promise<string>} - Generated answer
 */
async function generateAnswer(query, chunks, country = 'MY') {
  if (!openai) {
    // Fallback response when OpenAI is not available
    const context = chunks.map(chunk => 
      `**${chunk.title}**:\n${chunk.text.slice(0, 200)}...`
    ).join('\n\n');
    
    return `Based on the available information:\n\n${context}\n\nNote: OpenAI API is not configured. For AI-powered responses, please set your OPENAI_API_KEY environment variable.`;
  }
  
  try {
    // Prepare context from retrieved chunks
    const context = chunks.map(chunk => 
      `**${chunk.title}** (Section ${chunk.section}):\n${chunk.text}`
    ).join('\n\n');
    
    // System prompt for logistics compliance
    const systemPrompt = `You are an AI assistant specializing in logistics and export compliance for ${country === 'MY' ? 'Malaysia' : country}. 

Your role is to provide accurate, helpful information about:
- Export regulations and compliance requirements
- Semiconductor export controls
- End-user screening procedures  
- Documentation requirements
- Strategic trade authorization (STA)
- AI chip controls and licensing

Guidelines:
1. Base your answers primarily on the provided knowledge context
2. Be specific and cite relevant sections when possible
3. If information is incomplete, acknowledge limitations
4. Provide actionable guidance when appropriate
5. Use clear, professional language suitable for logistics professionals
6. If no relevant information is found, suggest creating a compliance ticket

Context Knowledge:
${context}`;

    const userPrompt = `Question: ${query}

Please provide a comprehensive answer based on the knowledge context provided. If the context doesn't contain sufficient information to answer the question, please indicate what additional information might be needed.`;

    const response = await openai.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
  } catch (error) {
    console.error('Error generating answer:', error);
    return 'I encountered an error while processing your question. Please try again or contact support if the issue persists.';
  }
}

/**
 * Main RAG function - retrieves knowledge and generates answers
 * @param {string} query - User query
 * @param {object} pool - Database connection pool
 * @param {string} country - Country filter (default: 'MY')
 * @returns {Promise<object>} - Answer and sources
 */
export async function answerFromRAG(query, pool, country = 'MY') {
  try {
    // Validate inputs
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (!pool) {
      throw new Error('Database pool is required');
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.warn('OpenAI API key not configured, using fallback responses');
      return {
        answer: "OpenAI API is not configured. Please set your OPENAI_API_KEY in the environment variables to enable AI-powered responses.",
        sources: [],
        error: "API_KEY_MISSING"
      };
    }

    // Retrieve relevant knowledge chunks
    const chunks = await retrieveKnowledgeChunks(query, pool, country);

    if (chunks.length === 0) {
      return {
        answer: `I don't have specific policy information for "${query}" in my knowledge base. This might be because:

1. The information hasn't been added to the knowledge base yet
2. The query doesn't match existing content closely enough
3. The information might be available for a different country

Would you like me to create a compliance ticket for further investigation, or could you try rephrasing your question?`,
        sources: [],
        suggestion: "CREATE_TICKET"
      };
    }

    // Generate AI-powered answer
    const answer = await generateAnswer(query, chunks, country);

    // Prepare source information
    const sources = chunks.map(chunk => ({
      id: chunk.id,
      title: chunk.title,
      section: chunk.section,
      similarity_score: parseFloat(chunk.similarity_score).toFixed(3),
      tags: chunk.tags || [],
      preview: chunk.text.slice(0, 200) + (chunk.text.length > 200 ? '...' : '')
    }));

    return {
      answer,
      sources,
      metadata: {
        chunks_retrieved: chunks.length,
        country,
        model_used: CONFIG.chatModel,
        embedding_model: CONFIG.embeddingModel
      }
    };

  } catch (error) {
    console.error('RAG Error:', error);
    return {
      answer: "I encountered an error while processing your question. Please try again or contact support if the issue persists.",
      sources: [],
      error: error.message
    };
  }
}

/**
 * Store knowledge chunk with embedding
 * @param {object} chunk - Knowledge chunk data
 * @param {object} pool - Database connection pool
 * @returns {Promise<string>} - Chunk ID
 */
export async function storeKnowledgeChunk(chunk, pool) {
  try {
    const { title, section, text, country = 'MY', tags = [] } = chunk;
    
    if (!title || !text) {
      throw new Error('Title and text are required');
    }

    // Generate embedding for the text
    const embedding = await generateEmbedding(text);
    const chunkId = crypto.randomUUID();

    const sql = `
      INSERT INTO knowledge_chunks (id, title, section, country, tags, text, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
      RETURNING id`;

    const result = await pool.query(sql, [
      chunkId,
      title,
      section || '',
      country,
      tags,
      text,
      `[${embedding.join(',')}]`
    ]);

    return result.rows[0].id;
  } catch (error) {
    console.error('Error storing knowledge chunk:', error);
    throw error;
  }
}

/**
 * Update database schema to support proper embedding dimensions
 * @param {object} pool - Database connection pool
 * @returns {Promise<void>}
 */
export async function updateEmbeddingSchema(pool) {
  try {
    const sql = `
      -- Update embedding column to correct dimension
      ALTER TABLE knowledge_chunks 
      ALTER COLUMN embedding TYPE vector(${CONFIG.embeddingDimension});
      
      -- Create or update index for better performance
      DROP INDEX IF EXISTS idx_kn_emb;
      CREATE INDEX idx_kn_emb ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
      
      -- Analyze table for better query planning
      ANALYZE knowledge_chunks;
    `;
    
    await pool.query(sql);
    console.log('Embedding schema updated successfully');
  } catch (error) {
    console.error('Error updating embedding schema:', error);
    // Don't throw - this is a maintenance operation
  }
}

export { CONFIG as RAG_CONFIG };