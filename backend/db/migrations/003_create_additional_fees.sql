-- Migration: Create Additional Fees Management System
-- Description: Create tables for managing fixed additional fees, zones, and weight breaks

-- Create additional fees table
CREATE TABLE IF NOT EXISTS additional_fees (
    fee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'origin', 'customs', 'destination', 'special', 'accessorial', 'equipment', 'documentation'
    fee_code VARCHAR(50) NOT NULL UNIQUE,
    fee_name VARCHAR(100) NOT NULL,
    fee_type VARCHAR(20) NOT NULL, -- 'fixed', 'percentage', 'per_unit'
    base_amount DECIMAL(10,2), -- Fixed amount or base for calculation
    percentage_rate DECIMAL(5,3), -- For percentage-based fees (0.003 = 0.3%)
    calculation_base VARCHAR(50), -- 'commodity_value', 'base_rate', 'weight', 'quantity'
    unit_type VARCHAR(20), -- 'per_kg', 'per_pallet', 'per_hour', 'per_day'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false, -- Whether fee is mandatory
    applies_to_services TEXT[], -- Array of service types this fee applies to
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create shipping zones table
CREATE TABLE IF NOT EXISTS shipping_zones (
    zone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_code VARCHAR(20) NOT NULL UNIQUE,
    zone_name VARCHAR(100) NOT NULL,
    origin_country VARCHAR(100) NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    zone_number INTEGER NOT NULL,
    distance_km INTEGER,
    transit_days_min INTEGER,
    transit_days_max INTEGER,
    rate_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    fuel_surcharge_rate DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(origin_country, destination_country)
);

-- Create weight breaks table  
CREATE TABLE IF NOT EXISTS weight_breaks (
    break_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    break_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50), -- 'express', 'economy', 'sea_freight', 'ground', null for all
    origin_country VARCHAR(100),
    destination_country VARCHAR(100),
    weight_min_kg DECIMAL(10,2) NOT NULL,
    weight_max_kg DECIMAL(10,2) NOT NULL,
    rate_per_kg DECIMAL(10,2) NOT NULL,
    minimum_charge DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT weight_breaks_min_max_check CHECK (weight_min_kg < weight_max_kg)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_additional_fees_category ON additional_fees(category);
CREATE INDEX IF NOT EXISTS idx_additional_fees_active ON additional_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_countries ON shipping_zones(origin_country, destination_country);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_active ON shipping_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_weight_breaks_weight_range ON weight_breaks(weight_min_kg, weight_max_kg);
CREATE INDEX IF NOT EXISTS idx_weight_breaks_service ON weight_breaks(service_type);

-- Add triggers for updated_at
CREATE TRIGGER update_additional_fees_updated_at 
    BEFORE UPDATE ON additional_fees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_zones_updated_at 
    BEFORE UPDATE ON shipping_zones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weight_breaks_updated_at 
    BEFORE UPDATE ON weight_breaks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default additional fees
INSERT INTO additional_fees (category, fee_code, fee_name, fee_type, base_amount, description, is_required) VALUES
-- ORIGIN CHARGES
('origin', 'PICKUP_FEE', 'Pickup Fee', 'fixed', 50.00, 'If not dropped at warehouse', false),
('origin', 'PACKING_FEE', 'Packing Fee', 'fixed', 100.00, 'If packing service needed', false),
('origin', 'PALLETIZATION_FEE', 'Palletization Fee', 'per_unit', 30.00, 'Per pallet', false),
('origin', 'DOCUMENTATION_FEE', 'Documentation Fee', 'fixed', 25.00, 'Bill of lading, etc.', true),
('origin', 'ORIGIN_HANDLING', 'Origin Handling', 'fixed', 75.00, 'Terminal handling', true),

-- CUSTOMS & COMPLIANCE
('customs', 'CUSTOMS_CLEARANCE', 'Customs Clearance', 'fixed', 150.00, 'Export clearance', true),
('customs', 'DESTINATION_CLEARANCE', 'Destination Clearance', 'fixed', 200.00, 'Import clearance', true),
('customs', 'DUTIES', 'Duties', 'percentage', 0.00, 7.000, 'commodity_value', 'Varies by HS code', true),
('customs', 'TAXES', 'Taxes (GST/VAT)', 'percentage', 0.00, 10.000, 'commodity_value', 'GST/VAT', true),
('customs', 'BROKERAGE_FEE', 'Brokerage Fee', 'fixed', 100.00, 'Customs broker fee', true),
('customs', 'INSPECTION_FEE', 'Inspection Fee', 'fixed', 50.00, 'If required', false),

-- DESTINATION CHARGES
('destination', 'DELIVERY_FEE', 'Delivery Fee', 'fixed', 75.00, 'Final mile delivery', true),
('destination', 'DESTINATION_HANDLING', 'Destination Handling', 'fixed', 80.00, 'Terminal handling at destination', true),
('destination', 'UNPACKING_FEE', 'Unpacking Fee', 'fixed', 50.00, 'If requested', false),

-- SPECIAL SERVICES
('special', 'INSURANCE', 'Insurance', 'percentage', 0.00, 0.300, 'commodity_value', '0.3% of commodity value', false),
('special', 'TRACKING_FEE', 'Tracking Fee', 'fixed', 10.00, 'Shipment tracking service', false),
('special', 'PRIORITY_HANDLING', 'Priority Handling', 'fixed', 100.00, 'Express processing', false),
('special', 'WEEKEND_DELIVERY', 'Weekend Delivery', 'fixed', 150.00, 'Saturday/Sunday delivery', false),
('special', 'APPOINTMENT_DELIVERY', 'Appointment Delivery', 'fixed', 75.00, 'Scheduled delivery time', false),

-- ACCESSORIAL CHARGES
('accessorial', 'FUEL_SURCHARGE', 'Fuel Surcharge', 'percentage', 0.00, 23.000, 'base_rate', 'Current fuel surcharge', true),
('accessorial', 'SECURITY_SURCHARGE', 'Security Surcharge', 'fixed', 15.00, 'Security screening fee', true),
('accessorial', 'PEAK_SEASON_SURCHARGE', 'Peak Season Surcharge', 'percentage', 0.00, 15.000, 'base_rate', 'Holiday periods', false),
('accessorial', 'REMOTE_AREA_SURCHARGE', 'Remote Area Surcharge', 'fixed', 200.00, 'If applicable', false),
('accessorial', 'CONGESTION_SURCHARGE', 'Congestion Surcharge', 'fixed', 100.00, 'Port congestion fee', false),

-- EQUIPMENT & LABOR
('equipment', 'LIFTGATE_SERVICE', 'Liftgate Service', 'fixed', 75.00, 'Hydraulic lift service', false),
('equipment', 'INSIDE_PICKUP', 'Inside Pickup', 'fixed', 100.00, 'Pickup from inside building', false),
('equipment', 'RESIDENTIAL_DELIVERY', 'Residential Delivery', 'fixed', 85.00, 'Home delivery service', false),
('equipment', 'LIMITED_ACCESS_FEE', 'Limited Access Fee', 'fixed', 50.00, 'Airports, military bases', false),
('equipment', 'WAITING_TIME', 'Waiting Time', 'per_unit', 50.00, 'Per hour after free time', false),
('equipment', 'DETENTION_CHARGES', 'Detention Charges', 'per_unit', 100.00, 'Per day for containers', false),
('equipment', 'DEMURRAGE_CHARGES', 'Demurrage Charges', 'per_unit', 150.00, 'Port storage per day', false),

-- DOCUMENTATION
('documentation', 'CERTIFICATE_OF_ORIGIN', 'Certificate of Origin', 'fixed', 50.00, 'Origin certification', false),
('documentation', 'LEGALIZATION_FEE', 'Legalization Fee', 'fixed', 100.00, 'Document legalization', false),
('documentation', 'CONSULAR_FEE', 'Consular Fee', 'fixed', 150.00, 'Consular services', false)
ON CONFLICT (fee_code) DO NOTHING;

-- Insert default shipping zones
INSERT INTO shipping_zones (zone_code, zone_name, origin_country, destination_country, zone_number, distance_km, transit_days_min, transit_days_max, rate_multiplier, fuel_surcharge_rate) VALUES
('MY-SG', 'Malaysia to Singapore', 'Malaysia', 'Singapore', 1, 350, 1, 2, 1.0, 8.5),
('MY-TH', 'Malaysia to Thailand', 'Malaysia', 'Thailand', 2, 800, 2, 3, 1.4, 10.0),
('MY-CN', 'Malaysia to China', 'Malaysia', 'China', 3, 3200, 5, 8, 1.8, 12.0),
('MY-DE', 'Malaysia to Germany', 'Malaysia', 'Germany', 4, 11000, 7, 12, 2.5, 15.0),
('MY-US', 'Malaysia to United States', 'Malaysia', 'United States', 5, 17000, 8, 15, 3.2, 18.0),
('MY-JP', 'Malaysia to Japan', 'Malaysia', 'Japan', 3, 3300, 4, 7, 1.9, 13.0),
('MY-KR', 'Malaysia to South Korea', 'Malaysia', 'South Korea', 3, 3100, 4, 6, 1.7, 11.5),
('MY-AU', 'Malaysia to Australia', 'Malaysia', 'Australia', 4, 6200, 6, 10, 2.2, 14.0),
('MY-GB', 'Malaysia to United Kingdom', 'Malaysia', 'United Kingdom', 5, 10800, 8, 14, 2.8, 16.0),
('MY-VN', 'Malaysia to Vietnam', 'Malaysia', 'Vietnam', 2, 1200, 3, 5, 1.3, 9.5)
ON CONFLICT (origin_country, destination_country) DO NOTHING;

-- Insert default weight breaks for different service types
INSERT INTO weight_breaks (break_name, service_type, origin_country, destination_country, weight_min_kg, weight_max_kg, rate_per_kg, minimum_charge) VALUES
-- Express Service Weight Breaks
('Express 0-30kg', 'express', 'Malaysia', null, 0.0, 30.0, 12.50, 25.00),
('Express 31-100kg', 'express', 'Malaysia', null, 31.0, 100.0, 10.00, 150.00),
('Express 101-500kg', 'express', 'Malaysia', null, 101.0, 500.0, 8.50, 450.00),
('Express 501-1000kg', 'express', 'Malaysia', null, 501.0, 1000.0, 7.00, 800.00),
('Express 1000+kg', 'express', 'Malaysia', null, 1001.0, 999999.0, 5.50, 1200.00),

-- Economy Service Weight Breaks
('Economy 0-30kg', 'economy', 'Malaysia', null, 0.0, 30.0, 8.50, 20.00),
('Economy 31-100kg', 'economy', 'Malaysia', null, 31.0, 100.0, 7.00, 120.00),
('Economy 101-500kg', 'economy', 'Malaysia', null, 101.0, 500.0, 6.00, 350.00),
('Economy 501-1000kg', 'economy', 'Malaysia', null, 501.0, 1000.0, 5.00, 600.00),
('Economy 1000+kg', 'economy', 'Malaysia', null, 1001.0, 999999.0, 4.00, 900.00),

-- Sea Freight Weight Breaks (per CBM)
('Sea LCL 0-5cbm', 'sea_freight', 'Malaysia', null, 0.0, 5.0, 45.00, 150.00),
('Sea LCL 6-10cbm', 'sea_freight', 'Malaysia', null, 6.0, 10.0, 40.00, 300.00),
('Sea LCL 11-20cbm', 'sea_freight', 'Malaysia', null, 11.0, 20.0, 35.00, 500.00),
('Sea FCL 20ft', 'sea_freight', 'Malaysia', null, 21.0, 999999.0, 25.00, 800.00),

-- Ground Service Weight Breaks
('Ground 0-50kg', 'ground', 'Malaysia', null, 0.0, 50.0, 6.00, 15.00),
('Ground 51-200kg', 'ground', 'Malaysia', null, 51.0, 200.0, 5.00, 100.00),
('Ground 201-1000kg', 'ground', 'Malaysia', null, 201.0, 1000.0, 4.00, 400.00),
('Ground 1000+kg', 'ground', 'Malaysia', null, 1001.0, 999999.0, 3.00, 700.00);

-- Create view for easy fee lookup
CREATE OR REPLACE VIEW additional_fees_view AS
SELECT 
    fee_id,
    category,
    fee_code,
    fee_name,
    fee_type,
    base_amount,
    percentage_rate,
    calculation_base,
    unit_type,
    description,
    is_active,
    is_required,
    applies_to_services
FROM additional_fees
WHERE is_active = true;

-- Create view for zone-based pricing lookup
CREATE OR REPLACE VIEW zone_pricing_view AS
SELECT 
    sz.zone_code,
    sz.zone_name,
    sz.origin_country,
    sz.destination_country,
    sz.zone_number,
    sz.rate_multiplier,
    sz.fuel_surcharge_rate,
    sz.transit_days_min,
    sz.transit_days_max
FROM shipping_zones sz
WHERE sz.is_active = true;

-- Create view for weight break lookup
CREATE OR REPLACE VIEW weight_breaks_view AS
SELECT 
    wb.break_id,
    wb.break_name,
    wb.service_type,
    wb.origin_country,
    wb.destination_country,
    wb.weight_min_kg,
    wb.weight_max_kg,
    wb.rate_per_kg,
    wb.minimum_charge
FROM weight_breaks wb
WHERE wb.is_active = true
ORDER BY wb.service_type, wb.weight_min_kg;

COMMIT;