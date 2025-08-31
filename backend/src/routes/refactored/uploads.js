/**
 * Refactored File Upload Routes (v2)
 * Enhanced file upload system with improved error handling, security, and features
 */

import express from 'express';
import { container } from '../../container/Container.js';

const router = express.Router();

// Resolve controller from container
const getController = async () => await container.resolve('fileUploadController');

/**
 * POST /api/v2/uploads
 * Upload files for a shipment
 * 
 * Body (multipart/form-data):
 * - shipment_id (required): Shipment identifier
 * - tag (optional): File category/tag (default: 'other')
 * - files[]: Array of files to upload (max 10)
 * 
 * Supported file types:
 * - Images: JPEG, PNG, GIF (max 10MB each)
 * - Documents: PDF (max 50MB), DOC/DOCX, XLS/XLSX (max 25MB each)
 * - Text: CSV, TXT (max 10MB and 5MB respectively)
 */
router.post('/', async (req, res, next) => {
  try {
    const controller = await getController();
    const uploadMiddleware = controller.getUploadMiddleware('files', 10);
    
    // Apply multer middleware
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return controller.handleUploadError(err, req, res, next);
      }
      
      // Call the upload route handler
      controller.getRoutes().upload(req, res, next);
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/uploads/:shipmentId
 * Get all files for a specific shipment
 * 
 * Query parameters:
 * - tag (optional): Filter by file tag
 * - limit (optional): Number of results (max 100, default 100)
 * - offset (optional): Results offset (default 0)
 * - orderBy (optional): Sort field (default: uploaded_at)
 * - orderDirection (optional): Sort direction ASC/DESC (default: DESC)
 * 
 * Response:
 * - files: Array of file objects with download URLs
 * - Each file includes metadata and download_url
 */
router.get('/:shipmentId', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().getByShipmentId(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/uploads/:shipmentId/stats
 * Get file upload statistics for a shipment
 * 
 * Response:
 * - total_files: Total number of files
 * - total_size: Total size in bytes
 * - tags: Breakdown by tag with counts and sizes
 * - first_upload: Timestamp of first upload
 * - last_upload: Timestamp of last upload
 */
router.get('/:shipmentId/stats', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().getStatistics(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/uploads/file/:fileId/download
 * Download a specific file
 * 
 * Query parameters:
 * - shipment_id (required): Shipment ID for security validation
 * 
 * Response: File stream with appropriate headers for download
 */
router.get('/file/:fileId/download', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().downloadFile(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v2/uploads/file/:fileId
 * Delete a specific file
 * 
 * Body:
 * - shipment_id (required): Shipment ID for security validation
 * 
 * Response:
 * - file: Deleted file information
 */
router.delete('/file/:fileId', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().deleteFile(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v2/uploads/:shipmentId
 * Bulk delete files for a shipment
 * 
 * Query parameters:
 * - tag (optional): Delete only files with specific tag
 * 
 * Response:
 * - result: Deletion summary including count and any errors
 */
router.delete('/:shipmentId', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().bulkDeleteFiles(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v2/uploads/file/:fileId/metadata
 * Update file metadata
 * 
 * Body:
 * - shipment_id (required): Shipment ID for security validation
 * - metadata (required): Metadata object to merge with existing metadata
 * 
 * Response:
 * - file: Updated file record with new metadata
 */
router.patch('/file/:fileId/metadata', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().updateMetadata(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/uploads/search
 * Search files across multiple shipments (admin function)
 * 
 * Query parameters:
 * - shipment_id (optional): Filter by shipment
 * - tag (optional): Filter by tag
 * - mime_type (optional): Filter by MIME type (partial match)
 * - original_name (optional): Filter by filename (partial match)
 * - min_size (optional): Minimum file size in bytes
 * - max_size (optional): Maximum file size in bytes
 * - page (optional): Page number (default 1)
 * - limit (optional): Results per page (max 100, default 20)
 * - orderBy (optional): Sort field (default: uploaded_at)
 * - orderDirection (optional): Sort direction ASC/DESC (default: DESC)
 * 
 * Response: Paginated results with files and pagination info
 */
router.get('/search', async (req, res, next) => {
  try {
    const controller = await getController();
    return controller.getRoutes().search(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;