-- Add document generation paths to shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS packing_list_path VARCHAR(500);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS booking_confirmation_path VARCHAR(500);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customs_declaration_path VARCHAR(500);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bill_of_lading_path VARCHAR(500);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS documents_generated_at TIMESTAMP;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shipments_documents_generated ON shipments(documents_generated_at);

-- Add comments for documentation
COMMENT ON COLUMN shipments.packing_list_path IS 'File path to generated packing list PDF';
COMMENT ON COLUMN shipments.booking_confirmation_path IS 'File path to generated booking confirmation PDF';
COMMENT ON COLUMN shipments.customs_declaration_path IS 'File path to generated customs declaration PDF';
COMMENT ON COLUMN shipments.bill_of_lading_path IS 'File path to generated bill of lading PDF';
COMMENT ON COLUMN shipments.documents_generated_at IS 'Timestamp when documents were last generated';
