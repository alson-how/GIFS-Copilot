/**
 * Batch Processing API Service
 * Frontend service for batch upload and processing operations
 */

const API_BASE = '/api/batch-processing';

class BatchProcessingAPI {
  /**
   * Initialize a new batch processing session
   * @param {string} userId - User identifier
   * @param {number} fileCount - Number of files to process
   * @param {number} totalSize - Total file size in bytes
   * @returns {Promise<Object>} Batch initialization result
   */
  async initializeBatch(userId, fileCount, totalSize) {
    try {
      const response = await fetch(`${API_BASE}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fileCount, totalSize })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize batch');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Batch initialization failed:', error);
      throw error;
    }
  }

  /**
   * Upload files for batch processing
   * @param {string} batchId - Batch identifier
   * @param {string} userId - User identifier
   * @param {Array} files - Files to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadFiles(batchId, userId, files) {
    try {
      const formData = new FormData();
      formData.append('batchId', batchId);
      formData.append('userId', userId);

      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'File upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw error;
    }
  }

  /**
   * Start OCR processing for a batch
   * @param {string} batchId - Batch identifier
   * @returns {Promise<Object>} Processing results
   */
  async processBatchOCR(batchId) {
    try {
      const response = await fetch(`${API_BASE}/process/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'OCR processing failed');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Save extracted data to database
   * @param {string} batchId - Batch identifier
   * @returns {Promise<Object>} Save results
   */
  async saveStep1ToDatabase(batchId) {
    try {
      const response = await fetch(`${API_BASE}/save/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Database save failed');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Database save failed:', error);
      throw error;
    }
  }

  /**
   * Get batch processing status
   * @param {string} batchId - Batch identifier
   * @returns {Promise<Object>} Batch status
   */
  async getBatchStatus(batchId) {
    try {
      const response = await fetch(`${API_BASE}/status/${batchId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get batch status');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get batch status:', error);
      throw error;
    }
  }

  /**
   * Get recent batch processing sessions
   * @param {number} limit - Maximum number of batches to return
   * @param {string} userId - Optional user filter
   * @returns {Promise<Object>} Recent batches
   */
  async getRecentBatches(limit = 20, userId = null) {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`${API_BASE}/batches/recent?${params}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get recent batches');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get recent batches:', error);
      throw error;
    }
  }

  /**
   * Delete a batch and optionally its shipments
   * @param {string} batchId - Batch identifier
   * @param {boolean} deleteShipments - Whether to delete associated shipments
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBatch(batchId, deleteShipments = false) {
    try {
      const response = await fetch(`${API_BASE}/batch/${batchId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteShipments })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete batch');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to delete batch:', error);
      throw error;
    }
  }

  /**
   * Monitor batch processing with polling
   * @param {string} batchId - Batch identifier
   * @param {Function} onUpdate - Callback for status updates
   * @param {number} interval - Polling interval in milliseconds
   * @returns {Promise<Object>} Final result
   */
  async monitorBatchProcessing(batchId, onUpdate, interval = 2000) {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getBatchStatus(batchId);
          
          // Call update callback
          if (onUpdate) {
            onUpdate(status);
          }

          // Check if processing is complete
          const terminalStates = ['completed', 'completed_with_errors', 'failed', 'saved'];
          if (terminalStates.includes(status.status)) {
            resolve(status);
            return;
          }

          // Continue polling
          setTimeout(poll, interval);

        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  }

  /**
   * Complete batch processing workflow
   * @param {string} userId - User identifier
   * @param {Array} files - Files to process
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Complete workflow result
   */
  async completeWorkflow(userId, files, onProgress) {
    try {
      console.log('🚀 Starting complete batch processing workflow');

      // Step 1: Initialize batch
      onProgress?.({ phase: 'initializing', message: 'Initializing batch processing...' });
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const initResult = await this.initializeBatch(userId, files.length, totalSize);
      
      // Step 2: Upload files
      onProgress?.({ phase: 'uploading', message: 'Uploading files...', batchId: initResult.batchId });
      const uploadResult = await this.uploadFiles(initResult.batchId, userId, files);

      // Step 3: Process with OCR
      onProgress?.({ phase: 'processing', message: 'Processing with OCR...', batchId: initResult.batchId });
      const processResult = await this.processBatchOCR(initResult.batchId);

      // Step 4: Save to database
      onProgress?.({ phase: 'saving', message: 'Saving to database...', batchId: initResult.batchId });
      const saveResult = await this.saveStep1ToDatabase(initResult.batchId);

      console.log('✅ Complete batch processing workflow finished');

      return {
        success: true,
        batchId: initResult.batchId,
        workflow: {
          initialized: initResult,
          uploaded: uploadResult,
          processed: processResult,
          saved: saveResult
        },
        summary: {
          filesProcessed: processResult.processedFiles,
          shipments: saveResult.savedShipments,
          totalValue: saveResult.totalValue,
          nextStep: saveResult.nextStep
        }
      };

    } catch (error) {
      console.error('❌ Complete workflow failed:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const batchProcessingAPI = new BatchProcessingAPI();
export { batchProcessingAPI };
