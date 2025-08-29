import React, { useState, useRef, useCallback } from 'react';

/**
 * Batch Upload Interface - Multi-file upload with progress tracking
 * Handles drag & drop, file validation, and progress monitoring
 */
export default function BatchUploadInterface({ 
  onUploadComplete, 
  userId,
  acceptedTypes = ['.pdf', '.png', '.jpg', '.jpeg'],
  maxFiles = 10,
  maxSizePerFile = 10 * 1024 * 1024 // 10MB
}) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  /**
   * Validate uploaded files
   * @param {FileList} fileList - Files to validate
   * @returns {Object} Validation results
   */
  const validateFiles = (fileList) => {
    const validFiles = [];
    const validationErrors = [];

    Array.from(fileList).forEach((file, index) => {
      // Check file type
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (!acceptedTypes.includes(fileExtension)) {
        validationErrors.push(`File "${file.name}": Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
        return;
      }

      // Check file size
      if (file.size > maxSizePerFile) {
        const maxSizeMB = Math.round(maxSizePerFile / (1024 * 1024));
        validationErrors.push(`File "${file.name}": Too large (${Math.round(file.size / (1024 * 1024))}MB). Max: ${maxSizeMB}MB`);
        return;
      }

      // Check for duplicates
      if (validFiles.find(f => f.name === file.name && f.size === file.size)) {
        validationErrors.push(`File "${file.name}": Duplicate file detected`);
        return;
      }

      validFiles.push({
        id: `file-${Date.now()}-${index}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'ready',
        progress: 0,
        error: null
      });
    });

    // Check total file count
    if (files.length + validFiles.length > maxFiles) {
      validationErrors.push(`Too many files. Maximum allowed: ${maxFiles}`);
      return { validFiles: [], errors: validationErrors };
    }

    return { validFiles, errors: validationErrors };
  };

  /**
   * Handle file selection
   * @param {FileList} fileList - Selected files
   */
  const handleFileSelection = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const { validFiles, errors } = validateFiles(fileList);
    
    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
    setErrors([]);
  };

  /**
   * Handle drag and drop events
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelection(droppedFiles);
  }, [files]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    handleFileSelection(e.target.files);
    e.target.value = ''; // Reset input
  };

  /**
   * Remove file from list
   * @param {string} fileId - File ID to remove
   */
  const removeFile = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId));
    setErrors([]);
  };

  /**
   * Clear all files
   */
  const clearAllFiles = () => {
    setFiles([]);
    setErrors([]);
    setUploadProgress({});
  };

  /**
   * Start batch upload process
   */
  const startUpload = async () => {
    if (files.length === 0) {
      setErrors(['No files selected for upload']);
      return;
    }

    setUploading(true);
    setErrors([]);

    try {
      // Initialize batch processing
      const response = await fetch('/api/batch-processing/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fileCount: files.length,
          totalSize: files.reduce((sum, f) => sum + f.file.size, 0)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize batch processing');
      }

      const initResult = await response.json();
      const batchId = initResult.batchId;

      // Upload files with progress tracking
      const formData = new FormData();
      formData.append('batchId', batchId);
      formData.append('userId', userId);

      files.forEach((fileItem, index) => {
        formData.append('files', fileItem.file);
        formData.append(`fileOrder_${index}`, fileItem.id);
      });

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(prev => ({
            ...prev,
            overall: percentComplete
          }));
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('✅ Batch upload successful:', result);
            
            // Update file statuses
            setFiles(prevFiles => 
              prevFiles.map(f => ({ ...f, status: 'uploaded', progress: 100 }))
            );

            // Notify parent component
            onUploadComplete?.(result);

          } catch (error) {
            console.error('❌ Failed to parse upload response:', error);
            setErrors(['Failed to process upload response']);
          }
        } else {
          console.error('❌ Upload failed with status:', xhr.status);
          setErrors([`Upload failed: ${xhr.statusText}`]);
        }
        setUploading(false);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        console.error('❌ Upload network error');
        setErrors(['Network error during upload']);
        setUploading(false);
      });

      // Start upload
      xhr.open('POST', '/api/batch-processing/upload');
      xhr.send(formData);

    } catch (error) {
      console.error('❌ Upload initiation failed:', error);
      setErrors([`Upload failed: ${error.message}`]);
      setUploading(false);
    }
  };

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Get file type icon
   * @param {string} fileName - File name
   * @returns {string} Icon emoji
   */
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'png': case 'jpg': case 'jpeg': return '🖼️';
      default: return '📎';
    }
  };

  return (
    <div className="batch-upload-interface" style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* Upload Zone */}
      <div 
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        style={{
          border: `2px dashed ${dragOver ? '#5a8cb3' : '#ddd'}`,
          borderRadius: '8px',
          padding: '3rem 2rem',
          textAlign: 'center',
          background: dragOver ? 'rgba(90, 140, 179, 0.05)' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          margin: '1rem'
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          {dragOver ? '📥' : '📁'}
        </div>
        
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>
          {dragOver ? 'Drop files here' : 'Upload Commercial Invoices'}
        </h3>
        
        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
          Drag & drop files or click to browse
        </p>
        
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div>Accepted: {acceptedTypes.join(', ')}</div>
          <div>Max {maxFiles} files, {Math.round(maxSizePerFile / (1024 * 1024))}MB each</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="file-list" style={{ padding: '0 1rem 1rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: 0 }}>
              📋 Selected Files ({files.length}/{maxFiles})
            </h4>
            <button 
              onClick={clearAllFiles}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
              disabled={uploading}
            >
              🗑️ Clear All
            </button>
          </div>

          <div className="files-container" style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {files.map((fileItem, index) => (
              <div 
                key={fileItem.id}
                className="file-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  borderBottom: index < files.length - 1 ? '1px solid var(--border)' : 'none',
                  background: index % 2 === 0 ? 'white' : 'rgba(0,0,0,0.02)'
                }}
              >
                <div className="file-icon" style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>
                  {getFileIcon(fileItem.name)}
                </div>
                
                <div className="file-info" style={{ flex: 1, minWidth: 0 }}>
                  <div className="file-name" style={{ 
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {fileItem.name}
                  </div>
                  <div className="file-details" style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-muted)',
                    marginTop: '0.25rem'
                  }}>
                    {formatFileSize(fileItem.size)} • {fileItem.type}
                  </div>
                </div>

                <div className="file-status" style={{ marginLeft: '1rem' }}>
                  {fileItem.status === 'ready' && (
                    <span style={{ 
                      background: '#e3f2fd', 
                      color: '#1976d2', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>
                      Ready
                    </span>
                  )}
                  {fileItem.status === 'uploading' && (
                    <span style={{ 
                      background: '#fff3e0', 
                      color: '#f57c00', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>
                      {fileItem.progress}%
                    </span>
                  )}
                  {fileItem.status === 'uploaded' && (
                    <span style={{ 
                      background: '#e8f5e8', 
                      color: '#2e7d2e', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>
                      ✓ Done
                    </span>
                  )}
                </div>

                {!uploading && (
                  <button
                    onClick={() => removeFile(fileItem.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      marginLeft: '0.5rem',
                      fontSize: '1.2rem'
                    }}
                    title="Remove file"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress.overall !== undefined && (
            <div className="upload-progress" style={{ marginTop: '1rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                  Uploading files...
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>
                  {uploadProgress.overall}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadProgress.overall || 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #5a8cb3 0%, #4a7c9a 100%)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              onClick={startUpload}
              className="btn btn-primary"
              disabled={uploading || files.length === 0}
              style={{ 
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                background: uploading ? '#ccc' : undefined
              }}
            >
              {uploading ? '⏳ Uploading...' : `🚀 Process ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="error-messages" style={{ 
          padding: '1rem',
          background: '#fee',
          border: '1px solid #fcc',
          margin: '1rem',
          borderRadius: '6px'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#c33' }}>⚠️ Upload Issues:</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {errors.map((error, index) => (
              <li key={index} style={{ color: '#c33', fontSize: '0.9rem' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tips */}
      {files.length === 0 && (
        <div className="upload-tips" style={{
          padding: '1rem',
          background: 'rgba(90, 140, 179, 0.05)',
          margin: '1rem',
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>💡 Tips for Best Results:</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
            <li>Upload clear, high-resolution commercial invoices</li>
            <li>PDF files generally provide better OCR accuracy than images</li>
            <li>Ensure text is not rotated or skewed for optimal extraction</li>
            <li>Multiple invoices can be processed simultaneously</li>
          </ul>
        </div>
      )}
    </div>
  );
}
