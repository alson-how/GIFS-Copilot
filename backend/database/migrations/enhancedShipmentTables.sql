-- Enhanced Shipment Tables for Step-based Workflow Processing
-- Migration: Add step tracking, product items, and document management

-- =====================================================
-- 1. ENHANCE SHIPMENTS TABLE
-- =====================================================

-- Add step tracking columns to existing shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS step1_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS step1_started_at TIMESTAMP;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS step1_completed_at TIMESTAMP;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS step2_completed_at TIMESTAMP;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS step3_completed_at TIMESTAMP;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS step4_completed_at TIMESTAMP;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS step5_completed_at TIMESTAMP;

-- Add batch processing fields
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS ocr_raw_data JSONB;

-- Add enhanced product tracking
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_quantity DECIMAL(15,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0;

-- Add compliance flags
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS has_strategic_items BOOLEAN DEFAULT FALSE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS has_ai_chips BOOLEAN DEFAULT FALSE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';

-- =====================================================
-- 2. CREATE PRODUCT ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS product_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    
    -- Basic product information
    product_description TEXT,
    hs_code VARCHAR(20),
    quantity DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'PCS',
    unit_price DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Technology and compliance
    technology_origin VARCHAR(50) DEFAULT 'Malaysia',
    semiconductor_category VARCHAR(100) DEFAULT 'standard_ic_asics',
    end_use_purpose TEXT,
    
    -- Classification flags
    is_strategic BOOLEAN DEFAULT FALSE,
    is_ai_chip BOOLEAN DEFAULT FALSE,
    requires_license BOOLEAN DEFAULT FALSE,
    
    -- OCR metadata
    ocr_confidence DECIMAL(3,2) DEFAULT 0.8,
    ocr_source_row INTEGER,
    original_table_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    UNIQUE(shipment_id, row_number)
);

-- Create indexes for product_items
CREATE INDEX IF NOT EXISTS idx_product_items_shipment_id ON product_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_product_items_hs_code ON product_items(hs_code);
CREATE INDEX IF NOT EXISTS idx_product_items_strategic ON product_items(is_strategic) WHERE is_strategic = TRUE;
CREATE INDEX IF NOT EXISTS idx_product_items_ai_chip ON product_items(is_ai_chip) WHERE is_ai_chip = TRUE;

-- =====================================================
-- 3. CREATE STEP COMPLETION LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS step_completion_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'completed', 'skipped', 'failed', 'in_progress'
    
    -- Completion details
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms INTEGER,
    completed_by VARCHAR(100),
    
    -- Step routing information
    next_step INTEGER,
    routing_reason TEXT,
    priority_level VARCHAR(20) DEFAULT 'normal',
    
    -- Compliance and validation
    compliance_flags JSONB,
    validation_errors JSONB,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for step_completion_log
CREATE INDEX IF NOT EXISTS idx_step_log_shipment_id ON step_completion_log(shipment_id);
CREATE INDEX IF NOT EXISTS idx_step_log_step_number ON step_completion_log(step_number);
CREATE INDEX IF NOT EXISTS idx_step_log_status ON step_completion_log(status);
CREATE INDEX IF NOT EXISTS idx_step_log_completed_at ON step_completion_log(completed_at);

-- =====================================================
-- 4. CREATE UPLOADED DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS uploaded_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    batch_id UUID,
    
    -- File information
    original_filename TEXT NOT NULL,
    stored_filename TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    
    -- Document classification
    document_type VARCHAR(100), -- 'Commercial Invoice', 'Bill of Lading', etc.
    document_category VARCHAR(50), -- 'primary', 'supporting', 'compliance'
    confidence_score DECIMAL(3,2),
    
    -- OCR results
    ocr_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    extracted_text TEXT,
    ocr_results JSONB,
    processing_time_ms INTEGER,
    
    -- Storage and access
    file_path TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    
    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for uploaded_documents
CREATE INDEX IF NOT EXISTS idx_documents_shipment_id ON uploaded_documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_documents_batch_id ON uploaded_documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON uploaded_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON uploaded_documents(ocr_status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON uploaded_documents(uploaded_at);

-- =====================================================
-- 5. CREATE BATCH PROCESSING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_processing (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    
    -- Batch information
    batch_name TEXT,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    
    -- Processing status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    progress_percentage INTEGER DEFAULT 0,
    
    -- Results
    extracted_shipments INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    processing_time_ms INTEGER,
    
    -- Error handling
    error_count INTEGER DEFAULT 0,
    error_details JSONB,
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for batch_processing
CREATE INDEX IF NOT EXISTS idx_batch_user_id ON batch_processing(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_status ON batch_processing(status);
CREATE INDEX IF NOT EXISTS idx_batch_started_at ON batch_processing(started_at);

-- =====================================================
-- 6. CREATE WORKFLOW CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_steps (
    step_id INTEGER PRIMARY KEY,
    step_name VARCHAR(100) NOT NULL,
    component_name VARCHAR(100),
    description TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    can_skip BOOLEAN DEFAULT FALSE,
    
    -- Step dependencies
    depends_on INTEGER[], -- Array of step IDs that must be completed first
    triggers_on TEXT[], -- Array of conditions that trigger this step
    
    -- Configuration
    estimated_time_minutes INTEGER,
    compliance_level VARCHAR(20) DEFAULT 'standard',
    requires_approval BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default workflow steps
INSERT INTO workflow_steps (step_id, step_name, component_name, description, is_required, can_skip) VALUES
(1, 'Shipment Basics', 'StepBasics', 'Basic shipment information and product details', TRUE, FALSE),
(2, 'STA Screening', 'StepSTA', 'Strategic Trade Authorization compliance check', FALSE, TRUE),
(3, 'AI Screening', 'StepAI', 'AI chip and advanced technology screening', FALSE, TRUE),
(4, 'General Screening', 'StepScreening', 'General export compliance screening', TRUE, FALSE),
(5, 'Documentation', 'StepDocs', 'Generate and review export documentation', TRUE, FALSE)
ON CONFLICT (step_id) DO UPDATE SET
    step_name = EXCLUDED.step_name,
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 7. ADD CONSTRAINTS AND TRIGGERS
-- =====================================================

-- Add foreign key constraint for batch_id in shipments
ALTER TABLE shipments ADD CONSTRAINT fk_shipments_batch_id 
    FOREIGN KEY (batch_id) REFERENCES batch_processing(batch_id) ON DELETE SET NULL;

-- Create trigger to update shipment statistics
CREATE OR REPLACE FUNCTION update_shipment_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update shipment totals when product items change
    UPDATE shipments SET
        total_quantity = (
            SELECT COALESCE(SUM(quantity), 0) 
            FROM product_items 
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id)
        ),
        total_items = (
            SELECT COUNT(*) 
            FROM product_items 
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id)
        ),
        has_strategic_items = (
            SELECT COUNT(*) > 0 
            FROM product_items 
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id) 
            AND is_strategic = TRUE
        ),
        has_ai_chips = (
            SELECT COUNT(*) > 0 
            FROM product_items 
            WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id) 
            AND is_ai_chip = TRUE
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE shipment_id = COALESCE(NEW.shipment_id, OLD.shipment_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_shipment_totals ON product_items;
CREATE TRIGGER trigger_update_shipment_totals
    AFTER INSERT OR UPDATE OR DELETE ON product_items
    FOR EACH ROW EXECUTE FUNCTION update_shipment_totals();

-- Create function to update batch progress
CREATE OR REPLACE FUNCTION update_batch_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE batch_processing SET
        extracted_shipments = (
            SELECT COUNT(*) FROM shipments WHERE batch_id = NEW.batch_id
        ),
        total_value = (
            SELECT COALESCE(SUM(commercial_value), 0) 
            FROM shipments WHERE batch_id = NEW.batch_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = NEW.batch_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for batch progress updates
DROP TRIGGER IF EXISTS trigger_update_batch_progress ON shipments;
CREATE TRIGGER trigger_update_batch_progress
    AFTER INSERT OR UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_batch_progress();

-- =====================================================
-- 8. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for shipment workflow status
CREATE OR REPLACE VIEW shipment_workflow_status AS
SELECT 
    s.shipment_id,
    s.batch_id,
    s.current_step,
    s.source_file,
    s.destination_country,
    s.commercial_value,
    s.currency,
    s.total_items,
    s.total_quantity,
    s.has_strategic_items,
    s.has_ai_chips,
    s.risk_level,
    
    -- Step completion status
    CASE WHEN s.step1_completed_at IS NOT NULL THEN TRUE ELSE FALSE END as step1_completed,
    CASE WHEN s.step2_completed_at IS NOT NULL THEN TRUE ELSE FALSE END as step2_completed,
    CASE WHEN s.step3_completed_at IS NOT NULL THEN TRUE ELSE FALSE END as step3_completed,
    CASE WHEN s.step4_completed_at IS NOT NULL THEN TRUE ELSE FALSE END as step4_completed,
    CASE WHEN s.step5_completed_at IS NOT NULL THEN TRUE ELSE FALSE END as step5_completed,
    
    -- Progress calculation
    (
        (CASE WHEN s.step1_completed_at IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN s.step2_completed_at IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN s.step3_completed_at IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN s.step4_completed_at IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN s.step5_completed_at IS NOT NULL THEN 1 ELSE 0 END)
    ) * 20 as progress_percentage,
    
    -- Next action
    CASE 
        WHEN s.current_step = 1 THEN 'Complete shipment basics'
        WHEN s.current_step = 2 THEN 'STA compliance screening'
        WHEN s.current_step = 3 THEN 'AI chip assessment'
        WHEN s.current_step = 4 THEN 'General compliance check'
        WHEN s.current_step = 5 THEN 'Prepare documentation'
        WHEN s.current_step >= 999 THEN 'Ready for export'
        ELSE 'Unknown step'
    END as next_action,
    
    s.created_at,
    s.updated_at
FROM shipments s;

-- View for batch processing summary
CREATE OR REPLACE VIEW batch_summary AS
SELECT 
    bp.batch_id,
    bp.batch_name,
    bp.user_id,
    bp.status,
    bp.total_files,
    bp.processed_files,
    bp.failed_files,
    bp.progress_percentage,
    bp.extracted_shipments,
    bp.total_value,
    
    -- Shipment statistics
    COUNT(s.shipment_id) as shipments_created,
    COUNT(CASE WHEN s.current_step > 1 THEN 1 END) as shipments_progressed,
    COUNT(CASE WHEN s.current_step >= 999 THEN 1 END) as shipments_completed,
    
    -- Value statistics
    COALESCE(AVG(s.commercial_value), 0) as avg_shipment_value,
    COALESCE(MAX(s.commercial_value), 0) as max_shipment_value,
    
    bp.started_at,
    bp.completed_at,
    bp.created_at
FROM batch_processing bp
LEFT JOIN shipments s ON bp.batch_id = s.batch_id
GROUP BY bp.batch_id, bp.batch_name, bp.user_id, bp.status, bp.total_files, 
         bp.processed_files, bp.failed_files, bp.progress_percentage, 
         bp.extracted_shipments, bp.total_value, bp.started_at, bp.completed_at, bp.created_at;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to application user (adjust as needed)
-- GRANT ALL PRIVILEGES ON TABLE product_items TO gifs_user;
-- GRANT ALL PRIVILEGES ON TABLE step_completion_log TO gifs_user;
-- GRANT ALL PRIVILEGES ON TABLE uploaded_documents TO gifs_user;
-- GRANT ALL PRIVILEGES ON TABLE batch_processing TO gifs_user;
-- GRANT ALL PRIVILEGES ON TABLE workflow_steps TO gifs_user;

-- GRANT SELECT ON TABLE shipment_workflow_status TO gifs_user;
-- GRANT SELECT ON TABLE batch_summary TO gifs_user;

-- =====================================================
-- 10. MIGRATION COMPLETE
-- =====================================================

-- Update schema version (if you have a version tracking table)
-- INSERT INTO schema_migrations (version, description, applied_at) 
-- VALUES ('20240829_enhanced_shipment_tables', 'Enhanced shipment tables for step-based workflow', CURRENT_TIMESTAMP);

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Enhanced shipment tables migration completed successfully';
    RAISE NOTICE 'Created tables: product_items, step_completion_log, uploaded_documents, batch_processing, workflow_steps';
    RAISE NOTICE 'Created views: shipment_workflow_status, batch_summary';
    RAISE NOTICE 'Added step tracking columns to shipments table';
END $$;
