# Knowledge Base Ingestion Guide

This guide explains how to ingest data from the `knowledge/` folder into the vector database for RAG (Retrieval-Augmented Generation) functionality.

## Overview

The GIFS Logistics Copilot includes a sophisticated knowledge ingestion system that can process various file formats and store them as embedded vectors in PostgreSQL with pgvector for semantic search.

## Supported File Formats

### 📄 Markdown (.md)
- Automatically detects document structure using headers
- Splits content into logical sections
- Preserves formatting and links
- Ideal for: Documentation, guides, procedures

### 📝 Text (.txt)
- Processes plain text documents
- Chunks content for optimal embedding size
- Extracts metadata from filenames
- Ideal for: Simple documents, regulations, forms

### 📋 PDF (.pdf)
- Extracts text content using pdf-parse
- Handles multi-page documents
- Preserves document title and structure
- Ideal for: Official documents, regulations, guidelines

### 🌐 HTML (.html, .htm)
- Extracts text content from web pages
- Removes HTML tags and formatting
- Preserves document title from `<title>` tag
- Ideal for: Web-scraped content, online resources

## Quick Start

### 1. Basic Ingestion
```bash
# Ingest all files from knowledge/ folder
docker-compose exec backend npm run ingest-knowledge
```

### 2. Fresh Start
```bash
# Clear existing data and ingest fresh
docker-compose exec backend npm run ingest-clear
```

### 3. View Statistics
```bash
# Check knowledge base statistics
docker-compose exec backend npm run ingest-stats
```

## Advanced Usage

### Command Line Options

The ingestion script supports various options:

```bash
# Show help
docker-compose exec backend node src/scripts/ingest-knowledge.js --help

# Clear existing data before ingesting
docker-compose exec backend node src/scripts/ingest-knowledge.js --clear

# Dry run (process files but don't store)
docker-compose exec backend node src/scripts/ingest-knowledge.js --dry-run

# Custom batch size (default: 10)
docker-compose exec backend node src/scripts/ingest-knowledge.js --batch-size 5

# Custom chunk size (default: 1000 characters)
docker-compose exec backend node src/scripts/ingest-knowledge.js --chunk-size 1500

# Override country detection
docker-compose exec backend node src/scripts/ingest-knowledge.js --country SG
```

### Configuration

The ingestion process can be configured by modifying `backend/src/services/knowledge-ingestion.js`:

```javascript
const INGESTION_CONFIG = {
  knowledgePath: path.join(process.cwd(), '../knowledge'),
  supportedExtensions: ['.md', '.txt', '.pdf', '.html', '.htm'],
  chunkSize: 1000,        // Target chunk size in characters
  chunkOverlap: 200,      // Overlap between chunks
  batchSize: 10,          // Files processed in parallel
  excludeFiles: ['.DS_Store', 'README.md']
};
```

## Content Processing

### Automatic Chunking

Documents are automatically split into chunks for optimal embedding:

- **Target Size**: 1000 characters (configurable)
- **Overlap**: 200 characters between chunks
- **Smart Splitting**: Breaks at sentence/paragraph boundaries
- **Minimum Size**: Chunks under 50 characters are skipped

### Metadata Extraction

The system automatically extracts metadata:

#### Country Detection
- **Malaysia (MY)**: Default, detected from "malaysia", "my" keywords
- **Singapore (SG)**: Detected from "singapore" keyword
- **Hong Kong (HK)**: Detected from "hong kong", "hk" keywords

#### Tag Generation
Automatically tags content based on keywords:

- `strategic`: Strategic trade, STA, strategic trade act
- `customs`: Customs, kastam, JKDM
- `export`: Export procedures, eksport
- `import`: Import procedures
- `permit`: Permits, licenses, ePermit
- `documentation`: Forms, K1, K2, K3, K8, K9
- `ai-chips`: AI chips, semiconductors, artificial intelligence
- `screening`: End user screening, sanctioned entities
- `sirim`: SIRIM certification
- `procedure`: Guidelines, procedures, panduan

#### Category Assignment
- `strategic-trade`: Strategic trade and AI chip content
- `customs`: Customs and documentation content  
- `procedures`: Procedural guidelines
- `certification`: SIRIM and certification content
- `general`: Other content

### Section Processing

For Markdown files, the system:
- Detects header structure (`#`, `##`, `###`)
- Creates sections based on headings
- Preserves section hierarchy
- Generates meaningful section titles

## Database Schema

Processed content is stored in the `knowledge_chunks` table:

```sql
CREATE TABLE knowledge_chunks (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  section text DEFAULT '',
  country text DEFAULT 'MY',
  tags text[] DEFAULT '{}',
  text text NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Indexes

The system creates optimized indexes:

```sql
-- Vector similarity search
CREATE INDEX idx_kn_emb ON knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Country filtering
CREATE INDEX idx_kn_country ON knowledge_chunks (country);

-- Tag search
CREATE INDEX idx_kn_tags ON knowledge_chunks USING GIN (tags);

-- Time-based queries
CREATE INDEX idx_kn_created ON knowledge_chunks (created_at);
```

## Monitoring and Statistics

### Real-time Progress

During ingestion, you'll see:
```
📄 Processing: export_procedure.md
✅ export_procedure.md: 3 chunks stored
📈 Progress: 5/23 files
```

### Final Statistics
```
🎉 Ingestion completed!
📊 Statistics:
   Files processed: 23
   Chunks stored: 156
   Files skipped: 1
   Errors: 0
   Duration: 45.23s
   Chunks per second: 3.45
```

### Database Statistics

View detailed statistics:
```bash
docker-compose exec backend npm run ingest-stats
```

Output includes:
- Total chunks and countries
- Unique tags and usage
- Average chunk sizes
- Content distribution
- Top tags by frequency

## Testing

### Test Ingestion
```bash
# Test the complete pipeline
docker-compose exec backend node test-ingestion.js
```

### Test Queries

After ingestion, test with queries like:
- "What is the Strategic Trade Act 2010?"
- "What are the export procedures in Malaysia?"
- "What customs forms are required?"
- "How do I get an export permit?"

## Performance Optimization

### Batch Processing
- Files are processed in parallel batches
- Default batch size: 10 files
- Adjust based on system resources

### Embedding Optimization
- Uses OpenAI's text-embedding-3-small (1536 dimensions)
- Caches embeddings to avoid regeneration
- Handles API rate limits gracefully

### Database Performance
- IVFFLAT indexes for vector similarity
- GIN indexes for array searches
- Regular ANALYZE for query optimization

## Troubleshooting

### Common Issues

#### "OpenAI API key not configured"
- Set `OPENAI_API_KEY` in backend/.env
- System will use fake embeddings as fallback

#### "Knowledge folder not found"
- Ensure `knowledge/` folder exists in project root
- Check file permissions

#### "PDF parsing failed"
- Install pdf-parse dependency: `npm install pdf-parse`
- Check PDF file is not corrupted or password-protected

#### "Vector dimension mismatch"
- Database schema must match embedding model dimensions
- Run database migration if needed

#### "No chunks found for query"
- Check if ingestion completed successfully
- Verify OpenAI embeddings are working
- Try different query phrasing

### Debug Mode

Enable verbose logging:
```bash
DEBUG=knowledge:* docker-compose exec backend npm run ingest-knowledge
```

### Performance Issues

If ingestion is slow:
1. Reduce batch size: `--batch-size 5`
2. Check OpenAI API rate limits
3. Monitor database performance
4. Ensure sufficient system resources

## Best Practices

### File Organization
- Use descriptive filenames
- Include country codes in filenames when relevant
- Organize by topic/category
- Keep file sizes reasonable (< 10MB for PDFs)

### Content Quality
- Ensure text is readable and well-formatted
- Remove unnecessary formatting
- Use clear headings in Markdown
- Include relevant keywords for better tagging

### Regular Maintenance
- Re-ingest when content changes
- Monitor database size and performance
- Update embeddings when changing models
- Archive old or outdated content

## Integration with RAG

Once ingested, the knowledge base powers the RAG system:

1. **Query Processing**: User queries are embedded using the same model
2. **Similarity Search**: pgvector finds most relevant chunks
3. **Context Assembly**: Retrieved chunks provide context
4. **Answer Generation**: OpenAI generates contextual responses
5. **Source Citation**: Original sources are provided with answers

The ingested knowledge directly improves the quality and accuracy of AI-generated responses in the logistics copilot system.

## API Integration

The ingested knowledge can be accessed programmatically:

```javascript
import { answerFromRAG } from './backend/src/services/rag.js';

const result = await answerFromRAG(
  "What are the export requirements for semiconductors?",
  pool,
  "MY"
);

console.log(result.answer);
console.log(result.sources);
```

This enables integration with other systems and custom applications built on top of the knowledge base.
