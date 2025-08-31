-- V2 File Upload System Migration
-- Create shipment_files table for enhanced file upload system

-- =====================================================
-- CREATE SHIPMENT_FILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS shipment_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id VARCHAR(255) NOT NULL,
    
    -- File information
    original_name TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    
    -- File categorization
    tag VARCHAR(100) DEFAULT 'other', -- 'invoice', 'permit', 'other', etc.
    
    -- Upload metadata
    upload_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for shipment_files
CREATE INDEX IF NOT EXISTS idx_shipment_files_shipment_id ON shipment_files(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_files_tag ON shipment_files(tag);
CREATE INDEX IF NOT EXISTS idx_shipment_files_uploaded_at ON shipment_files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_shipment_files_mime_type ON shipment_files(mime_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shipment_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shipment_files_updated_at ON shipment_files;
CREATE TRIGGER trigger_shipment_files_updated_at
    BEFORE UPDATE ON shipment_files
    FOR EACH ROW EXECUTE FUNCTION update_shipment_files_updated_at();

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'V2 File Upload System migration completed successfully';
    RAISE NOTICE 'Created table: shipment_files with enhanced features';
END $$;