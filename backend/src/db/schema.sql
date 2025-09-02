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

-- IVFFLAT index for pgvector (requires ANALYZE and a list size setup)
CREATE INDEX IF NOT EXISTS idx_kn_emb ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_kn_country ON knowledge_chunks (country);
CREATE INDEX IF NOT EXISTS idx_kn_title ON knowledge_chunks (title);
ANALYZE knowledge_chunks;

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
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS quote_id UUID;

-- Add status tracking for step 1
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS step1_status VARCHAR(50) DEFAULT 'pending';

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

-- Customer Addresses Table
CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  label VARCHAR(50) NOT NULL,
  address_line_1 VARCHAR(200) NOT NULL,
  address_line_2 VARCHAR(200),
  postcode VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  country VARCHAR(2) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_billing_address BOOLEAN DEFAULT FALSE,
  is_shipping_address BOOLEAN DEFAULT TRUE,
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for customer addresses
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_active ON customer_addresses (customer_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_addresses_default ON customer_addresses (customer_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_addresses_shipping ON customer_addresses (customer_id, is_shipping_address, is_active) WHERE is_shipping_address = TRUE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_addresses_billing ON customer_addresses (customer_id, is_billing_address, is_active) WHERE is_billing_address = TRUE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_addresses_country ON customer_addresses (country);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_updated ON customer_addresses (updated_at DESC);

-- Create a function to ensure only one default address per customer
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting as default, unset other default addresses for the same customer
  IF NEW.is_default = TRUE THEN
    UPDATE customer_addresses 
    SET is_default = FALSE, updated_at = NOW()
    WHERE customer_id = NEW.customer_id 
      AND id != NEW.id 
      AND is_default = TRUE;
  END IF;
  
  -- Update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default address constraint
DROP TRIGGER IF EXISTS trigger_ensure_single_default_address ON customer_addresses;
CREATE TRIGGER trigger_ensure_single_default_address
  BEFORE INSERT OR UPDATE ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_address();

-- Add validation constraints
ALTER TABLE customer_addresses 
  ADD CONSTRAINT chk_label_length CHECK (LENGTH(TRIM(label)) >= 2 AND LENGTH(TRIM(label)) <= 50),
  ADD CONSTRAINT chk_address_line_1_length CHECK (LENGTH(TRIM(address_line_1)) >= 5 AND LENGTH(TRIM(address_line_1)) <= 200),
  ADD CONSTRAINT chk_address_line_2_length CHECK (address_line_2 IS NULL OR LENGTH(TRIM(address_line_2)) <= 200),
  ADD CONSTRAINT chk_postcode_length CHECK (LENGTH(TRIM(postcode)) >= 3 AND LENGTH(TRIM(postcode)) <= 20),
  ADD CONSTRAINT chk_city_length CHECK (LENGTH(TRIM(city)) >= 2 AND LENGTH(TRIM(city)) <= 100),
  ADD CONSTRAINT chk_state_length CHECK (LENGTH(TRIM(state)) >= 2 AND LENGTH(TRIM(state)) <= 100),
  ADD CONSTRAINT chk_country_code CHECK (LENGTH(country) = 2 AND country = UPPER(country)),
  ADD CONSTRAINT chk_contact_phone_format CHECK (contact_phone IS NULL OR contact_phone ~ '^[\+]?[1-9][\d\s\-\(\)]{7,20}$'),
  ADD CONSTRAINT chk_contact_email_format CHECK (contact_email IS NULL OR contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT chk_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD CONSTRAINT chk_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  ADD CONSTRAINT chk_address_type CHECK (is_shipping_address = TRUE OR is_billing_address = TRUE);

-- Create function to update timestamp on address updates
CREATE OR REPLACE FUNCTION update_address_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
DROP TRIGGER IF EXISTS trigger_update_address_timestamp ON customer_addresses;
CREATE TRIGGER trigger_update_address_timestamp
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_address_timestamp();
