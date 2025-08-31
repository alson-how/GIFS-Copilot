/**
 * Refactored Strategic Items Routes (v2)
 * Enhanced strategic items detection system with improved AI-powered classification
 */

import express from 'express';
import { container } from '../../container/Container.js';

const router = express.Router();

// Resolve controller from container
const getController = async () => await container.resolve('strategicItemsController');

/**
 * POST /api/v2/strategic/detect
 * Detect strategic items in a product list using advanced AI and pattern matching
 * 
 * Body:
 * - shipment_id (required): Shipment identifier
 * - product_items (required): Array of product items to analyze
 * - options (optional): Detection options
 *   - forceRedetection: Force redetection even if results exist
 *   - includeMetadata: Include detailed detection metadata
 * 
 * Each product item should contain:
 * - product_description or description: Product description text
 * - hs_code (optional): Harmonized System code
 * - item_id (optional): Unique item identifier
 * 
 * Response:
 * - detection_results: Complete detection analysis
 *   - shipment_id: Shipment identifier
 *   - detection_results: Array of detection results per item
 *   - summary: Aggregated summary statistics
 *   - processing_time: Detection processing time
 */
router.post('/detect', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().detect(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/strategic/shipment/:shipmentId
 * Get comprehensive strategic items status for a shipment
 * 
 * Response:
 * - strategic_status: Complete strategic analysis
 *   - summary: Aggregated statistics
 *   - detection_results: Detailed results per item
 *   - compliance_status: Overall compliance status
 *   - next_actions: Required actions for compliance
 */
router.get('/shipment/:shipmentId', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().getShipmentStatus(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/strategic/validation/:shipmentId
 * Validate export permissions and requirements for a shipment
 * 
 * Response:
 * - validation_result: Export validation analysis
 *   - is_export_approved: Whether export is currently approved
 *   - blocked_items_count: Number of items blocking export
 *   - required_permits: List of required permit types
 *   - validation_warnings: Non-blocking warnings
 *   - validation_errors: Blocking errors that must be resolved
 */
router.get('/validation/:shipmentId', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().validateExport(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/strategic/review
 * Get items requiring manual review with pagination
 * 
 * Query parameters:
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (max 100, default 20)
 * - shipmentId (optional): Filter by specific shipment
 * 
 * Response: Paginated list of items requiring manual review
 * Items are sorted by risk level (critical first) then by creation date
 */
router.get('/review', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().getReviewItems(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v2/strategic/review/:resultId
 * Update manual review status for a detection result
 * 
 * Body:
 * - requires_review (required): Boolean indicating if manual review is required
 * - reason (optional): Reason for the status change
 * 
 * Response:
 * - detection_result: Updated detection result with new review status
 */
router.patch('/review/:resultId', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().updateReviewStatus(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/strategic/statistics
 * Get comprehensive compliance and detection statistics
 * 
 * Query parameters:
 * - start_date (optional): Start date for statistics (ISO format)
 * - end_date (optional): End date for statistics (ISO format)
 * - shipment_id (optional): Filter by specific shipment
 * 
 * Response:
 * - statistics: Comprehensive statistics including:
 *   - Item counts and percentages
 *   - Risk level breakdown
 *   - Confidence score statistics
 *   - Time range analysis
 *   - Compliance metrics
 */
router.get('/statistics', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().getStatistics(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v2/strategic/search
 * Search detection results with complex criteria
 * 
 * Body (search criteria):
 * - shipment_id (optional): Filter by shipment
 * - is_strategic (optional): Filter by strategic status (boolean)
 * - risk_level (optional): Filter by risk level ('low', 'medium', 'high', 'critical')
 * - export_blocked (optional): Filter by export blocked status (boolean)
 * - manual_review_required (optional): Filter by manual review requirement (boolean)
 * - hs_code (optional): Filter by HS code (partial match)
 * - item_description (optional): Filter by item description (partial match)
 * - min_confidence (optional): Minimum confidence score
 * - strategic_codes (optional): Filter by strategic codes (array)
 * 
 * Query parameters:
 * - page (optional): Page number (default 1)
 * - limit (optional): Results per page (max 100, default 20)
 * 
 * Response: Paginated search results sorted by confidence score and date
 */
router.post('/search', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().searchResults(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v2/strategic/reprocess/:shipmentId
 * Reprocess strategic detection for a shipment with latest algorithms
 * 
 * Use this endpoint to re-analyze a shipment with updated detection patterns
 * or after manual corrections to the strategic item database.
 * 
 * Response:
 * - reprocess_result: Results of the reprocessing operation
 */
router.post('/reprocess/:shipmentId', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().reprocessShipment(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/strategic/categories
 * Get available strategic item categories and their detection patterns
 * 
 * Response:
 * - categories: Available detection categories with:
 *   - Description and risk level
 *   - Sample keywords for each category
 *   - Associated strategic codes
 *   - Detection confidence thresholds
 */
router.get('/categories', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().getCategories(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/strategic/hs-codes
 * Get strategic HS codes mapping and their classifications
 * 
 * Response:
 * - hs_codes: Mapping of HS codes to strategic categories
 *   - Risk levels and permit requirements
 *   - Category classifications
 *   - Descriptions for each code
 */
router.get('/hs-codes', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().getHsCodes(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/strategic/health
 * Health check for the strategic detection system
 * 
 * Response:
 * - System status and version information
 * - Available detection features
 * - Confidence thresholds
 * - Supported risk levels
 */
router.get('/health', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().healthCheck(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;