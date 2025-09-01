-- =============================================
-- Migration: Update 'Under Review' status to 'CREATED'
-- =============================================

-- Update all shipments with 'Under Review' status to 'CREATED'
-- This migration handles existing data that was using the old status
UPDATE shipments 
SET status = 'CREATED'::shipment_status_enum
WHERE status = 'UNDER_REVIEW'::shipment_status_enum;

-- Update step1_status field as well if it exists and contains 'Under Review'
UPDATE shipments 
SET step1_status = 'CREATED'
WHERE step1_status = 'Under Review';

-- Update any status history records that reference the old status
UPDATE shipment_status_history 
SET previous_status = 'CREATED'::shipment_status_enum
WHERE previous_status = 'UNDER_REVIEW'::shipment_status_enum;

UPDATE shipment_status_history 
SET new_status = 'CREATED'::shipment_status_enum
WHERE new_status = 'UNDER_REVIEW'::shipment_status_enum;

-- Log the changes
DO $$
DECLARE
    shipment_count INTEGER;
    history_count INTEGER;
BEGIN
    -- Count updated shipments
    SELECT COUNT(*) INTO shipment_count 
    FROM shipments 
    WHERE status = 'CREATED'::shipment_status_enum;
    
    -- Count updated history records
    SELECT COUNT(*) INTO history_count 
    FROM shipment_status_history 
    WHERE new_status = 'CREATED'::shipment_status_enum 
    OR previous_status = 'CREATED'::shipment_status_enum;
    
    RAISE NOTICE 'Migration completed: % shipments now have CREATED status, % history records updated', 
                 shipment_count, history_count;
END $$;