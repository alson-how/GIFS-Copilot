#!/bin/bash

# GIFS Logistics Copilot - Docker Setup Script
echo "🚀 Setting up GIFS Logistics Copilot with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment files from examples
echo "📝 Creating environment files..."
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env

echo "✅ Environment files created."
echo ""
echo "🔑 IMPORTANT: Configure your OpenAI API key for RAG functionality:"
echo "   1. Edit backend/.env"
echo "   2. Set OPENAI_API_KEY=your_actual_api_key"
echo "   3. Without this, AI features will use fallback responses"
echo ""
echo "📝 Other configuration files:"
echo "   - backend/.env for backend configuration"
echo "   - frontend/.env for frontend configuration"

# Build and start services
echo "🏗️  Building and starting Docker services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
if docker-compose ps | grep -q "Up (healthy)"; then
    echo "✅ Services are running and healthy!"
    echo ""
    echo "🌐 Your GIFS Logistics Copilot is now running:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8080"
    echo "   Database: localhost:5432"
    echo ""
    echo "📊 To check service status: docker-compose ps"
    echo "📋 To view logs: docker-compose logs -f"
    echo "🛑 To stop services: docker-compose down"
    echo ""
    echo "🧠 To enable AI features with real data, ingest the knowledge folder:"
    echo "   docker-compose exec backend npm run ingest-knowledge"
    echo ""
    echo "📊 To view knowledge base statistics:"
    echo "   docker-compose exec backend npm run ingest-stats"
    echo ""
    echo "🧪 To test RAG functionality:"
    echo "   docker-compose exec backend node test-ingestion.js"
else
    echo "⚠️  Some services may not be fully ready yet. Check logs with:"
    echo "   docker-compose logs"
fi

echo ""
echo "🎉 Setup complete! Your AI Logistics Copilot is ready to use."
echo ""
echo "📚 Next steps:"
echo "1. Set your OpenAI API key in backend/.env"
echo "2. Ingest knowledge data: docker-compose exec backend npm run ingest-knowledge"
echo "3. Test the system: curl 'http://localhost:8080/api/policy/answer?q=What%20is%20the%20Strategic%20Trade%20Act?'"
echo "4. View knowledge stats: docker-compose exec backend npm run ingest-stats"
