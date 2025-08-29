/**
 * Strategic Items API Routes
 * Malaysian Strategic Trade Act 2010 Compliance System
 * 
 * Endpoints:
 * - POST /permits/upload - Upload permits for strategic items
 * - GET /export/validation/:shipmentId - Validate export permissions
 * - GET /strategic/status/:shipmentId - Get strategic items status
 * - POST /strategic/detect - Run strategic items detection
 * - GET /permits/status/:shipmentId - Get permit status
 * - POST /strategic/manual-review - Submit for manual review
 */

import express from 'express';
import multer from 'multer';
import StrategicDetectionEngine from '../services/strategicDetectionEngine.js';
import PermitEnforcementSystem from '../services/permitEnforcementSystem.js';

const router = express.Router();

// Configure multer for permit uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document formats
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Please upload PDF, DOC, Excel, or image files.'), false);
        }
    }
});

// Initialize services
let detectionEngine;
let permitSystem;

const initializeServices = async (req, res, next) => {
    try {
        if (!detectionEngine) {
            detectionEngine = new StrategicDetectionEngine(req.db);
            await detectionEngine.initialize();
        }
        
        if (!permitSystem) {
            permitSystem = new PermitEnforcementSystem(req.db);
            await permitSystem.initialize();
        }
        
        req.detectionEngine = detectionEngine;
        req.permitSystem = permitSystem;
        next();
    } catch (error) {
        console.error('❌ Failed to initialize strategic services:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize strategic items services'
        });
    }
};

/**
 * POST /api/strategic/permits/upload
 * Upload permit for strategic items
 */
router.post('/permits/upload', upload.single('permit'), initializeServices, async (req, res) => {
    try {
        const { shipment_id, permit_type, uploaded_by = 'user' } = req.body;
        
        if (!shipment_id || !permit_type || !req.file) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: shipment_id, permit_type, and permit file'
            });
        }
        
        console.log(`📤 Permit upload request: ${permit_type} for shipment ${shipment_id}`);
        
        // Upload and validate permit
        const result = await req.permitSystem.uploadPermit(
            shipment_id,
            permit_type,
            req.file.buffer,
            req.file.originalname,
            uploaded_by
        );
        
        // Get updated permit status
        const permitStatus = await req.permitSystem.getPermitStatus(shipment_id);
        
        res.json({
            success: true,
            message: 'Permit uploaded and validated successfully',
            data: {
                permit_upload: result,
                permit_status: permitStatus
            }
        });
        
    } catch (error) {
        console.error('❌ Permit upload failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Permit upload failed'
        });
    }
});

/**
 * GET /api/strategic/export/validation/:shipmentId
 * Validate export permissions for shipment
 */
router.get('/export/validation/:shipmentId', initializeServices, async (req, res) => {
    try {
        const { shipmentId } = req.params;
        
        console.log(`🔒 Export validation request for shipment ${shipmentId}`);
        
        // Validate export permissions
        const validationResult = await req.detectionEngine.validateExportPermissions(shipmentId);
        
        res.json({
            success: true,
            message: 'Export validation completed',
            data: validationResult
        });
        
    } catch (error) {
        console.error('❌ Export validation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Export validation failed'
        });
    }
});

/**
 * GET /api/strategic/status/:shipmentId
 * Get strategic items status for shipment
 */
router.get('/status/:shipmentId', initializeServices, async (req, res) => {
    try {
        const { shipmentId } = req.params;
        
        console.log(`📊 Strategic status request for shipment ${shipmentId}`);
        
        // Get strategic items status
        const strategicStatus = await req.detectionEngine.getShipmentStrategicStatus(shipmentId);
        
        // Get permit status
        const permitStatus = await req.permitSystem.getPermitStatus(shipmentId);
        
        // Get detailed detection results
        const detectionQuery = `
            SELECT 
                id, item_description, hs_code, final_confidence_score,
                is_strategic, strategic_codes, required_permits,
                export_blocked, manual_review_required, created_at
            FROM strategic_detection_results
            WHERE shipment_id = $1
            ORDER BY created_at ASC
        `;
        
        const { rows: detectionResults } = await req.db.query(detectionQuery, [shipmentId]);
        
        res.json({
            success: true,
            message: 'Strategic items status retrieved',
            data: {
                strategic_status: strategicStatus,
                permit_status: permitStatus,
                detection_results: detectionResults
            }
        });
        
    } catch (error) {
        console.error('❌ Strategic status retrieval failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get strategic items status'
        });
    }
});

/**
 * POST /api/strategic/detect
 * Run strategic items detection on product items
 */
router.post('/detect', initializeServices, async (req, res) => {
    try {
        const { shipment_id, product_items } = req.body;
        
        if (!shipment_id || !product_items || !Array.isArray(product_items)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: shipment_id and product_items array'
            });
        }
        
        console.log(`🔍 Strategic detection request for shipment ${shipment_id} with ${product_items.length} items`);
        
        // Process shipment for strategic items
        const detectionResults = await req.detectionEngine.processShipment(shipment_id, product_items);
        
        res.json({
            success: true,
            message: 'Strategic items detection completed',
            data: detectionResults
        });
        
    } catch (error) {
        console.error('❌ Strategic detection failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Strategic items detection failed'
        });
    }
});

/**
 * GET /api/strategic/permits/status/:shipmentId
 * Get detailed permit status for shipment
 */
router.get('/permits/status/:shipmentId', initializeServices, async (req, res) => {
    try {
        const { shipmentId } = req.params;
        
        console.log(`📋 Permit status request for shipment ${shipmentId}`);
        
        const permitStatus = await req.permitSystem.getPermitStatus(shipmentId);
        
        res.json({
            success: true,
            message: 'Permit status retrieved',
            data: permitStatus
        });
        
    } catch (error) {
        console.error('❌ Permit status retrieval failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get permit status'
        });
    }
});

/**
 * POST /api/strategic/manual-review
 * Submit item for manual review
 */
router.post('/manual-review', initializeServices, async (req, res) => {
    try {
        const { detection_result_id, shipment_id, review_reason, priority = 'normal' } = req.body;
        
        if (!detection_result_id || !shipment_id || !review_reason) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: detection_result_id, shipment_id, review_reason'
            });
        }
        
        console.log(`📋 Manual review request for detection result ${detection_result_id}`);
        
        // Add to manual review queue
        const query = `
            INSERT INTO strategic_manual_review_queue (
                detection_result_id, shipment_id, review_reason, priority
            ) VALUES ($1, $2, $3, $4)
            RETURNING id, created_at
        `;
        
        const { rows } = await req.db.query(query, [
            detection_result_id,
            shipment_id,
            review_reason,
            priority
        ]);
        
        // Update detection result to require manual review
        await req.db.query(`
            UPDATE strategic_detection_results 
            SET manual_review_required = true, updated_at = NOW()
            WHERE id = $1
        `, [detection_result_id]);
        
        // Create audit trail
        await req.db.query(`
            INSERT INTO strategic_audit_trail (
                shipment_id, action_type, action_details
            ) VALUES ($1, $2, $3)
        `, [
            shipment_id,
            'MANUAL_REVIEW_REQUEST',
            JSON.stringify({
                detection_result_id,
                review_reason,
                priority,
                queue_id: rows[0].id
            })
        ]);
        
        res.json({
            success: true,
            message: 'Item submitted for manual review',
            data: {
                queue_id: rows[0].id,
                created_at: rows[0].created_at
            }
        });
        
    } catch (error) {
        console.error('❌ Manual review submission failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to submit for manual review'
        });
    }
});

/**
 * GET /api/strategic/compliance/dashboard
 * Get compliance dashboard statistics
 */
router.get('/compliance/dashboard', initializeServices, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        console.log(`📊 Compliance dashboard request for last ${days} days`);
        
        // Get compliance statistics
        const statsQuery = `
            SELECT 
                date,
                total_shipments,
                strategic_items_detected,
                exports_blocked,
                permits_uploaded,
                manual_reviews_pending,
                compliance_rate,
                avg_detection_confidence
            FROM strategic_compliance_stats
            WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            ORDER BY date DESC
        `;
        
        const { rows: dailyStats } = await req.db.query(statsQuery);
        
        // Get current totals
        const totalsQuery = `
            SELECT 
                COUNT(DISTINCT s.shipment_id) as total_shipments,
                COUNT(DISTINCT CASE WHEN s.is_strategic = true THEN s.shipment_id END) as shipments_with_strategic,
                COUNT(CASE WHEN s.is_strategic = true THEN 1 END) as total_strategic_items,
                COUNT(CASE WHEN s.export_blocked = true THEN 1 END) as blocked_items,
                COUNT(DISTINCT p.shipment_id) as shipments_with_permits,
                COUNT(CASE WHEN p.is_valid = true THEN 1 END) as valid_permits,
                COUNT(DISTINCT mr.shipment_id) as shipments_pending_review
            FROM strategic_detection_results s
            LEFT JOIN permit_uploads p ON s.shipment_id = p.shipment_id
            LEFT JOIN strategic_manual_review_queue mr ON s.id = mr.detection_result_id AND mr.status = 'pending'
            WHERE s.created_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
        `;
        
        const { rows: totals } = await req.db.query(totalsQuery);
        
        // Get permit type breakdown
        const permitBreakdownQuery = `
            SELECT 
                permit_type,
                COUNT(*) as total_uploads,
                COUNT(CASE WHEN is_valid = true THEN 1 END) as valid_uploads,
                COUNT(CASE WHEN is_valid = false THEN 1 END) as invalid_uploads
            FROM permit_uploads
            WHERE uploaded_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            GROUP BY permit_type
            ORDER BY total_uploads DESC
        `;
        
        const { rows: permitBreakdown } = await req.db.query(permitBreakdownQuery);
        
        res.json({
            success: true,
            message: 'Compliance dashboard data retrieved',
            data: {
                daily_stats: dailyStats,
                totals: totals[0],
                permit_breakdown: permitBreakdown,
                period_days: parseInt(days)
            }
        });
        
    } catch (error) {
        console.error('❌ Compliance dashboard failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get compliance dashboard data'
        });
    }
});

/**
 * POST /api/strategic/compliance/check
 * Force compliance check for shipment
 */
router.post('/compliance/check/:shipmentId', initializeServices, async (req, res) => {
    try {
        const { shipmentId } = req.params;
        
        console.log(`🔒 Force compliance check for shipment ${shipmentId}`);
        
        const complianceResult = await req.permitSystem.checkShipmentCompliance(shipmentId);
        
        res.json({
            success: true,
            message: 'Compliance check completed',
            data: complianceResult
        });
        
    } catch (error) {
        console.error('❌ Compliance check failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Compliance check failed'
        });
    }
});

/**
 * Error handler for multer
 */
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 50MB.'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        error: error.message || 'An error occurred'
    });
});

export default router;
