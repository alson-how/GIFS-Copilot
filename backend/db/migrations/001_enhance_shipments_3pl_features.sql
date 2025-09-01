-- =============================================
-- 3PL Logistics System Database Schema
-- =============================================

-- 1. Shipment Status Enum
CREATE TYPE shipment_status_enum AS ENUM (
    'DRAFT',
    'PENDING_QUOTE',
    'UNDER_REVIEW',
    'QUOTED',
    'CONFIRMED',
    'PICKUP_SCHEDULED',
    'PICKED_UP',
    'AT_WAREHOUSE',
    'CUSTOMS_EXPORT',
    'IN_TRANSIT',
    'ARRIVED_DESTINATION',
    'CUSTOMS_IMPORT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'EXPIRED'
);

-- 2. User Role Enum
CREATE TYPE user_role_enum AS ENUM (
    'CUSTOMER',
    'ADMIN',
    'CARRIER',
    'SYSTEM'
);

-- 3. Pickup Method Enum
CREATE TYPE pickup_method_enum AS ENUM (
    'PICKUP_FROM_LOCATION',
    'DROP_OFF_AT_WAREHOUSE'
);

-- 4. Special Handling Enum
CREATE TYPE special_handling_enum AS ENUM (
    'FRAGILE',
    'TEMPERATURE_CONTROLLED',
    'HAZARDOUS',
    'HIGH_VALUE',
    'PERISHABLE'
);

-- 5. Enhance users table with roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role_enum DEFAULT 'CUSTOMER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- 6. Enhance shipments table with 3PL features
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS status shipment_status_enum DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS pickup_method pickup_method_enum,
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS pickup_contact_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS pickup_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS pickup_instructions TEXT,
ADD COLUMN IF NOT EXISTS warehouse_id INTEGER,
ADD COLUMN IF NOT EXISTS preferred_pickup_date_from DATE,
ADD COLUMN IF NOT EXISTS preferred_pickup_date_to DATE,
ADD COLUMN IF NOT EXISTS package_length_cm DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS package_width_cm DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS package_height_cm DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS package_weight_kg DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS number_of_packages INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS special_handling special_handling_enum[],
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS carrier_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_pickup_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP;

-- 7. Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    operating_hours JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Shipment Status History table
CREATE TABLE IF NOT EXISTS shipment_status_history (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments(shipment_id),
    previous_status shipment_status_enum,
    new_status shipment_status_enum NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    changed_by_role user_role_enum NOT NULL,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments(shipment_id),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    carrier_rates JSONB NOT NULL, -- Array of carrier rate objects
    base_rate DECIMAL(10,2) NOT NULL,
    additional_fees JSONB, -- Handling, documentation, insurance fees
    margin_percentage DECIMAL(5,2) DEFAULT 15.00,
    total_cost DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    valid_until TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, ACCEPTED, EXPIRED, CANCELLED
    created_by INTEGER REFERENCES users(id),
    accepted_at TIMESTAMP,
    expired_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Carrier Rates table
CREATE TABLE IF NOT EXISTS carrier_rates (
    id SERIAL PRIMARY KEY,
    carrier_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    origin_country VARCHAR(100),
    destination_country VARCHAR(100),
    rate_per_kg DECIMAL(10,4),
    minimum_charge DECIMAL(10,2),
    transit_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Admin Activities table (for calendar display)
CREATE TABLE IF NOT EXISTS admin_activities (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(50) NOT NULL, -- PICKUP, DELIVERY, REVIEW, etc.
    shipment_id INTEGER REFERENCES shipments(shipment_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'SCHEDULED', -- SCHEDULED, COMPLETED, CANCELLED
    location TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Status Transition Rules table
CREATE TABLE IF NOT EXISTS status_transition_rules (
    id SERIAL PRIMARY KEY,
    from_status shipment_status_enum NOT NULL,
    to_status shipment_status_enum NOT NULL,
    allowed_roles user_role_enum[] NOT NULL,
    is_automatic BOOLEAN DEFAULT false,
    conditions JSONB, -- Additional conditions for transition
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_status_history_shipment ON shipment_status_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_status_history_timestamp ON shipment_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_shipment ON quotes(shipment_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);
CREATE INDEX IF NOT EXISTS idx_admin_activities_date ON admin_activities(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_admin_activities_type ON admin_activities(activity_type);

-- =============================================
-- Sample Data
-- =============================================

-- Insert sample warehouses
INSERT INTO warehouses (name, address, city, country, postal_code, phone, email, operating_hours) VALUES
('Main Distribution Center', '123 Industrial Ave', 'Kuala Lumpur', 'Malaysia', '50000', '+60312345678', 'kl@warehouse.com', '{"mon-fri": "08:00-18:00", "sat": "08:00-14:00"}'),
('Port Klang Facility', '456 Port Road', 'Port Klang', 'Malaysia', '42000', '+60312345679', 'portklang@warehouse.com', '{"mon-fri": "06:00-20:00", "sat": "06:00-16:00"}'),
('Johor Warehouse', '789 Logistics Park', 'Johor Bahru', 'Malaysia', '80000', '+60712345680', 'johor@warehouse.com', '{"mon-fri": "08:00-17:00"}')
ON CONFLICT DO NOTHING;

-- Insert sample carrier rates
INSERT INTO carrier_rates (carrier_name, service_type, origin_country, destination_country, rate_per_kg, minimum_charge, transit_days) VALUES
('DHL Express', 'Express Worldwide', 'Malaysia', 'Singapore', 25.50, 50.00, 1),
('DHL Express', 'Express Worldwide', 'Malaysia', 'USA', 45.00, 80.00, 3),
('FedEx', 'International Priority', 'Malaysia', 'Singapore', 28.00, 55.00, 1),
('FedEx', 'International Priority', 'Malaysia', 'USA', 42.00, 75.00, 2),
('Maersk', 'Sea Freight LCL', 'Malaysia', 'USA', 5.50, 200.00, 25),
('Local Courier', 'Domestic Express', 'Malaysia', 'Malaysia', 8.00, 20.00, 1)
ON CONFLICT DO NOTHING;

-- Insert status transition rules
INSERT INTO status_transition_rules (from_status, to_status, allowed_roles) VALUES
('DRAFT', 'PENDING_QUOTE', ARRAY['CUSTOMER']),
('PENDING_QUOTE', 'UNDER_REVIEW', ARRAY['ADMIN', 'SYSTEM']),
('UNDER_REVIEW', 'QUOTED', ARRAY['ADMIN']),
('QUOTED', 'CONFIRMED', ARRAY['CUSTOMER']),
('QUOTED', 'EXPIRED', ARRAY['SYSTEM']),
('CONFIRMED', 'PICKUP_SCHEDULED', ARRAY['ADMIN', 'CARRIER']),
('PICKUP_SCHEDULED', 'PICKED_UP', ARRAY['CARRIER', 'ADMIN']),
('PICKED_UP', 'AT_WAREHOUSE', ARRAY['CARRIER', 'ADMIN']),
('AT_WAREHOUSE', 'CUSTOMS_EXPORT', ARRAY['ADMIN', 'SYSTEM']),
('CUSTOMS_EXPORT', 'IN_TRANSIT', ARRAY['CARRIER', 'ADMIN']),
('IN_TRANSIT', 'ARRIVED_DESTINATION', ARRAY['CARRIER', 'ADMIN']),
('ARRIVED_DESTINATION', 'CUSTOMS_IMPORT', ARRAY['ADMIN', 'SYSTEM']),
('CUSTOMS_IMPORT', 'OUT_FOR_DELIVERY', ARRAY['CARRIER', 'ADMIN']),
('OUT_FOR_DELIVERY', 'DELIVERED', ARRAY['CARRIER', 'ADMIN']),
-- Allow cancellation from most statuses
('DRAFT', 'CANCELLED', ARRAY['CUSTOMER', 'ADMIN']),
('PENDING_QUOTE', 'CANCELLED', ARRAY['CUSTOMER', 'ADMIN']),
('UNDER_REVIEW', 'CANCELLED', ARRAY['CUSTOMER', 'ADMIN']),
('QUOTED', 'CANCELLED', ARRAY['CUSTOMER', 'ADMIN']),
('CONFIRMED', 'CANCELLED', ARRAY['ADMIN'])
ON CONFLICT DO NOTHING;

-- =============================================
-- Update Existing Data
-- =============================================

-- Set default status for existing shipments
UPDATE shipments SET status = 'DRAFT' WHERE status IS NULL;

-- Create admin user if not exists
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES ('admin@3pl.com', '$2b$10$example_hash', 'System', 'Administrator', 'ADMIN', true)
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN';

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function to automatically create status history entry
CREATE OR REPLACE FUNCTION create_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO shipment_status_history (
            shipment_id, 
            previous_status, 
            new_status, 
            changed_by_role,
            notes
        ) VALUES (
            NEW.shipment_id,
            OLD.status,
            NEW.status,
            'SYSTEM',
            'Status updated automatically'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status history
DROP TRIGGER IF EXISTS shipment_status_change ON shipments;
CREATE TRIGGER shipment_status_change
    AFTER UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION create_status_history();

-- Function to auto-expire quotes
CREATE OR REPLACE FUNCTION expire_old_quotes()
RETURNS void AS $$
BEGIN
    UPDATE quotes 
    SET status = 'EXPIRED', expired_at = CURRENT_TIMESTAMP
    WHERE status = 'ACTIVE' 
    AND valid_until < CURRENT_TIMESTAMP;
    
    -- Update corresponding shipments
    UPDATE shipments 
    SET status = 'EXPIRED'::shipment_status_enum
    WHERE shipment_id IN (
        SELECT shipment_id FROM quotes 
        WHERE status = 'EXPIRED' 
        AND expired_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
    ) 
    AND status = 'QUOTED'::shipment_status_enum;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Views for Reporting
-- =============================================

-- Admin dashboard stats view
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM shipments WHERE status IN ('PENDING_QUOTE', 'UNDER_REVIEW')) as pending_quotes,
    (SELECT COUNT(*) FROM shipments WHERE status NOT IN ('DELIVERED', 'CANCELLED', 'EXPIRED')) as active_shipments,
    (SELECT COUNT(*) FROM admin_activities WHERE scheduled_date = CURRENT_DATE AND activity_type = 'DELIVERY') as todays_deliveries,
    (SELECT COALESCE(SUM(total_cost), 0) FROM quotes WHERE status = 'ACCEPTED' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)) as monthly_revenue;

-- Shipment summary view
CREATE OR REPLACE VIEW shipment_summary AS
SELECT 
    s.shipment_id,
    s.reference,
    s.status,
    s.origin,
    s.destination,
    s.customer_id,
    u.first_name || ' ' || u.last_name as customer_name,
    u.email as customer_email,
    s.created_at,
    s.updated_at,
    q.total_cost as quoted_amount,
    q.valid_until as quote_expires,
    ARRAY_AGG(sf.original_name ORDER BY sf.uploaded_at) FILTER (WHERE sf.original_name IS NOT NULL) as uploaded_documents
FROM shipments s
LEFT JOIN users u ON s.customer_id = u.id
LEFT JOIN quotes q ON s.shipment_id = q.shipment_id AND q.status = 'ACTIVE'
LEFT JOIN shipment_files sf ON s.shipment_id = sf.shipment_id
GROUP BY s.shipment_id, u.id, q.total_cost, q.valid_until;