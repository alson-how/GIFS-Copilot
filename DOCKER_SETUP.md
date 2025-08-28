# GIFS Logistics Copilot - Docker Setup Guide

This guide will help you set up and run the GIFS Logistics Copilot using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 1.29 or higher)

## Quick Start

1. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Database: localhost:5432

## Manual Setup

If you prefer to set up manually:

1. **Create environment files:**
   ```bash
   cp backend/env.example backend/.env
   cp frontend/env.example frontend/.env
   ```

2. **Build and start services:**
   ```bash
   docker-compose up -d --build
   ```

## Services Overview

### PostgreSQL Database (`postgres`)
- **Image:** pgvector/pgvector:pg16
- **Port:** 5432
- **Database:** gifs_logistics
- **User:** gifs_user
- **Features:** pgvector extension for RAG functionality

### Backend API (`backend`)
- **Technology:** Node.js with Express
- **Port:** 8080
- **Features:** 
  - RESTful API for compliance and policy management
  - RAG (Retrieval-Augmented Generation) capabilities
  - Database integration with PostgreSQL

### Frontend (`frontend`)
- **Technology:** React with Vite
- **Port:** 3000
- **Features:**
  - Modern React UI
  - Nginx reverse proxy for API calls
  - Production-optimized build

## Environment Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
# Database Configuration
DATABASE_URL=postgresql://gifs_user:gifs_password@postgres:5432/gifs_logistics

# Server Configuration
PORT=8080
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGIN=http://localhost:3000

# OpenAI Configuration (REQUIRED for RAG functionality)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# RAG Configuration
RAG_MAX_CHUNKS=5
RAG_SIMILARITY_THRESHOLD=0.7
```

**⚠️ Important:** You must set a valid OpenAI API key for the RAG (Retrieval-Augmented Generation) functionality to work properly. Without it, the system will use fallback responses.

### Frontend Environment Variables

Edit `frontend/.env`:

```env
# API Configuration
VITE_API=http://localhost:8080
```

## Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Check Service Status
```bash
docker-compose ps
```

### Rebuild Services
```bash
docker-compose up -d --build
```

### Reset Everything (Clean Slate)
```bash
docker-compose down -v --remove-orphans
docker-compose up -d --build
```

## Database Management

### Access Database
```bash
docker-compose exec postgres psql -U gifs_user -d gifs_logistics
```

### Backup Database
```bash
docker-compose exec postgres pg_dump -U gifs_user gifs_logistics > backup.sql
```

### Restore Database
```bash
docker-compose exec -T postgres psql -U gifs_user -d gifs_logistics < backup.sql
```

## API Endpoints

Once running, the following endpoints are available:

- `GET /health` - Health check
- `POST /api/compliance/sta-screening` - STA screening
- `POST /api/compliance/ai-chip` - AI chip compliance
- `POST /api/compliance/screening` - End user screening
- `POST /api/compliance/docs` - Document management
- `GET /api/policy/answer?q=...` - RAG policy queries (AI-powered)

### RAG (AI) Endpoints

The system includes advanced AI-powered features using OpenAI:

- **Policy Queries**: `GET /api/policy/answer?q=your-question`
  - Ask natural language questions about logistics compliance
  - Returns AI-generated answers based on knowledge base
  - Includes source citations and similarity scores

Example queries:
- "What are the requirements for exporting AI chips?"
- "How do I conduct end user screening?"
- "What documentation is needed for semiconductor exports?"

## Knowledge Base Management

The system includes a knowledge base for RAG functionality:

### Ingest Knowledge Folder
```bash
# Ingest all files from the knowledge/ folder
docker-compose exec backend npm run ingest-knowledge

# Clear existing data and ingest fresh
docker-compose exec backend npm run ingest-clear

# View knowledge base statistics
docker-compose exec backend npm run ingest-stats
```

### Seed Sample Data (Alternative)
```bash
# Populate with pre-defined sample data (smaller dataset)
docker-compose exec backend npm run seed-knowledge
```

### Clear Knowledge Base
```bash
# Clear all existing knowledge chunks
docker-compose exec backend npm run clear-knowledge
```

### Test RAG Functionality
```bash
# Run RAG tests with ingested knowledge
docker-compose exec backend node test-ingestion.js

# Run basic RAG tests (requires OpenAI API key)
docker-compose exec backend node test-rag.js
```

### Supported File Formats

The ingestion system supports:
- **Markdown (.md)**: Structured documents with sections
- **Text (.txt)**: Plain text documents  
- **PDF (.pdf)**: Portable Document Format files
- **HTML (.html, .htm)**: Web pages and formatted documents

Files are automatically:
- Parsed and chunked for optimal embedding
- Tagged based on content and filename
- Assigned to appropriate countries (MY, SG, HK)
- Stored with metadata for better retrieval

## Troubleshooting

### Services Not Starting
1. Check if ports 3000, 8080, and 5432 are available
2. Verify Docker and Docker Compose are installed
3. Check logs: `docker-compose logs`

### Database Connection Issues
1. Wait for PostgreSQL to fully initialize (can take 30-60 seconds)
2. Check database health: `docker-compose exec postgres pg_isready -U gifs_user`
3. Verify environment variables in backend/.env

### Frontend Not Loading
1. Ensure backend is healthy: `curl http://localhost:8080/health`
2. Check nginx configuration in frontend/nginx.conf
3. Verify VITE_API environment variable

### Performance Issues
1. Allocate more memory to Docker (recommended: 4GB+)
2. Use SSD storage for better I/O performance
3. Monitor resource usage: `docker stats`

## Development Mode

For development with hot reload:

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Database only:**
   ```bash
   docker-compose up -d postgres
   ```

## Security Considerations

For production deployment:

1. Change default database credentials
2. Use environment-specific configurations
3. Enable HTTPS with proper SSL certificates
4. Implement proper authentication and authorization
5. Use secrets management for API keys
6. Regular security updates for base images

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify all prerequisites are met
3. Ensure no other services are using the required ports
4. Try a clean restart: `docker-compose down -v && docker-compose up -d --build`
