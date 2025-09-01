-- Fix shipments table to add missing columns for 3PL features
-- This script adds the essential columns needed for the ManageShipments admin interface

-- First, let's check if the enum types exist and update them if needed
DO $$ 
BEGIN
    -- Update shipment_status_enum to include CREATED instead of DRAFT
    ALTER TYPE shipment_status_enum RENAME TO shipment_status_enum_old;
    
    CREATE TYPE shipment_status_enum AS ENUM (
        'CREATED',
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
    
    -- Drop the old enum
    DROP TYPE shipment_status_enum_old CASCADE;
    
EXCEPTION 
    WHEN duplicate_object THEN 
        -- Enum already exists, just continue
        NULL;
END $$;

-- Add essential columns to shipments table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS status shipment_status_enum DEFAULT 'CREATED',
ADD COLUMN IF NOT EXISTS customer_id INTEGER,
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS carrier_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_pickup_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_shipments_updated_at ON shipments;
CREATE TRIGGER update_shipments_updated_at 
    BEFORE UPDATE ON shipments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Set default status for existing shipments
UPDATE shipments SET status = 'CREATED' WHERE status IS NULL;

-- Add some sample customer references (you can adjust these based on your actual users table)
UPDATE shipments SET customer_id = 1 WHERE customer_id IS NULL AND RANDOM() < 0.3;
UPDATE shipments SET customer_id = 2 WHERE customer_id IS NULL AND RANDOM() < 0.5;
UPDATE shipments SET customer_id = 3 WHERE customer_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_updated_at ON shipments(updated_at);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);

-- Show current table structure
\d shipments;