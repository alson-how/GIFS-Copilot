-- Generate 30 sample shipments with different statuses
-- Reference to shipment_status_enum from database schema

INSERT INTO shipments (
    shipment_id, export_date, mode, product_type, tech_origin, destination_country, 
    end_user_name, commercial_value, currency, quantity, quantity_unit, 
    incoterms, status, created_at, updated_at
) VALUES 
-- CREATED status shipments (5)
(gen_random_uuid(), '2024-09-15', 'Air', 'Electronics', 'Malaysia', 'Singapore', 'Tech Solutions Pte Ltd', 25000.00, 'USD', 50, 'PCS', 'FOB', 'CREATED', '2024-09-01 08:30:00', '2024-09-01 08:30:00'),
(gen_random_uuid(), '2024-09-20', 'Sea', 'Machinery', 'Malaysia', 'United States', 'Industrial Corp LLC', 150000.00, 'USD', 2, 'UNITS', 'CIF', 'CREATED', '2024-09-02 10:15:00', '2024-09-02 10:15:00'),
(gen_random_uuid(), '2024-09-18', 'Air', 'Medical Equipment', 'Malaysia', 'Germany', 'MedTech GmbH', 85000.00, 'EUR', 10, 'SETS', 'FOB', 'CREATED', '2024-09-03 14:20:00', '2024-09-03 14:20:00'),
(gen_random_uuid(), '2024-09-25', 'Land', 'Automotive Parts', 'Malaysia', 'Thailand', 'Auto Parts Co Ltd', 35000.00, 'USD', 100, 'PCS', 'EXW', 'CREATED', '2024-09-04 09:45:00', '2024-09-04 09:45:00'),
(gen_random_uuid(), '2024-09-22', 'Air', 'Textiles', 'Malaysia', 'United Kingdom', 'Fashion House Ltd', 42000.00, 'GBP', 500, 'PCS', 'FOB', 'CREATED', '2024-09-05 16:10:00', '2024-09-05 16:10:00'),

-- PENDING_QUOTE status shipments (4)
(gen_random_uuid(), '2024-09-12', 'Air', 'Computer Components', 'Malaysia', 'Australia', 'TechMax Pty Ltd', 68000.00, 'AUD', 200, 'PCS', 'FOB', 'PENDING_QUOTE', '2024-09-01 11:00:00', '2024-09-06 13:25:00'),
(gen_random_uuid(), '2024-09-16', 'Sea', 'Chemicals', 'Malaysia', 'Japan', 'Chemical Industries KK', 95000.00, 'JPY', 1000, 'KG', 'CIF', 'PENDING_QUOTE', '2024-09-02 15:30:00', '2024-09-07 11:40:00'),
(gen_random_uuid(), '2024-09-19', 'Air', 'Pharmaceuticals', 'Malaysia', 'Canada', 'PharmaCorp Inc', 125000.00, 'CAD', 50, 'BOXES', 'FOB', 'PENDING_QUOTE', '2024-09-03 12:15:00', '2024-09-08 09:20:00'),
(gen_random_uuid(), '2024-09-21', 'Land', 'Food Products', 'Malaysia', 'Indonesia', 'Food Industries PT', 28000.00, 'USD', 2000, 'KG', 'EXW', 'PENDING_QUOTE', '2024-09-04 08:00:00', '2024-09-09 15:55:00'),

-- UNDER_REVIEW status shipments (3)
(gen_random_uuid(), '2024-09-14', 'Air', 'Scientific Instruments', 'Malaysia', 'Switzerland', 'Scientific AG', 180000.00, 'CHF', 5, 'UNITS', 'FOB', 'UNDER_REVIEW', '2024-09-01 13:45:00', '2024-09-10 10:30:00'),
(gen_random_uuid(), '2024-09-17', 'Sea', 'Steel Products', 'Malaysia', 'South Korea', 'Steel Co Ltd', 75000.00, 'USD', 50, 'TONS', 'CIF', 'UNDER_REVIEW', '2024-09-02 09:20:00', '2024-09-11 14:15:00'),
(gen_random_uuid(), '2024-09-23', 'Air', 'Optical Equipment', 'Malaysia', 'Netherlands', 'Optics BV', 92000.00, 'EUR', 20, 'UNITS', 'FOB', 'UNDER_REVIEW', '2024-09-03 16:50:00', '2024-09-12 08:45:00'),

-- QUOTED status shipments (4)
(gen_random_uuid(), '2024-09-13', 'Air', 'Telecommunications', 'Malaysia', 'United Arab Emirates', 'Telecom Solutions LLC', 115000.00, 'USD', 30, 'UNITS', 'FOB', 'QUOTED', '2024-09-01 10:30:00', '2024-09-13 12:20:00'),
(gen_random_uuid(), '2024-09-18', 'Sea', 'Construction Materials', 'Malaysia', 'New Zealand', 'BuildCorp Ltd', 65000.00, 'NZD', 100, 'UNITS', 'CIF', 'QUOTED', '2024-09-02 14:10:00', '2024-09-14 16:35:00'),
(gen_random_uuid(), '2024-09-20', 'Air', 'Laboratory Equipment', 'Malaysia', 'France', 'LabTech SARL', 98000.00, 'EUR', 15, 'SETS', 'FOB', 'QUOTED', '2024-09-03 11:25:00', '2024-09-15 09:10:00'),
(gen_random_uuid(), '2024-09-24', 'Land', 'Plastic Products', 'Malaysia', 'Vietnam', 'Plastic Industries Co', 38000.00, 'USD', 500, 'PCS', 'EXW', 'QUOTED', '2024-09-04 15:40:00', '2024-09-16 13:50:00'),

-- CONFIRMED status shipments (3)
(gen_random_uuid(), '2024-09-11', 'Air', 'Precision Tools', 'Malaysia', 'Italy', 'Precision SpA', 72000.00, 'EUR', 100, 'SETS', 'FOB', 'CONFIRMED', '2024-09-01 12:00:00', '2024-09-17 11:25:00'),
(gen_random_uuid(), '2024-09-15', 'Sea', 'Mining Equipment', 'Malaysia', 'Chile', 'Mining Corp SA', 250000.00, 'USD', 3, 'UNITS', 'CIF', 'CONFIRMED', '2024-09-02 08:45:00', '2024-09-18 14:40:00'),
(gen_random_uuid(), '2024-09-19', 'Air', 'Biotechnology', 'Malaysia', 'Sweden', 'BioTech AB', 135000.00, 'SEK', 25, 'UNITS', 'FOB', 'CONFIRMED', '2024-09-03 13:30:00', '2024-09-19 10:15:00'),

-- PICKUP_SCHEDULED status shipments (2)
(gen_random_uuid(), '2024-09-10', 'Air', 'Renewable Energy', 'Malaysia', 'Denmark', 'Green Energy ApS', 88000.00, 'DKK', 40, 'UNITS', 'FOB', 'PICKUP_SCHEDULED', '2024-09-01 09:15:00', '2024-09-20 15:20:00'),
(gen_random_uuid(), '2024-09-14', 'Sea', 'Heavy Machinery', 'Malaysia', 'Brazil', 'Machinery Ltda', 320000.00, 'BRL', 2, 'UNITS', 'CIF', 'PICKUP_SCHEDULED', '2024-09-02 11:50:00', '2024-09-21 12:35:00'),

-- PICKED_UP status shipments (2)
(gen_random_uuid(), '2024-09-09', 'Air', 'Aerospace Components', 'Malaysia', 'United States', 'Aerospace Inc', 195000.00, 'USD', 8, 'UNITS', 'FOB', 'PICKED_UP', '2024-09-01 07:30:00', '2024-09-22 09:45:00'),
(gen_random_uuid(), '2024-09-12', 'Land', 'Agricultural Equipment', 'Malaysia', 'Cambodia', 'AgriTech Co', 45000.00, 'USD', 15, 'UNITS', 'EXW', 'PICKED_UP', '2024-09-02 16:20:00', '2024-09-23 11:10:00'),

-- AT_WAREHOUSE status shipments (2)
(gen_random_uuid(), '2024-09-08', 'Air', 'Gaming Equipment', 'Malaysia', 'South Korea', 'Gaming Corp Ltd', 52000.00, 'KRW', 200, 'PCS', 'FOB', 'AT_WAREHOUSE', '2024-09-01 14:40:00', '2024-09-24 13:25:00'),
(gen_random_uuid(), '2024-09-11', 'Sea', 'Marine Equipment', 'Malaysia', 'Norway', 'Marine Tech AS', 110000.00, 'NOK', 12, 'UNITS', 'CIF', 'AT_WAREHOUSE', '2024-09-02 10:05:00', '2024-09-25 16:50:00'),

-- IN_TRANSIT status shipments (2)
(gen_random_uuid(), '2024-09-07', 'Air', 'Robotics', 'Malaysia', 'Japan', 'Robotics KK', 165000.00, 'JPY', 6, 'UNITS', 'FOB', 'IN_TRANSIT', '2024-09-01 15:20:00', '2024-09-26 08:30:00'),
(gen_random_uuid(), '2024-09-10', 'Sea', 'Oil & Gas Equipment', 'Malaysia', 'Qatar', 'Energy Solutions LLC', 280000.00, 'USD', 4, 'UNITS', 'CIF', 'IN_TRANSIT', '2024-09-02 12:35:00', '2024-09-27 14:15:00'),

-- OUT_FOR_DELIVERY status shipments (1)
(gen_random_uuid(), '2024-09-06', 'Air', 'Fashion Accessories', 'Malaysia', 'Hong Kong', 'Fashion HK Ltd', 35000.00, 'HKD', 1000, 'PCS', 'FOB', 'OUT_FOR_DELIVERY', '2024-09-01 11:45:00', '2024-09-28 10:40:00'),

-- DELIVERED status shipments (2)
(gen_random_uuid(), '2024-09-05', 'Air', 'Consumer Electronics', 'Malaysia', 'Singapore', 'Electronics Pte', 58000.00, 'SGD', 150, 'PCS', 'FOB', 'DELIVERED', '2024-09-01 08:15:00', '2024-09-29 12:20:00'),
(gen_random_uuid(), '2024-09-08', 'Land', 'Furniture', 'Malaysia', 'Thailand', 'Furniture Co Ltd', 25000.00, 'THB', 50, 'SETS', 'EXW', 'DELIVERED', '2024-09-02 13:25:00', '2024-09-30 15:45:00');

-- Update some additional fields for more realistic data
UPDATE shipments SET 
    hs_code = CASE 
        WHEN product_type LIKE '%Electronics%' THEN '8517.12.00'
        WHEN product_type LIKE '%Machinery%' THEN '8479.89.00'
        WHEN product_type LIKE '%Medical%' THEN '9018.19.00'
        WHEN product_type LIKE '%Automotive%' THEN '8708.99.00'
        WHEN product_type LIKE '%Textiles%' THEN '6204.62.00'
        WHEN product_type LIKE '%Computer%' THEN '8471.50.00'
        WHEN product_type LIKE '%Chemical%' THEN '3824.99.00'
        WHEN product_type LIKE '%Pharmaceutical%' THEN '3004.90.00'
        ELSE '9999.99.00'
    END,
    description = CASE 
        WHEN product_type LIKE '%Electronics%' THEN 'High-tech electronic components for industrial use'
        WHEN product_type LIKE '%Machinery%' THEN 'Industrial machinery and equipment'
        WHEN product_type LIKE '%Medical%' THEN 'Medical devices and equipment for healthcare'
        WHEN product_type LIKE '%Automotive%' THEN 'Automotive spare parts and components'
        WHEN product_type LIKE '%Textiles%' THEN 'Textile products and garments'
        ELSE 'Various industrial and commercial products'
    END,
    end_use_purpose = CASE 
        WHEN destination_country IN ('United States', 'Germany', 'United Kingdom') THEN 'Commercial resale and distribution'
        WHEN destination_country IN ('Singapore', 'Thailand', 'Indonesia') THEN 'Manufacturing and assembly'
        ELSE 'Industrial use and operations'
    END,
    insurance_required = CASE 
        WHEN commercial_value > 100000 THEN true
        ELSE (random() > 0.3)
    END,
    shipment_priority = CASE 
        WHEN mode = 'Air' THEN 'Urgent'
        WHEN commercial_value > 150000 THEN 'High'
        ELSE 'Standard'
    END
WHERE shipment_id IN (
    SELECT shipment_id FROM shipments ORDER BY created_at DESC LIMIT 30
);

-- Add some sample customer_id references (assuming some users exist)
-- This will need to be adjusted based on your actual user IDs
UPDATE shipments SET customer_id = 1 WHERE destination_country IN ('Singapore', 'Thailand', 'Indonesia');
UPDATE shipments SET customer_id = 2 WHERE destination_country IN ('United States', 'Canada');
UPDATE shipments SET customer_id = 3 WHERE destination_country IN ('Germany', 'United Kingdom', 'France');

-- Set some tracking numbers for shipments that are beyond CONFIRMED status
UPDATE shipments SET tracking_number = 'TRK' || LPAD((random() * 999999)::int::text, 6, '0')
WHERE status IN ('PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- Set carrier references for shipped items  
UPDATE shipments SET carrier_reference = 'CAR' || LPAD((random() * 999999)::int::text, 6, '0')
WHERE status IN ('PICKED_UP', 'AT_WAREHOUSE', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- Set estimated and actual dates for advanced statuses
UPDATE shipments SET 
    estimated_delivery_date = export_date + INTERVAL '7 days'
WHERE mode = 'Air' AND status IN ('CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED');

UPDATE shipments SET 
    estimated_delivery_date = export_date + INTERVAL '21 days'
WHERE mode = 'Sea' AND status IN ('CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED');

UPDATE shipments SET 
    estimated_delivery_date = export_date + INTERVAL '3 days'
WHERE mode = 'Land' AND status IN ('CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- Set actual pickup dates for picked up shipments
UPDATE shipments SET 
    actual_pickup_date = updated_at
WHERE status IN ('PICKED_UP', 'AT_WAREHOUSE', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- Set actual delivery dates for delivered shipments
UPDATE shipments SET 
    actual_delivery_date = updated_at
WHERE status = 'DELIVERED';

-- Display summary
SELECT 
    status,
    COUNT(*) as count,
    ROUND(AVG(commercial_value), 2) as avg_value,
    COUNT(CASE WHEN mode = 'Air' THEN 1 END) as air_shipments,
    COUNT(CASE WHEN mode = 'Sea' THEN 1 END) as sea_shipments,
    COUNT(CASE WHEN mode = 'Land' THEN 1 END) as land_shipments
FROM shipments 
WHERE created_at >= '2024-09-01' 
GROUP BY status 
ORDER BY 
    CASE status
        WHEN 'CREATED' THEN 1
        WHEN 'PENDING_QUOTE' THEN 2
        WHEN 'UNDER_REVIEW' THEN 3
        WHEN 'QUOTED' THEN 4
        WHEN 'CONFIRMED' THEN 5
        WHEN 'PICKUP_SCHEDULED' THEN 6
        WHEN 'PICKED_UP' THEN 7
        WHEN 'AT_WAREHOUSE' THEN 8
        WHEN 'IN_TRANSIT' THEN 9
        WHEN 'OUT_FOR_DELIVERY' THEN 10
        WHEN 'DELIVERED' THEN 11
        ELSE 99
    END;