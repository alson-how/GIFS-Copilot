-- V2 Strategic Items Detection System Migration
-- Enhanced strategic items detection with AI-powered classification

-- =====================================================
-- CREATE STRATEGIC DETECTION RESULTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS strategic_detection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id VARCHAR(255) NOT NULL,
    item_id VARCHAR(255),
    
    -- Item information
    item_description TEXT NOT NULL,
    hs_code VARCHAR(20),
    
    -- Strategic classification
    strategic_codes JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    final_confidence_score DECIMAL(3,2) DEFAULT 0.0,
    is_strategic BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    export_blocked BOOLEAN DEFAULT FALSE,
    
    -- Compliance requirements
    required_permits JSONB DEFAULT '[]',
    manual_review_required BOOLEAN DEFAULT FALSE,
    
    -- Detection metadata
    detection_engine_version VARCHAR(20) DEFAULT '2.0',
    detection_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for strategic_detection_results
CREATE INDEX IF NOT EXISTS idx_strategic_results_shipment_id ON strategic_detection_results(shipment_id);
CREATE INDEX IF NOT EXISTS idx_strategic_results_is_strategic ON strategic_detection_results(is_strategic) WHERE is_strategic = TRUE;
CREATE INDEX IF NOT EXISTS idx_strategic_results_risk_level ON strategic_detection_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_strategic_results_export_blocked ON strategic_detection_results(export_blocked) WHERE export_blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_strategic_results_manual_review ON strategic_detection_results(manual_review_required) WHERE manual_review_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_strategic_results_confidence ON strategic_detection_results(final_confidence_score);
CREATE INDEX IF NOT EXISTS idx_strategic_results_created_at ON strategic_detection_results(created_at);

-- =====================================================
-- CREATE STRATEGIC AUDIT TRAIL TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS strategic_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_details JSONB DEFAULT '{}',
    performed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for strategic_audit_trail
CREATE INDEX IF NOT EXISTS idx_strategic_audit_shipment_id ON strategic_audit_trail(shipment_id);
CREATE INDEX IF NOT EXISTS idx_strategic_audit_action_type ON strategic_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_strategic_audit_created_at ON strategic_audit_trail(created_at);

-- =====================================================
-- CREATE STRATEGIC MANUAL REVIEW QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS strategic_manual_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_result_id UUID NOT NULL REFERENCES strategic_detection_results(id) ON DELETE CASCADE,
    shipment_id VARCHAR(255) NOT NULL,
    
    -- Review details
    review_reason TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_review', 'completed', 'cancelled'
    
    -- Assignment
    assigned_to VARCHAR(100),
    assigned_at TIMESTAMP,
    
    -- Review results
    review_decision VARCHAR(50), -- 'approved', 'rejected', 'requires_permit', 'escalated'
    review_notes TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for strategic_manual_review_queue
CREATE INDEX IF NOT EXISTS idx_review_queue_detection_result ON strategic_manual_review_queue(detection_result_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_shipment_id ON strategic_manual_review_queue(shipment_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON strategic_manual_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_review_queue_priority ON strategic_manual_review_queue(priority);
CREATE INDEX IF NOT EXISTS idx_review_queue_assigned_to ON strategic_manual_review_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_review_queue_created_at ON strategic_manual_review_queue(created_at);

-- =====================================================
-- CREATE PERMIT UPLOADS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS permit_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id VARCHAR(255) NOT NULL,
    permit_type VARCHAR(100) NOT NULL,
    
    -- File information
    original_filename TEXT NOT NULL,
    stored_filename TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_path TEXT,
    
    -- Validation
    is_valid BOOLEAN DEFAULT FALSE,
    validation_notes TEXT,
    expiry_date DATE,
    permit_number VARCHAR(100),
    issuing_authority VARCHAR(200),
    
    -- Processing
    uploaded_by VARCHAR(100),
    validated_by VARCHAR(100),
    validated_at TIMESTAMP,
    
    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for permit_uploads
CREATE INDEX IF NOT EXISTS idx_permit_uploads_shipment_id ON permit_uploads(shipment_id);
CREATE INDEX IF NOT EXISTS idx_permit_uploads_permit_type ON permit_uploads(permit_type);
CREATE INDEX IF NOT EXISTS idx_permit_uploads_is_valid ON permit_uploads(is_valid);
CREATE INDEX IF NOT EXISTS idx_permit_uploads_expiry_date ON permit_uploads(expiry_date);
CREATE INDEX IF NOT EXISTS idx_permit_uploads_uploaded_at ON permit_uploads(uploaded_at);

-- =====================================================
-- CREATE STRATEGIC COMPLIANCE STATS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS strategic_compliance_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    
    -- Daily statistics
    total_shipments INTEGER DEFAULT 0,
    strategic_items_detected INTEGER DEFAULT 0,
    exports_blocked INTEGER DEFAULT 0,
    permits_uploaded INTEGER DEFAULT 0,
    manual_reviews_pending INTEGER DEFAULT 0,
    
    -- Compliance metrics
    compliance_rate DECIMAL(5,2) DEFAULT 0.0,
    avg_detection_confidence DECIMAL(3,2) DEFAULT 0.0,
    
    -- Processing metrics
    avg_detection_time_ms INTEGER DEFAULT 0,
    total_detection_time_ms BIGINT DEFAULT 0,
    
    -- Risk breakdown
    low_risk_items INTEGER DEFAULT 0,
    medium_risk_items INTEGER DEFAULT 0,
    high_risk_items INTEGER DEFAULT 0,
    critical_risk_items INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date)
);

-- Create indexes for strategic_compliance_stats
CREATE INDEX IF NOT EXISTS idx_compliance_stats_date ON strategic_compliance_stats(date);
CREATE INDEX IF NOT EXISTS idx_compliance_stats_compliance_rate ON strategic_compliance_stats(compliance_rate);

-- =====================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for strategic_detection_results
CREATE OR REPLACE FUNCTION update_strategic_detection_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_strategic_detection_results_updated_at ON strategic_detection_results;
CREATE TRIGGER trigger_strategic_detection_results_updated_at
    BEFORE UPDATE ON strategic_detection_results
    FOR EACH ROW EXECUTE FUNCTION update_strategic_detection_results_updated_at();

-- Trigger for strategic_manual_review_queue
CREATE OR REPLACE FUNCTION update_strategic_manual_review_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_strategic_manual_review_queue_updated_at ON strategic_manual_review_queue;
CREATE TRIGGER trigger_strategic_manual_review_queue_updated_at
    BEFORE UPDATE ON strategic_manual_review_queue
    FOR EACH ROW EXECUTE FUNCTION update_strategic_manual_review_queue_updated_at();

-- Trigger for permit_uploads
CREATE OR REPLACE FUNCTION update_permit_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_permit_uploads_updated_at ON permit_uploads;
CREATE TRIGGER trigger_permit_uploads_updated_at
    BEFORE UPDATE ON permit_uploads
    FOR EACH ROW EXECUTE FUNCTION update_permit_uploads_updated_at();

-- Trigger for strategic_compliance_stats
CREATE OR REPLACE FUNCTION update_strategic_compliance_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_strategic_compliance_stats_updated_at ON strategic_compliance_stats;
CREATE TRIGGER trigger_strategic_compliance_stats_updated_at
    BEFORE UPDATE ON strategic_compliance_stats
    FOR EACH ROW EXECUTE FUNCTION update_strategic_compliance_stats_updated_at();

-- =====================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for strategic items summary per shipment
CREATE OR REPLACE VIEW strategic_shipment_summary AS
SELECT 
    shipment_id,
    COUNT(*) as total_items,
    COUNT(CASE WHEN is_strategic = true THEN 1 END) as strategic_items,
    COUNT(CASE WHEN export_blocked = true THEN 1 END) as blocked_items,
    COUNT(CASE WHEN manual_review_required = true THEN 1 END) as items_requiring_review,
    MAX(CASE WHEN is_strategic = true THEN risk_level END) as highest_risk_level,
    AVG(final_confidence_score) as avg_confidence_score,
    BOOL_OR(export_blocked) as any_export_blocked,
    MAX(created_at) as last_detection_at
FROM strategic_detection_results
GROUP BY shipment_id;

-- View for manual review queue with detection details
CREATE OR REPLACE VIEW manual_review_queue_detail AS
SELECT 
    mrq.id as queue_id,
    mrq.shipment_id,
    mrq.review_reason,
    mrq.priority,
    mrq.status,
    mrq.assigned_to,
    mrq.created_at as queued_at,
    mrq.reviewed_at,
    mrq.review_decision,
    
    sdr.item_description,
    sdr.hs_code,
    sdr.risk_level,
    sdr.final_confidence_score,
    sdr.strategic_codes,
    sdr.required_permits
FROM strategic_manual_review_queue mrq
JOIN strategic_detection_results sdr ON mrq.detection_result_id = sdr.id
ORDER BY 
    CASE WHEN mrq.priority = 'urgent' THEN 1
         WHEN mrq.priority = 'high' THEN 2
         WHEN mrq.priority = 'normal' THEN 3
         ELSE 4 END,
    mrq.created_at ASC;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to application user (adjust as needed)
-- GRANT ALL PRIVILEGES ON TABLE strategic_detection_results TO gifs_user;
-- GRANT ALL PRIVILEGES ON TABLE strategic_audit_trail TO gifs_user;
-- GRANT ALL PRIVILEGES ON TABLE strategic_manual_review_queue TO gifs_user;
-- GRANT ALL PRIVILEGES ON TABLE permit_uploads TO gifs_user;
-- GRANT ALL PRIVILEGES ON TABLE strategic_compliance_stats TO gifs_user;

-- GRANT SELECT ON TABLE strategic_shipment_summary TO gifs_user;
-- GRANT SELECT ON TABLE manual_review_queue_detail TO gifs_user;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'V2 Strategic Items Detection System migration completed successfully';
    RAISE NOTICE 'Created tables: strategic_detection_results, strategic_audit_trail, strategic_manual_review_queue, permit_uploads, strategic_compliance_stats';
    RAISE NOTICE 'Created views: strategic_shipment_summary, manual_review_queue_detail';
    RAISE NOTICE 'Created triggers for automatic timestamp updates';
END $$;