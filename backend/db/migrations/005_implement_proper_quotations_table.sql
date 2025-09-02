-- Migration: Implement proper quotations table with one-to-many relationship
-- This creates a comprehensive quotation system where:
-- 1. One shipment can have multiple quotations
-- 2. Only one confirmed quotation per shipment (enforced by trigger)
-- 3. Shipments table tracks the confirmed quotation via confirmed_quotation_id

-- Drop the simple quote_id column from previous migration
ALTER TABLE shipments DROP COLUMN IF EXISTS quote_id;

-- Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Quote details
    total_cost DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Breakdown of costs
    base_shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    additional_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Quote metadata
    valid_until TIMESTAMP NOT NULL,
    is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    quotation_method VARCHAR(20) NOT NULL DEFAULT 'MANUAL', -- MANUAL, AI_GENERATED
    
    -- AI generation details (if applicable)
    ai_model VARCHAR(50),
    ai_prompt_version VARCHAR(20),
    ai_generation_metadata JSONB,
    
    -- Quote options and details
    carrier VARCHAR(100),
    service_type VARCHAR(100),
    estimated_delivery_days INTEGER,
    quote_breakdown JSONB, -- Detailed cost breakdown
    notes TEXT,
    
    -- Tracking
    created_by UUID, -- Admin user who created/generated the quote
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_quotations_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

-- Add confirmed_quotation_id to shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS confirmed_quotation_id UUID;

-- Add foreign key constraint for confirmed quotation
ALTER TABLE shipments 
ADD CONSTRAINT fk_shipments_confirmed_quotation 
FOREIGN KEY (confirmed_quotation_id) REFERENCES quotations(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotations_shipment_id ON quotations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_quotations_is_confirmed ON quotations(is_confirmed);
CREATE INDEX IF NOT EXISTS idx_quotations_valid_until ON quotations(valid_until);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at);
CREATE INDEX IF NOT EXISTS idx_shipments_confirmed_quotation_id ON shipments(confirmed_quotation_id);

-- Create trigger function to enforce single confirmed quotation per shipment
CREATE OR REPLACE FUNCTION enforce_single_confirmed_quotation()
RETURNS TRIGGER AS $$
BEGIN
    -- If this quotation is being confirmed (is_confirmed = true)
    IF NEW.is_confirmed = TRUE THEN
        -- First, unconfirm any other quotations for this shipment
        UPDATE quotations 
        SET is_confirmed = FALSE 
        WHERE shipment_id = NEW.shipment_id 
        AND id != NEW.id 
        AND is_confirmed = TRUE;
        
        -- Update the shipment's confirmed_quotation_id to this quotation
        UPDATE shipments 
        SET confirmed_quotation_id = NEW.id,
            status = CASE 
                WHEN status = 'PENDING_QUOTE' THEN 'QUOTED'
                ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE shipment_id = NEW.shipment_id;
        
    -- If this quotation is being unconfirmed (is_confirmed changed from true to false)
    ELSIF OLD.is_confirmed = TRUE AND NEW.is_confirmed = FALSE THEN
        -- Clear the confirmed_quotation_id from shipments if it matches this quotation
        UPDATE shipments 
        SET confirmed_quotation_id = NULL,
            status = CASE 
                WHEN status = 'QUOTED' THEN 'PENDING_QUOTE'
                ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE shipment_id = NEW.shipment_id 
        AND confirmed_quotation_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_enforce_single_confirmed_quotation ON quotations;
CREATE TRIGGER trigger_enforce_single_confirmed_quotation
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_confirmed_quotation();

-- Create trigger for quotation deletion to clean up shipment references
CREATE OR REPLACE FUNCTION handle_quotation_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- If the deleted quotation was the confirmed one, clear it from shipment
    UPDATE shipments 
    SET confirmed_quotation_id = NULL,
        status = CASE 
            WHEN status = 'QUOTED' THEN 'PENDING_QUOTE'
            ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE confirmed_quotation_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the deletion trigger
DROP TRIGGER IF EXISTS trigger_handle_quotation_deletion ON quotations;
CREATE TRIGGER trigger_handle_quotation_deletion
    AFTER DELETE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION handle_quotation_deletion();

-- Add comments for documentation
COMMENT ON TABLE quotations IS 'Stores quotations for shipments with one-to-many relationship';
COMMENT ON COLUMN quotations.shipment_id IS 'Reference to the shipment this quotation belongs to';
COMMENT ON COLUMN quotations.is_confirmed IS 'Whether this quotation is the confirmed/selected one for the shipment';
COMMENT ON COLUMN quotations.quote_number IS 'Unique human-readable quote identifier';
COMMENT ON COLUMN quotations.quotation_method IS 'How this quote was generated (MANUAL or AI_GENERATED)';
COMMENT ON COLUMN quotations.quote_breakdown IS 'JSON object containing detailed cost breakdown';
COMMENT ON COLUMN shipments.confirmed_quotation_id IS 'Reference to the confirmed quotation for this shipment';

-- Generate quote numbers for any existing data (if needed)
-- This would be run manually if there are existing quotes to migrate
-- INSERT INTO quotations (shipment_id, quote_number, total_cost, currency, valid_until, quotation_method)
-- SELECT 
--     shipment_id,
--     'Q-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0'),
--     0.00, -- Would need to calculate from existing data
--     'USD',
--     CURRENT_TIMESTAMP + INTERVAL '30 days',
--     'MANUAL'
-- FROM shipments 
-- WHERE status IN ('QUOTED', 'ACCEPTED');