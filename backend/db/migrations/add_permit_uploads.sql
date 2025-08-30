-- Add permit and insurance document upload tracking
-- Run this migration to add file upload support

-- Add columns to strategic_audit_trail for uploaded documents
ALTER TABLE strategic_audit_trail 
ADD COLUMN uploaded_permits JSONB DEFAULT '{}',
ADD COLUMN insurance_document_path TEXT,
ADD COLUMN permit_documents JSONB DEFAULT '{}',
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create permit_uploads table to track individual permit uploads
CREATE TABLE IF NOT EXISTS permit_uploads (
    id SERIAL PRIMARY KEY,
    shipment_id UUID NOT NULL,
    permit_type VARCHAR(50) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    validation_result JSONB,
    created_by VARCHAR(100),
    CONSTRAINT fk_permit_uploads_shipment 
        FOREIGN KEY (shipment_id) 
        REFERENCES shipments(id) 
        ON DELETE CASCADE,
    UNIQUE(shipment_id, permit_type)
);

-- Create insurance_documents table
CREATE TABLE IF NOT EXISTS insurance_documents (
    id SERIAL PRIMARY KEY,
    shipment_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    insurance_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    validation_result JSONB,
    created_by VARCHAR(100),
    CONSTRAINT fk_insurance_documents_shipment 
        FOREIGN KEY (shipment_id) 
        REFERENCES shipments(id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_permit_uploads_shipment_id ON permit_uploads(shipment_id);
CREATE INDEX idx_permit_uploads_permit_type ON permit_uploads(permit_type);
CREATE INDEX idx_insurance_documents_shipment_id ON insurance_documents(shipment_id);

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_strategic_audit_trail_updated_at 
    BEFORE UPDATE ON strategic_audit_trail 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add sample permit types
INSERT INTO permit_uploads (shipment_id, permit_type, original_filename, file_path, status) 
VALUES 
('00000000-0000-0000-0000-000000000000', 'STA_2010', 'sample.pdf', '/uploads/permits/sample.pdf', 'sample')
ON CONFLICT (shipment_id, permit_type) DO NOTHING;
