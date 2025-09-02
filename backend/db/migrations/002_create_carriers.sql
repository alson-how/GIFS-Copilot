-- Migration: Create Carriers Management System
-- Description: Create tables for carrier management, service types, and pricing

-- Create carriers table
CREATE TABLE IF NOT EXISTS carriers (
    carrier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(255),
    description TEXT,
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    default_margin_percentage DECIMAL(5,2) DEFAULT 15.00,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create carrier services table
CREATE TABLE IF NOT EXISTS carrier_services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id UUID NOT NULL REFERENCES carriers(carrier_id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- 'EXPRESS', 'ECONOMY', 'SEA_FREIGHT', 'GROUND'
    is_active BOOLEAN DEFAULT true,
    min_weight_kg DECIMAL(10,2) DEFAULT 0.1,
    max_weight_kg DECIMAL(10,2) DEFAULT 1000.0,
    min_dimensions_cm VARCHAR(50), -- Format: "LxWxH"
    max_dimensions_cm VARCHAR(50),
    transit_days_min INTEGER,
    transit_days_max INTEGER,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(carrier_id, service_code)
);

-- Create carrier pricing table
CREATE TABLE IF NOT EXISTS carrier_pricing (
    pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES carrier_services(service_id) ON DELETE CASCADE,
    origin_country VARCHAR(100),
    destination_country VARCHAR(100),
    weight_from_kg DECIMAL(10,2) DEFAULT 0.0,
    weight_to_kg DECIMAL(10,2) DEFAULT 999999.0,
    rate_per_kg DECIMAL(10,2) NOT NULL,
    minimum_charge DECIMAL(10,2) NOT NULL,
    fuel_surcharge_percentage DECIMAL(5,2) DEFAULT 0.0,
    handling_fee DECIMAL(10,2) DEFAULT 0.0,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_carriers_active ON carriers(is_active);
CREATE INDEX IF NOT EXISTS idx_carriers_code ON carriers(code);
CREATE INDEX IF NOT EXISTS idx_carrier_services_active ON carrier_services(is_active);
CREATE INDEX IF NOT EXISTS idx_carrier_services_type ON carrier_services(service_type);
CREATE INDEX IF NOT EXISTS idx_carrier_pricing_countries ON carrier_pricing(origin_country, destination_country);
CREATE INDEX IF NOT EXISTS idx_carrier_pricing_weight ON carrier_pricing(weight_from_kg, weight_to_kg);
CREATE INDEX IF NOT EXISTS idx_carrier_pricing_active ON carrier_pricing(is_active);

-- Add trigger for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_carriers_updated_at 
    BEFORE UPDATE ON carriers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carrier_services_updated_at 
    BEFORE UPDATE ON carrier_services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carrier_pricing_updated_at 
    BEFORE UPDATE ON carrier_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default carrier data
INSERT INTO carriers (name, code, contact_email, website, description, default_margin_percentage) VALUES
('DHL Express', 'DHL', 'support@dhl.com', 'https://www.dhl.com', 'Global express delivery and logistics', 18.00),
('FedEx', 'FEDEX', 'support@fedex.com', 'https://www.fedex.com', 'International express courier services', 20.00),
('Maersk', 'MAERSK', 'support@maersk.com', 'https://www.maersk.com', 'Ocean freight and logistics solutions', 12.00),
('Inhouse Logistics', 'INHOUSE', 'logistics@company.com', 'https://company.com', 'Internal logistics and delivery services', 10.00),
('Local Carrier', 'LOCAL', 'info@localcarrier.com', 'https://localcarrier.com', 'Regional delivery services', 15.00)
ON CONFLICT (code) DO NOTHING;

-- Insert carrier services
INSERT INTO carrier_services (carrier_id, service_name, service_code, service_type, transit_days_min, transit_days_max, min_weight_kg, max_weight_kg) 
SELECT 
    c.carrier_id,
    CASE 
        WHEN c.code = 'DHL' THEN 'Express Worldwide'
        WHEN c.code = 'FEDEX' THEN 'International Priority'
        WHEN c.code = 'MAERSK' THEN 'Sea Freight LCL'
        WHEN c.code = 'INHOUSE' THEN 'Standard Delivery'
        WHEN c.code = 'LOCAL' THEN 'Same Day Delivery'
    END as service_name,
    CASE 
        WHEN c.code = 'DHL' THEN 'EXPRESS_WW'
        WHEN c.code = 'FEDEX' THEN 'INTL_PRIORITY'
        WHEN c.code = 'MAERSK' THEN 'SEA_LCL'
        WHEN c.code = 'INHOUSE' THEN 'STANDARD'
        WHEN c.code = 'LOCAL' THEN 'SAME_DAY'
    END as service_code,
    CASE 
        WHEN c.code IN ('DHL', 'FEDEX') THEN 'EXPRESS'
        WHEN c.code = 'MAERSK' THEN 'SEA_FREIGHT'
        WHEN c.code = 'INHOUSE' THEN 'GROUND'
        WHEN c.code = 'LOCAL' THEN 'EXPRESS'
    END as service_type,
    CASE 
        WHEN c.code = 'DHL' THEN 1
        WHEN c.code = 'FEDEX' THEN 2
        WHEN c.code = 'MAERSK' THEN 20
        WHEN c.code = 'INHOUSE' THEN 1
        WHEN c.code = 'LOCAL' THEN 0
    END as transit_days_min,
    CASE 
        WHEN c.code = 'DHL' THEN 3
        WHEN c.code = 'FEDEX' THEN 3
        WHEN c.code = 'MAERSK' THEN 25
        WHEN c.code = 'INHOUSE' THEN 2
        WHEN c.code = 'LOCAL' THEN 0
    END as transit_days_max,
    0.1 as min_weight_kg,
    CASE 
        WHEN c.code = 'MAERSK' THEN 10000.0
        ELSE 1000.0
    END as max_weight_kg
FROM carriers c
WHERE c.code IN ('DHL', 'FEDEX', 'MAERSK', 'INHOUSE', 'LOCAL')
ON CONFLICT (carrier_id, service_code) DO NOTHING;

-- Insert second service for each carrier
INSERT INTO carrier_services (carrier_id, service_name, service_code, service_type, transit_days_min, transit_days_max, min_weight_kg, max_weight_kg) 
SELECT 
    c.carrier_id,
    CASE 
        WHEN c.code = 'DHL' THEN 'Economy Select'
        WHEN c.code = 'FEDEX' THEN 'International Economy'
        WHEN c.code = 'MAERSK' THEN 'Sea Freight FCL'
        WHEN c.code = 'INHOUSE' THEN 'Express Delivery'
        WHEN c.code = 'LOCAL' THEN 'Next Day Delivery'
    END as service_name,
    CASE 
        WHEN c.code = 'DHL' THEN 'ECONOMY'
        WHEN c.code = 'FEDEX' THEN 'INTL_ECONOMY'
        WHEN c.code = 'MAERSK' THEN 'SEA_FCL'
        WHEN c.code = 'INHOUSE' THEN 'EXPRESS'
        WHEN c.code = 'LOCAL' THEN 'NEXT_DAY'
    END as service_code,
    CASE 
        WHEN c.code IN ('DHL', 'FEDEX') THEN 'ECONOMY'
        WHEN c.code = 'MAERSK' THEN 'SEA_FREIGHT'
        WHEN c.code = 'INHOUSE' THEN 'EXPRESS'
        WHEN c.code = 'LOCAL' THEN 'GROUND'
    END as service_type,
    CASE 
        WHEN c.code = 'DHL' THEN 3
        WHEN c.code = 'FEDEX' THEN 4
        WHEN c.code = 'MAERSK' THEN 15
        WHEN c.code = 'INHOUSE' THEN 0
        WHEN c.code = 'LOCAL' THEN 1
    END as transit_days_min,
    CASE 
        WHEN c.code = 'DHL' THEN 5
        WHEN c.code = 'FEDEX' THEN 6
        WHEN c.code = 'MAERSK' THEN 20
        WHEN c.code = 'INHOUSE' THEN 1
        WHEN c.code = 'LOCAL' THEN 1
    END as transit_days_max,
    0.1 as min_weight_kg,
    CASE 
        WHEN c.code = 'MAERSK' THEN 50000.0
        ELSE 1000.0
    END as max_weight_kg
FROM carriers c
WHERE c.code IN ('DHL', 'FEDEX', 'MAERSK', 'INHOUSE', 'LOCAL')
ON CONFLICT (carrier_id, service_code) DO NOTHING;

-- Insert pricing data for major routes
INSERT INTO carrier_pricing (service_id, origin_country, destination_country, rate_per_kg, minimum_charge, fuel_surcharge_percentage, handling_fee)
SELECT 
    cs.service_id,
    'Malaysia' as origin_country,
    dest.country as destination_country,
    CASE 
        WHEN c.code = 'DHL' AND cs.service_code = 'EXPRESS_WW' THEN 25.50
        WHEN c.code = 'DHL' AND cs.service_code = 'ECONOMY' THEN 18.00
        WHEN c.code = 'FEDEX' AND cs.service_code = 'INTL_PRIORITY' THEN 28.00
        WHEN c.code = 'FEDEX' AND cs.service_code = 'INTL_ECONOMY' THEN 20.00
        WHEN c.code = 'MAERSK' AND cs.service_code = 'SEA_LCL' THEN 5.50
        WHEN c.code = 'MAERSK' AND cs.service_code = 'SEA_FCL' THEN 3.20
        WHEN c.code = 'INHOUSE' AND cs.service_code = 'STANDARD' THEN 8.00
        WHEN c.code = 'INHOUSE' AND cs.service_code = 'EXPRESS' THEN 12.00
        WHEN c.code = 'LOCAL' AND cs.service_code = 'SAME_DAY' THEN 15.00
        WHEN c.code = 'LOCAL' AND cs.service_code = 'NEXT_DAY' THEN 10.00
        ELSE 15.00
    END as rate_per_kg,
    CASE 
        WHEN c.code = 'DHL' AND cs.service_code = 'EXPRESS_WW' THEN 50.00
        WHEN c.code = 'DHL' AND cs.service_code = 'ECONOMY' THEN 35.00
        WHEN c.code = 'FEDEX' AND cs.service_code = 'INTL_PRIORITY' THEN 55.00
        WHEN c.code = 'FEDEX' AND cs.service_code = 'INTL_ECONOMY' THEN 40.00
        WHEN c.code = 'MAERSK' AND cs.service_code = 'SEA_LCL' THEN 200.00
        WHEN c.code = 'MAERSK' AND cs.service_code = 'SEA_FCL' THEN 800.00
        WHEN c.code = 'INHOUSE' AND cs.service_code = 'STANDARD' THEN 20.00
        WHEN c.code = 'INHOUSE' AND cs.service_code = 'EXPRESS' THEN 30.00
        WHEN c.code = 'LOCAL' AND cs.service_code = 'SAME_DAY' THEN 25.00
        WHEN c.code = 'LOCAL' AND cs.service_code = 'NEXT_DAY' THEN 15.00
        ELSE 25.00
    END as minimum_charge,
    CASE 
        WHEN c.code IN ('DHL', 'FEDEX') THEN 8.5
        WHEN c.code = 'MAERSK' THEN 12.0
        ELSE 5.0
    END as fuel_surcharge_percentage,
    CASE 
        WHEN c.code IN ('DHL', 'FEDEX') THEN 5.00
        WHEN c.code = 'MAERSK' THEN 25.00
        ELSE 3.00
    END as handling_fee
FROM carrier_services cs
JOIN carriers c ON cs.carrier_id = c.carrier_id
CROSS JOIN (
    SELECT 'Singapore' as country
    UNION SELECT 'Thailand'
    UNION SELECT 'China'
    UNION SELECT 'Germany'
    UNION SELECT 'United States'
    UNION SELECT 'Japan'
    UNION SELECT 'South Korea'
    UNION SELECT 'Australia'
    UNION SELECT 'United Kingdom'
    UNION SELECT 'Vietnam'
) dest
WHERE c.code IN ('DHL', 'FEDEX', 'MAERSK', 'INHOUSE', 'LOCAL');

-- Create view for easy carrier lookup with services
CREATE OR REPLACE VIEW carrier_services_view AS
SELECT 
    c.carrier_id,
    c.name as carrier_name,
    c.code as carrier_code,
    c.is_active as carrier_active,
    c.default_margin_percentage,
    cs.service_id,
    cs.service_name,
    cs.service_code,
    cs.service_type,
    cs.transit_days_min,
    cs.transit_days_max,
    cs.min_weight_kg,
    cs.max_weight_kg,
    cs.is_active as service_active
FROM carriers c
LEFT JOIN carrier_services cs ON c.carrier_id = cs.carrier_id
WHERE c.is_active = true;

COMMIT;