-- Enable pgvector (run as superuser once)
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS shipments (
  shipment_id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_records (
  shipment_id uuid PRIMARY KEY REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  hs_code text,
  product_type text,
  tech_origin text,
  is_strategic boolean,
  extraction_json jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_chip_control (
  shipment_id uuid PRIMARY KEY REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  aica_done boolean,
  export_notice_30d boolean,
  reexport_license_needed text,
  reexport_license_number text,
  sta_permit_ai boolean,
  sta_permit_ai_number text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS end_user_screening (
  shipment_id uuid PRIMARY KEY REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  destination_country text,
  end_user_name text,
  screen_result text,
  evidence text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  shipment_id uuid PRIMARY KEY REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  hs_code text,
  hs_validated boolean,
  pco_number text,
  k2_ready boolean,
  permit_refs text[],
  updated_at timestamptz DEFAULT now()
);

-- Knowledge base for RAG
-- Using text-embedding-3-small dimension (1536)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  section text DEFAULT '',
  country text DEFAULT 'MY',
  tags text[] DEFAULT '{}',
  text text NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optional: IVFFLAT index for pgvector (requires ANALYZE and a list size setup)
-- CREATE INDEX IF NOT EXISTS idx_kn_emb ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX IF NOT EXISTS idx_kn_country ON knowledge_chunks (country);

-- Add columns for step 1 (shipment basics)
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS export_date date,
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS hs_code text,
  ADD COLUMN IF NOT EXISTS tech_origin text,
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS end_user_name text;

CREATE TABLE IF NOT EXISTS shipment_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  tag text,                              -- 'datasheet' | 'po' | 'proforma' | 'previous_docs' | 'other'
  original_name text,
  mime_type text,
  file_path text,                        -- server path or object storage URL
  size_bytes integer,
  uploaded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipment_files_shipment ON shipment_files (shipment_id);

-- Add missing critical fields to shipment table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS commercial_value DECIMAL(15,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(20);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS incoterms VARCHAR(10);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS end_use_purpose VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS insurance_required BOOLEAN DEFAULT true;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS consignee_registration VARCHAR(50);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_priority VARCHAR(20) DEFAULT 'Standard';

-- Document extraction tracking table for OCR service
CREATE TABLE IF NOT EXISTS document_extractions (
  document_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  document_type text NOT NULL,           -- 'Commercial Invoice', 'Bill of Lading', etc.
  confidence integer NOT NULL,           -- OCR/extraction confidence (0-100)
  extraction_method text NOT NULL,       -- 'pdf-parse', 'ocr', 'hybrid'
  extracted_fields jsonb NOT NULL,       -- JSON object with extracted field values
  raw_text text,                        -- Full extracted text for debugging
  processing_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_document_extractions_shipment ON document_extractions (shipment_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_type ON document_extractions (document_type);
CREATE INDEX IF NOT EXISTS idx_document_extractions_confidence ON document_extractions (confidence DESC);
CREATE INDEX IF NOT EXISTS idx_document_extractions_date ON document_extractions (processing_date DESC);
