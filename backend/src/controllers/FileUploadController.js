/**
 * File Upload Controller
 * Handles HTTP requests for file upload operations
 */

import { BaseController } from './BaseController.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export class FileUploadController extends BaseController {
  constructor(service, logger) {
    super(service, 'FileUploadController');
    this.logger = logger;
    this.setupMulter();
  }

  /**
   * Setup multer for file uploads
   */
  setupMulter() {
    const tempDir = path.join(process.cwd(), 'temp-uploads');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, tempDir);
      },
      filename: (req, file, cb) => {
        // Use timestamp and random string for temp filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const ext = path.extname(file.originalname);
        cb(null, `temp_${timestamp}_${random}${ext}`);
      }
    });

    // Configure multer with file size limits
    this.upload = multer({
      storage: storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max per file
        files: 10 // max 10 files per upload
      },
      fileFilter: (req, file, cb) => {
        // Basic file filter - detailed validation happens in service
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif',
          'application/pdf',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/csv', 'text/plain'
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
      }
    });
  }

  /**
   * Get multer middleware for file uploads
   * @param {string} fieldName - Form field name (default: 'files')
   * @param {number} maxFiles - Maximum number of files (default: 10)
   */
  getUploadMiddleware(fieldName = 'files', maxFiles = 10) {
    return this.upload.array(fieldName, maxFiles);
  }

  /**
   * Handle file upload errors
   */
  handleUploadError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            success: false,
            error: 'File too large',
            details: 'Maximum file size is 50MB'
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            success: false,
            error: 'Too many files',
            details: 'Maximum 10 files per upload'
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            success: false,
            error: 'Unexpected file field',
            details: 'Use "files" field for file uploads'
          });
        default:
          return res.status(400).json({
            success: false,
            error: 'Upload error',
            details: error.message
          });
      }
    }

    if (error.message.includes('Unsupported file type')) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file type',
        details: error.message
      });
    }

    next(error);
  }

  /**
   * Create route handlers
   */
  getRoutes() {
    return {
      // POST /api/v2/uploads - Upload files
      upload: this.asyncRoute(async (req, res) => {
        const { shipment_id, tag = 'other' } = req.body;
        const files = req.files;

        // Validation
        if (!shipment_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing shipment_id',
            details: 'shipment_id is required in request body'
          });
        }

        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No files provided',
            details: 'At least one file must be uploaded'
          });
        }

        // Validate files
        const validation = this.service.validateFiles(files);
        if (!validation.isValid) {
          // Clean up temp files
          for (const file of files) {
            try {
              fs.unlinkSync(file.path);
            } catch (e) {
              // Ignore cleanup errors
            }
          }

          return res.status(400).json({
            success: false,
            error: 'File validation failed',
            details: validation.errors
          });
        }

        // Extract metadata from request
        const metadata = {
          upload_ip: req.ip,
          user_agent: req.get('User-Agent'),
          uploaded_by: req.user?.id || null, // If authentication middleware is used
          api_version: 'v2'
        };

        await this.handleOperation(
          req, res,
          () => this.service.processUploadedFiles(validation.validFiles, shipment_id, tag, metadata),
          'upload',
          { 
            statusCode: 201,
            message: `${validation.validFiles.length} file(s) uploaded successfully`,
            dataKey: 'files'
          }
        );
      }),

      // GET /api/v2/uploads/:shipmentId - Get files for shipment
      getByShipmentId: this.asyncRoute(async (req, res) => {
        const { shipmentId } = req.params;
        const { tag, limit, offset, orderBy, orderDirection } = req.query;

        const options = {
          tag: tag || null,
          limit: limit ? parseInt(limit) : 100,
          offset: offset ? parseInt(offset) : 0,
          orderBy: orderBy || 'uploaded_at',
          orderDirection: orderDirection || 'DESC'
        };

        await this.handleOperation(
          req, res,
          () => this.service.getFilesByShipmentId(shipmentId, options),
          'getByShipmentId',
          { dataKey: 'files' }
        );
      }),

      // GET /api/v2/uploads/:shipmentId/stats - Get file statistics
      getStatistics: this.asyncRoute(async (req, res) => {
        const { shipmentId } = req.params;

        await this.handleOperation(
          req, res,
          () => this.service.getFileStatistics(shipmentId),
          'getStatistics',
          { dataKey: 'statistics' }
        );
      }),

      // GET /api/v2/uploads/file/:fileId/download - Download file
      downloadFile: this.asyncRoute(async (req, res) => {
        const { fileId } = req.params;
        const { shipment_id } = req.query;

        if (!shipment_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing shipment_id',
            details: 'shipment_id query parameter is required'
          });
        }

        try {
          const fileStream = await this.service.getFileStream(fileId, shipment_id);
          
          // Set download headers
          res.set({
            'Content-Type': fileStream.mimetype,
            'Content-Length': fileStream.size,
            'Content-Disposition': `attachment; filename="${fileStream.filename}"`,
            'Cache-Control': 'private, no-cache'
          });

          // Stream the file
          const fs = require('fs');
          const stream = fs.createReadStream(fileStream.path);
          
          stream.on('error', (error) => {
            this.logger.error('File stream error', { fileId, error: error.message });
            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                error: 'File stream error',
                details: 'Unable to stream file'
              });
            }
          });

          stream.pipe(res);

        } catch (error) {
          this.handleError(res, error, 'downloadFile');
        }
      }),

      // DELETE /api/v2/uploads/file/:fileId - Delete specific file
      deleteFile: this.asyncRoute(async (req, res) => {
        const { fileId } = req.params;
        const { shipment_id } = req.body;

        if (!shipment_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing shipment_id',
            details: 'shipment_id is required in request body'
          });
        }

        await this.handleOperation(
          req, res,
          () => this.service.deleteFile(fileId, shipment_id),
          'deleteFile',
          { 
            message: 'File deleted successfully',
            dataKey: 'file'
          }
        );
      }),

      // DELETE /api/v2/uploads/:shipmentId - Bulk delete files
      bulkDeleteFiles: this.asyncRoute(async (req, res) => {
        const { shipmentId } = req.params;
        const { tag } = req.query;

        await this.handleOperation(
          req, res,
          () => this.service.bulkDeleteFiles(shipmentId, tag || null),
          'bulkDeleteFiles',
          { 
            message: 'Files deleted successfully',
            dataKey: 'result'
          }
        );
      }),

      // PATCH /api/v2/uploads/file/:fileId/metadata - Update file metadata
      updateMetadata: this.asyncRoute(async (req, res) => {
        const { fileId } = req.params;
        const { shipment_id, metadata } = req.body;

        if (!shipment_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing shipment_id',
            details: 'shipment_id is required in request body'
          });
        }

        if (!metadata || typeof metadata !== 'object') {
          return res.status(400).json({
            success: false,
            error: 'Invalid metadata',
            details: 'metadata must be a valid object'
          });
        }

        await this.handleOperation(
          req, res,
          () => this.service.updateFileMetadata(fileId, shipment_id, metadata),
          'updateMetadata',
          { 
            message: 'File metadata updated successfully',
            dataKey: 'file'
          }
        );
      }),

      // GET /api/v2/uploads/search - Search files (admin function)
      search: this.asyncRoute(async (req, res) => {
        const criteria = this.extractFilters(req, [
          'shipment_id', 'tag', 'mime_type', 'original_name', 'min_size', 'max_size'
        ]);
        
        const pagination = this.extractPagination(req, {
          orderBy: 'uploaded_at',
          orderDirection: 'DESC'
        });

        await this.handleOperation(
          req, res,
          () => this.service.repository.search(criteria, pagination),
          'search',
          { dataKey: null } // Return pagination object directly
        );
      })
    };
  }

  /**
   * Get entity name for error messages
   */
  getEntityName() {
    return 'File';
  }

  /**
   * Get allowed filter keys
   */
  getAllowedFilters() {
    return ['shipment_id', 'tag', 'mime_type', 'original_name', 'min_size', 'max_size'];
  }
}

export default FileUploadController;