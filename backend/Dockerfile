FROM node:18-alpine

WORKDIR /app

# Install system dependencies for OCR, PDF processing, and Puppeteer
RUN apk add --no-cache \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    imagemagick \
    ghostscript \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# No additional dependencies needed for PDFKit-only approach

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN echo "registry=https://registry.npmjs.org/" > .npmrc && \
    echo "strict-ssl=false" >> .npmrc && \
    rm -f package-lock.json && \
    npm install && \
    mkdir -p ./test/data && \
    echo "%PDF-1.4" > ./test/data/05-versions-space.pdf

# Copy backend source code
COPY backend/ .

# Copy config folder
COPY config/ /config/

# Copy knowledge folder
COPY knowledge/ /knowledge/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
