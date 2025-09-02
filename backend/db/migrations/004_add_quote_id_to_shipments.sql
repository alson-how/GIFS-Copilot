-- Migration: Add quote_id to shipments table for quote tracking
-- This allows shipments to store a reference to their associated quote

-- Add quote_id column to shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS quote_id UUID;

-- Add index for better query performance when looking up shipments by quote_id
CREATE INDEX IF NOT EXISTS idx_shipments_quote_id ON shipments(quote_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN shipments.quote_id IS 'Reference to the primary quote ID for this shipment';

-- Update existing shipments with QUOTED status to potentially link to existing quotes
-- This would need to be run manually if there are existing quotes to link
-- UPDATE shipments SET quote_id = (
--   SELECT id FROM quotes WHERE shipment_id = shipments.shipment_id LIMIT 1
-- ) WHERE status = 'QUOTED' AND quote_id IS NULL;