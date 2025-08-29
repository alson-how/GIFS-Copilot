-- Strategic Items Detection & Permit Enforcement System (FIXED)
-- Malaysian Strategic Trade Act 2010 Compliance Database Schema

-- Drop existing tables if they exist (for clean install)
DROP TABLE IF EXISTS strategic_audit_trail CASCADE;
DROP TABLE IF EXISTS strategic_manual_review_queue CASCADE;
DROP TABLE IF EXISTS export_validation_log CASCADE;
DROP TABLE IF EXISTS permit_uploads CASCADE;
DROP TABLE IF EXISTS strategic_detection_results CASCADE;

-- Strategic Items RAG Database with Vector Embeddings (already created)
-- CREATE TABLE strategic_items_rag - already exists

-- Detection Results with Export Blocking
CREATE TABLE strategic_detection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id),
    product_item_id UUID, -- Reference to specific product item
    item_description TEXT NOT NULL,
    hs_code VARCHAR(20),
    detection_layers JSONB NOT NULL, -- Results from all 5 detection layers
    final_confidence_score INTEGER NOT NULL, -- 0-100
    is_strategic BOOLEAN NOT NULL DEFAULT FALSE,
    strategic_codes TEXT[], -- Array of matched strategic codes
    export_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    required_permits TEXT[] NOT NULL DEFAULT '{}',
    compliance_actions JSONB, -- Array of required actions
    can_proceed_without_permits BOOLEAN NOT NULL DEFAULT FALSE,
    manual_review_required BOOLEAN DEFAULT FALSE,
    manual_review_status VARCHAR(50), -- 'pending', 'approved', 'rejected'
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    detection_method VARCHAR(100) NOT NULL, -- 'multi_layer_rag'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_detection_shipment ON strategic_detection_results(shipment_id);
CREATE INDEX idx_detection_strategic ON strategic_detection_results(is_strategic);
CREATE INDEX idx_detection_blocked ON strategic_detection_results(export_blocked);

-- Permit Upload Tracking
CREATE TABLE permit_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id),
    detection_result_id UUID REFERENCES strategic_detection_results(id),
    permit_type VARCHAR(100) NOT NULL, -- 'STA_2010', 'AICA', 'TechDocs', etc.
    permit_number VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_status VARCHAR(50) NOT NULL DEFAULT 'uploaded', -- 'uploaded', 'validating', 'valid', 'invalid'
    validation_result JSONB, -- Validation details and any errors
    expiry_date DATE,
    issued_by VARCHAR(255),
    compliance_deadline DATE,
    is_valid BOOLEAN DEFAULT NULL,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    validated_at TIMESTAMP,
    notes TEXT
);

-- Indexes
CREATE INDEX idx_permit_shipment ON permit_uploads(shipment_id);
CREATE INDEX idx_permit_type ON permit_uploads(permit_type);
CREATE INDEX idx_permit_status ON permit_uploads(upload_status);
CREATE INDEX idx_permit_valid ON permit_uploads(is_valid);

-- Export Validation Log
CREATE TABLE export_validation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id),
    validation_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    validation_result JSONB NOT NULL, -- Complete validation result
    export_permitted BOOLEAN NOT NULL,
    blocking_reasons TEXT[],
    missing_permits TEXT[],
    compliance_score INTEGER, -- Overall compliance score 0-100
    validated_by VARCHAR(255),
    notes TEXT
);

-- Audit Trail for Strategic Items Detection
CREATE TABLE strategic_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id),
    action_type VARCHAR(100) NOT NULL, -- 'detection', 'permit_upload', 'manual_review', 'export_validation'
    action_details JSONB NOT NULL,
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for audit trail
CREATE INDEX idx_audit_shipment ON strategic_audit_trail(shipment_id);
CREATE INDEX idx_audit_action ON strategic_audit_trail(action_type);
CREATE INDEX idx_audit_timestamp ON strategic_audit_trail(timestamp);

-- Manual Review Queue
CREATE TABLE strategic_manual_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_result_id UUID NOT NULL REFERENCES strategic_detection_results(id),
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
    review_reason VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'completed'
    created_at TIMESTAMP DEFAULT NOW(),
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    review_notes TEXT
);

-- Functions for automatic compliance scoring
CREATE OR REPLACE FUNCTION calculate_compliance_score(shipment_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_strategic_items INTEGER;
    items_with_permits INTEGER;
    compliance_score INTEGER;
BEGIN
    -- Count total strategic items for this shipment
    SELECT COUNT(*) INTO total_strategic_items
    FROM strategic_detection_results
    WHERE shipment_id = shipment_uuid AND is_strategic = true;
    
    -- If no strategic items, return 100% compliance
    IF total_strategic_items = 0 THEN
        RETURN 100;
    END IF;
    
    -- Count strategic items with all required permits uploaded and valid
    SELECT COUNT(DISTINCT sdr.id) INTO items_with_permits
    FROM strategic_detection_results sdr
    WHERE sdr.shipment_id = shipment_uuid 
    AND sdr.is_strategic = true
    AND NOT EXISTS (
        SELECT 1 FROM unnest(sdr.required_permits) AS rp(permit_type)
        WHERE NOT EXISTS (
            SELECT 1 FROM permit_uploads pu
            WHERE pu.shipment_id = shipment_uuid
            AND pu.permit_type = rp.permit_type
            AND pu.is_valid = true
        )
    );
    
    -- Calculate compliance percentage
    compliance_score := ROUND((items_with_permits::DECIMAL / total_strategic_items::DECIMAL) * 100);
    
    RETURN compliance_score;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE strategic_items_rag IS 'RAG database containing Malaysian Strategic Items List with vector embeddings for semantic search';
COMMENT ON TABLE strategic_detection_results IS 'Results from multi-layer strategic items detection with export blocking enforcement';
COMMENT ON TABLE permit_uploads IS 'Tracking uploaded permits for strategic items compliance';
COMMENT ON TABLE export_validation_log IS 'Audit log for export validation attempts';
COMMENT ON TABLE strategic_audit_trail IS 'Complete audit trail for all strategic items related actions';
COMMENT ON TABLE strategic_manual_review_queue IS 'Queue for items requiring manual review by compliance officers';

-- Grant permissions (adjust as needed for your user)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gifs_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gifs_user;
