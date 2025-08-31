-- Create permit_documents table for storing uploaded permit documents with OCR data
CREATE TABLE IF NOT EXISTS permit_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- OCR extracted fields
    permit_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(200),
    permit_type VARCHAR(100),
    
    -- OCR metadata
    ocr_confidence DECIMAL(3,2),
    ocr_raw_text TEXT,
    ocr_extracted_fields JSONB,
    
    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_permit_documents_permit_number ON permit_documents(permit_number);
CREATE INDEX IF NOT EXISTS idx_permit_documents_uploaded_at ON permit_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_permit_documents_expiry_date ON permit_documents(expiry_date);

-- Add comments for documentation
COMMENT ON TABLE permit_documents IS 'Stores uploaded permit documents with OCR extracted information';
COMMENT ON COLUMN permit_documents.document_id IS 'Unique identifier for the permit document';
COMMENT ON COLUMN permit_documents.permit_number IS 'OCR extracted permit number';
COMMENT ON COLUMN permit_documents.issue_date IS 'OCR extracted issue date';
COMMENT ON COLUMN permit_documents.expiry_date IS 'OCR extracted expiry date';
COMMENT ON COLUMN permit_documents.ocr_extracted_fields IS 'Complete OCR extraction results in JSON format';
