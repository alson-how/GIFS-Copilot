/**
 * File Upload Service
 * Business logic for file upload operations
 */

import { BaseService } from './BaseService.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class FileUploadService extends BaseService {
  constructor(repository, database, logger) {
    super(repository, logger);
    this.database = database;
    this.uploadPath = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
    
    // Supported file types and their limits
    this.fileTypeConfig = {
      'image/jpeg': { maxSize: 10 * 1024 * 1024, extensions: ['.jpg', '.jpeg'] },
      'image/png': { maxSize: 10 * 1024 * 1024, extensions: ['.png'] },
      'image/gif': { maxSize: 5 * 1024 * 1024, extensions: ['.gif'] },
      'application/pdf': { maxSize: 50 * 1024 * 1024, extensions: ['.pdf'] },
      'application/vnd.ms-excel': { maxSize: 25 * 1024 * 1024, extensions: ['.xls'] },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { 
        maxSize: 25 * 1024 * 1024, 
        extensions: ['.xlsx'] 
      },
      'application/msword': { maxSize: 25 * 1024 * 1024, extensions: ['.doc'] },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
        maxSize: 25 * 1024 * 1024, 
        extensions: ['.docx'] 
      },
      'text/csv': { maxSize: 10 * 1024 * 1024, extensions: ['.csv'] },
      'text/plain': { maxSize: 5 * 1024 * 1024, extensions: ['.txt'] }
    };

    this.maxFilesPerUpload = 10;
  }

  /**
   * Initialize upload directory
   */
  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(this.uploadPath, { recursive: true });
        this.logger.info('Created upload directory', { path: this.uploadPath });
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate uploaded files
   * @param {Array} files - Multer files array
   * @returns {Object} Validation result
   */
  validateFiles(files) {
    const errors = [];
    const validFiles = [];

    if (!files || files.length === 0) {
      return { isValid: false, errors: ['No files provided'], validFiles: [] };
    }

    if (files.length > this.maxFilesPerUpload) {
      return { 
        isValid: false, 
        errors: [`Maximum ${this.maxFilesPerUpload} files allowed per upload`], 
        validFiles: [] 
      };
    }

    for (const file of files) {
      const fileErrors = [];

      // Check file type
      const config = this.fileTypeConfig[file.mimetype];
      if (!config) {
        fileErrors.push(`Unsupported file type: ${file.mimetype}`);
      } else {
        // Check file size
        if (file.size > config.maxSize) {
          fileErrors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: ${(config.maxSize / 1024 / 1024).toFixed(2)}MB)`);
        }

        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!config.extensions.includes(ext)) {
          fileErrors.push(`Invalid file extension: ${ext}`);
        }
      }

      // Check filename length
      if (file.originalname.length > 255) {
        fileErrors.push('Filename too long (max 255 characters)');
      }

      if (fileErrors.length > 0) {
        errors.push({
          filename: file.originalname,
          errors: fileErrors
        });
      } else {
        validFiles.push(file);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validFiles
    };
  }

  /**
   * Generate secure filename
   * @param {string} shipmentId - Shipment ID
   * @param {string} originalName - Original filename
   * @returns {string} Secure filename
   */
  generateSecureFilename(shipmentId, originalName) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 50); // Limit basename length

    const safeShipmentId = shipmentId.replace(/[^a-zA-Z0-9-_]/g, '');
    
    return `${safeShipmentId}_${timestamp}_${randomBytes}_${baseName}${ext}`;
  }

  /**
   * Process and save uploaded files
   * @param {Array} files - Validated files
   * @param {string} shipmentId - Shipment ID
   * @param {string} tag - File tag/category
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Array>} Processed file records
   */
  async processUploadedFiles(files, shipmentId, tag = 'other', metadata = {}) {
    await this.ensureUploadDirectory();

    const processedFiles = [];
    const tempPaths = []; // Track temp paths for cleanup on error

    try {
      for (const file of files) {
        const secureFilename = this.generateSecureFilename(shipmentId, file.originalname);
        const finalPath = path.join(this.uploadPath, secureFilename);

        // Move file from temp location to final location
        await fs.rename(file.path, finalPath);
        tempPaths.push(finalPath);

        // Generate file hash for integrity checking
        const fileBuffer = await fs.readFile(finalPath);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Prepare file data for database
        const fileData = {
          shipment_id: shipmentId,
          tag: tag,
          original_name: file.originalname,
          mime_type: file.mimetype,
          file_path: finalPath,
          size_bytes: file.size,
          metadata: {
            ...metadata,
            hash: fileHash,
            upload_ip: metadata.upload_ip,
            user_agent: metadata.user_agent,
            processing_time: Date.now()
          }
        };

        processedFiles.push(fileData);
      }

      // Save all files to database in a transaction
      const savedFiles = await this.repository.createMultiple(processedFiles);

      this.logger.info('Files uploaded successfully', {
        shipmentId,
        fileCount: savedFiles.length,
        totalSize: processedFiles.reduce((sum, f) => sum + f.size_bytes, 0)
      });

      return savedFiles;

    } catch (error) {
      // Clean up files on error
      for (const tempPath of tempPaths) {
        try {
          await fs.unlink(tempPath);
        } catch (cleanupError) {
          this.logger.error('Failed to cleanup file on error', { 
            path: tempPath, 
            error: cleanupError 
          });
        }
      }

      this.logger.error('File upload processing failed', { 
        shipmentId, 
        error: error.message 
      });

      throw error;
    }
  }

  /**
   * Get files by shipment ID with filtering
   * @param {string} shipmentId - Shipment ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} File records
   */
  async getFilesByShipmentId(shipmentId, options = {}) {
    const { tag, limit = 100, offset = 0, orderBy = 'uploaded_at', orderDirection = 'DESC' } = options;

    const files = await this.repository.getByShipmentId(
      shipmentId, 
      tag, 
      { limit, offset, orderBy, orderDirection }
    );

    // Add file URL for each file (if needed)
    return files.map(file => ({
      ...file,
      download_url: `/api/v2/uploads/${file.id}/download`,
      metadata: typeof file.upload_metadata === 'string' 
        ? JSON.parse(file.upload_metadata) 
        : file.upload_metadata
    }));
  }

  /**
   * Get file statistics for a shipment
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object>} File statistics
   */
  async getFileStatistics(shipmentId) {
    const stats = await this.repository.getStatsByShipmentId(shipmentId);
    
    const summary = {
      total_files: 0,
      total_size: 0,
      tags: {},
      first_upload: null,
      last_upload: null
    };

    for (const stat of stats) {
      summary.total_files += parseInt(stat.file_count);
      summary.total_size += parseInt(stat.total_size);
      summary.tags[stat.tag] = {
        file_count: parseInt(stat.file_count),
        total_size: parseInt(stat.total_size)
      };

      if (!summary.first_upload || stat.first_upload < summary.first_upload) {
        summary.first_upload = stat.first_upload;
      }
      if (!summary.last_upload || stat.last_upload > summary.last_upload) {
        summary.last_upload = stat.last_upload;
      }
    }

    return summary;
  }

  /**
   * Delete file by ID
   * @param {string} fileId - File ID
   * @param {string} shipmentId - Shipment ID (for security)
   * @returns {Promise<Object>} Deleted file info
   */
  async deleteFile(fileId, shipmentId) {
    const file = await this.repository.getByIdAndShipmentId(fileId, shipmentId);
    
    if (!file) {
      throw new Error(`File ${fileId} not found for shipment ${shipmentId}`);
    }

    // Delete from database
    await this.repository.deleteById(fileId);

    // Delete physical file
    try {
      await fs.unlink(file.file_path);
    } catch (error) {
      this.logger.warn('Failed to delete physical file', { 
        fileId, 
        path: file.file_path, 
        error: error.message 
      });
    }

    this.logger.info('File deleted', { fileId, shipmentId, originalName: file.original_name });

    return {
      id: fileId,
      original_name: file.original_name,
      deleted_at: new Date().toISOString()
    };
  }

  /**
   * Get file stream for download
   * @param {string} fileId - File ID
   * @param {string} shipmentId - Shipment ID (for security)
   * @returns {Promise<Object>} File stream info
   */
  async getFileStream(fileId, shipmentId) {
    const file = await this.repository.getByIdAndShipmentId(fileId, shipmentId);
    
    if (!file) {
      throw new Error(`File ${fileId} not found for shipment ${shipmentId}`);
    }

    // Check if physical file exists
    try {
      await fs.access(file.file_path);
    } catch (error) {
      throw new Error(`Physical file not found: ${file.file_path}`);
    }

    return {
      file,
      path: file.file_path,
      filename: file.original_name,
      mimetype: file.mime_type,
      size: file.size_bytes
    };
  }

  /**
   * Update file metadata
   * @param {string} fileId - File ID
   * @param {string} shipmentId - Shipment ID (for security)
   * @param {Object} metadata - New metadata
   * @returns {Promise<Object>} Updated file record
   */
  async updateFileMetadata(fileId, shipmentId, metadata) {
    const existingFile = await this.repository.getByIdAndShipmentId(fileId, shipmentId);
    
    if (!existingFile) {
      throw new Error(`File ${fileId} not found for shipment ${shipmentId}`);
    }

    const existingMetadata = typeof existingFile.upload_metadata === 'string' 
      ? JSON.parse(existingFile.upload_metadata) 
      : existingFile.upload_metadata || {};

    const updatedMetadata = {
      ...existingMetadata,
      ...metadata,
      updated_at: new Date().toISOString()
    };

    return await this.repository.updateMetadata(fileId, updatedMetadata);
  }

  /**
   * Bulk delete files by shipment ID and tag
   * @param {string} shipmentId - Shipment ID
   * @param {string|null} tag - Optional tag filter
   * @returns {Promise<Object>} Deletion summary
   */
  async bulkDeleteFiles(shipmentId, tag = null) {
    const filesToDelete = await this.repository.getByShipmentId(shipmentId, tag);
    
    if (filesToDelete.length === 0) {
      return {
        deleted_count: 0,
        files: []
      };
    }

    // Delete from database
    const deletedFiles = await this.repository.deleteByShipmentId(shipmentId, tag);

    // Delete physical files
    let physicalDeleteErrors = 0;
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file.file_path);
      } catch (error) {
        physicalDeleteErrors++;
        this.logger.warn('Failed to delete physical file during bulk delete', { 
          fileId: file.id,
          path: file.file_path, 
          error: error.message 
        });
      }
    }

    this.logger.info('Bulk file deletion completed', {
      shipmentId,
      tag,
      deletedCount: deletedFiles.length,
      physicalDeleteErrors
    });

    return {
      deleted_count: deletedFiles.length,
      files: deletedFiles,
      physical_delete_errors: physicalDeleteErrors
    };
  }
}

export default FileUploadService;