-- Comprehensive End-User Security Screening Database Schema
-- Enhanced Step 2 with 25+ new fields and compliance workflow

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS screening_documents CASCADE;
DROP TABLE IF EXISTS screening_list_results CASCADE;
DROP TABLE IF EXISTS screenings CASCADE;

-- Main comprehensive screenings table
CREATE TABLE screenings (
    screening_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    
    -- End-User Details Section (12 fields)
    end_user_registration_number VARCHAR(100) NOT NULL,
    business_type VARCHAR(50) NOT NULL, -- 'corporation', 'government', 'academic', 'individual', 'ngo'
    company_name VARCHAR(255) NOT NULL,
    company_name_local VARCHAR(255),
    
    -- Full Address Fields
    street_address_1 VARCHAR(255) NOT NULL,
    street_address_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    
    -- Contact Details
    primary_contact_name VARCHAR(255) NOT NULL,
    primary_contact_title VARCHAR(100),
    primary_contact_email VARCHAR(255) NOT NULL,
    primary_contact_phone VARCHAR(50) NOT NULL,
    secondary_contact_name VARCHAR(255),
    secondary_contact_email VARCHAR(255),
    website_url VARCHAR(500),
    
    -- Transaction Context Section (8 fields)
    shipment_value DECIMAL(15,2) NOT NULL,
    product_categories TEXT[] NOT NULL, -- Array of product categories
    end_use_declaration TEXT NOT NULL CHECK (LENGTH(end_use_declaration) >= 20),
    end_use_location VARCHAR(255) NOT NULL,
    intended_recipients TEXT,
    transaction_frequency VARCHAR(50) DEFAULT 'one-time', -- 'one-time', 'recurring', 'ongoing'
    customer_relationship VARCHAR(50) DEFAULT 'new', -- 'new', 'existing', 'long-term'
    previous_transaction_count INTEGER DEFAULT 0,
    
    -- Risk Assessment Section (8 fields)
    geographic_risk_score INTEGER CHECK (geographic_risk_score >= 1 AND geographic_risk_score <= 10),
    geographic_risk_notes TEXT,
    product_risk_score INTEGER CHECK (product_risk_score >= 1 AND product_risk_score <= 10),
    product_risk_notes TEXT,
    end_user_risk_score INTEGER CHECK (end_user_risk_score >= 1 AND end_user_risk_score <= 10),
    end_user_risk_notes TEXT,
    transaction_risk_score INTEGER CHECK (transaction_risk_score >= 1 AND transaction_risk_score <= 10),
    transaction_risk_notes TEXT,
    overall_risk_score DECIMAL(3,1) GENERATED ALWAYS AS (
        (geographic_risk_score + product_risk_score + end_user_risk_score + transaction_risk_score) / 4.0
    ) STORED,
    
    -- Compliance Workflow Section (10 fields)
    screening_status VARCHAR(50) DEFAULT 'pending' CHECK (screening_status IN ('pending', 'in_review', 'approved', 'denied', 'requires_enhanced_dd')),
    assigned_officer VARCHAR(255),
    officer_notes TEXT,
    approval_date TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(255),
    denial_reason TEXT,
    enhanced_dd_required BOOLEAN DEFAULT FALSE,
    enhanced_dd_completed BOOLEAN DEFAULT FALSE,
    manual_review_required BOOLEAN DEFAULT FALSE,
    compliance_expiry_date DATE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system'
);

-- Screening List Results Table
CREATE TABLE screening_list_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id UUID NOT NULL REFERENCES screenings(screening_id) ON DELETE CASCADE,
    
    -- Screening Lists (7 major lists)
    list_name VARCHAR(100) NOT NULL, -- 'entity_list', 'sdn_list', 'unverified_list', 'military_end_user', 'eu_consolidated', 'un_sanctions', 'bis_denied_persons'
    
    -- Match Results
    match_found BOOLEAN DEFAULT FALSE,
    match_confidence DECIMAL(3,2), -- 0.00 to 1.00
    match_details JSONB,
    matched_entity_name VARCHAR(255),
    matched_entity_country VARCHAR(100),
    matched_entity_type VARCHAR(100),
    match_reason TEXT,
    
    -- List Metadata
    list_version VARCHAR(50),
    list_last_updated DATE,
    screening_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Processing Info
    api_response JSONB,
    processing_time_ms INTEGER,
    screening_service VARCHAR(100) DEFAULT 'internal'
);

-- Screening Documents Table
CREATE TABLE screening_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id UUID NOT NULL REFERENCES screenings(screening_id) ON DELETE CASCADE,
    
    -- Document Details
    document_type VARCHAR(100) NOT NULL, -- 'end_user_certificate', 'business_license', 'reference_letter', 'bank_reference', 'trade_reference', 'other'
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- Document Status
    upload_status VARCHAR(50) DEFAULT 'uploaded' CHECK (upload_status IN ('uploaded', 'verified', 'rejected', 'expired')),
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'invalid', 'expired')),
    verified_by VARCHAR(255),
    verification_date TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- Document Metadata
    document_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(255),
    document_number VARCHAR(100),
    
    -- Audit Fields
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by VARCHAR(255) DEFAULT 'user'
);

-- Indexes for performance
CREATE INDEX idx_screenings_shipment_id ON screenings(shipment_id);
CREATE INDEX idx_screenings_status ON screenings(screening_status);
CREATE INDEX idx_screenings_risk_score ON screenings(overall_risk_score);
CREATE INDEX idx_screenings_assigned_officer ON screenings(assigned_officer);
CREATE INDEX idx_screenings_created_at ON screenings(created_at);

CREATE INDEX idx_screening_results_screening_id ON screening_list_results(screening_id);
CREATE INDEX idx_screening_results_list_name ON screening_list_results(list_name);
CREATE INDEX idx_screening_results_match_found ON screening_list_results(match_found);

CREATE INDEX idx_screening_documents_screening_id ON screening_documents(screening_id);
CREATE INDEX idx_screening_documents_type ON screening_documents(document_type);
CREATE INDEX idx_screening_documents_status ON screening_documents(upload_status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_screenings_updated_at BEFORE UPDATE ON screenings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE screenings IS 'Comprehensive end-user security screening with 25+ fields for export compliance';
COMMENT ON TABLE screening_list_results IS 'Results from checking against 7 major screening lists (Entity List, SDN, etc.)';
COMMENT ON TABLE screening_documents IS 'Supporting documents for compliance screening (certificates, licenses, references)';
COMMENT ON COLUMN screenings.overall_risk_score IS 'Auto-calculated average of 4 risk categories (1-10 scale)';
COMMENT ON COLUMN screenings.enhanced_dd_required IS 'TRUE for high-risk scores (7+) requiring enhanced due diligence';
