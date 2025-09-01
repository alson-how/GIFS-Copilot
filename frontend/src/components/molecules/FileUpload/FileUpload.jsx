/**
 * FileUpload Molecule
 * Comprehensive file upload component with drag-and-drop, progress, and validation
 */

import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { LoadingSpinner, StatusBadge, ErrorMessage, ProgressIndicator } from '../../atoms';
import './FileUpload.scss';

const FileUpload = ({
  onUpload,
  onFileSelect = null,
  accept = '*/*',
  multiple = false,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  allowedTypes = null,
  showProgress = true,
  showFileList = true,
  dragAndDrop = true,
  disabled = false,
  className = '',
  placeholder = null,
  uploadText = 'Upload Files',
  browseText = 'Browse',
  dropText = 'Drop files here',
  ...props
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  // File validation
  const validateFile = useCallback((file) => {
    const errors = [];

    // Size validation
    if (file.size > maxSize) {
      errors.push(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${(maxSize / 1024 / 1024).toFixed(2)}MB.`);
    }

    // Type validation
    if (allowedTypes && allowedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const mimeTypeAllowed = allowedTypes.includes(file.type);
      const extensionAllowed = allowedTypes.some(type => 
        type.startsWith('.') && type.toLowerCase() === fileExtension
      );
      
      if (!mimeTypeAllowed && !extensionAllowed) {
        errors.push(`File "${file.name}" type is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }
    }

    return errors;
  }, [maxSize, allowedTypes]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles) => {
    if (disabled) return;

    const fileArray = Array.from(selectedFiles);
    let validFiles = [];
    let allErrors = [];

    // Validate total file count
    if (!multiple && fileArray.length > 1) {
      allErrors.push('Only one file can be selected');
      setErrors(allErrors);
      return;
    }

    if (fileArray.length > maxFiles) {
      allErrors.push(`Maximum ${maxFiles} files allowed`);
      setErrors(allErrors);
      return;
    }

    // Validate each file
    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        allErrors.push(...fileErrors);
      } else {
        validFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'ready',
          progress: 0
        });
      }
    });

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    // Clear errors and set files
    setErrors([]);
    
    if (multiple) {
      setFiles(prev => [...prev, ...validFiles]);
    } else {
      setFiles(validFiles);
    }

    // Notify parent component
    if (onFileSelect) {
      onFileSelect(validFiles.map(f => f.file));
    }
  }, [disabled, multiple, maxFiles, validateFile, onFileSelect]);

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && dragAndDrop) {
      setIsDragOver(true);
    }
  }, [disabled, dragAndDrop]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled || !dragAndDrop) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, [disabled, dragAndDrop, handleFileSelect]);

  // Handle input change
  const handleInputChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(selectedFiles);
    }
  };

  // Open file picker
  const openFilePicker = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Remove file
  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  // Handle upload
  const handleUpload = async () => {
    if (!onUpload || files.length === 0 || uploading) return;

    setUploading(true);
    const filesToUpload = files.filter(f => f.status === 'ready');

    try {
      for (const fileData of filesToUpload) {
        // Update file status
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'uploading' }
            : f
        ));

        // Simulate progress updates (replace with real progress in actual implementation)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: Math.min(100, (prev[fileData.id] || 0) + Math.random() * 30)
          }));
        }, 200);

        try {
          await onUpload(fileData.file, (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileData.id]: progress
            }));
          });

          clearInterval(progressInterval);
          
          // Mark as completed
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'completed' }
              : f
          ));
          
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: 100
          }));

        } catch (error) {
          clearInterval(progressInterval);
          
          // Mark as failed
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'failed', error: error.message }
              : f
          ));
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const fileUploadClasses = [
    'file-upload',
    isDragOver && 'file-upload--drag-over',
    disabled && 'file-upload--disabled',
    className
  ].filter(Boolean).join(' ');

  const dropZoneClasses = [
    'file-upload__drop-zone',
    isDragOver && 'file-upload__drop-zone--active',
    disabled && 'file-upload__drop-zone--disabled'
  ].filter(Boolean).join(' ');

  return (
    <div className={fileUploadClasses} {...props}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="file-upload__input"
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {/* Drop zone */}
      {dragAndDrop && (
        <div
          className={dropZoneClasses}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload files by clicking or dragging and dropping"
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              openFilePicker();
            }
          }}
        >
          <div className="file-upload__drop-zone-content">
            <div className="file-upload__icon" aria-hidden="true">
              📁
            </div>
            <div className="file-upload__text">
              {isDragOver ? (
                <span className="file-upload__drop-text">{dropText}</span>
              ) : (
                <>
                  <span className="file-upload__primary-text">
                    {placeholder || `${browseText} or drag and drop files`}
                  </span>
                  <span className="file-upload__secondary-text">
                    {allowedTypes ? `Accepted: ${allowedTypes.join(', ')}` : ''}
                    {maxSize && ` • Max size: ${(maxSize / 1024 / 1024).toFixed(0)}MB`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simple upload button (when drag and drop is disabled) */}
      {!dragAndDrop && (
        <div className="file-upload__simple">
          <button
            type="button"
            className="file-upload__browse-btn"
            onClick={openFilePicker}
            disabled={disabled}
          >
            {browseText}
          </button>
          {placeholder && (
            <span className="file-upload__placeholder">{placeholder}</span>
          )}
        </div>
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="file-upload__errors">
          {errors.map((error, index) => (
            <ErrorMessage key={index} variant="validation" size="small">
              {error}
            </ErrorMessage>
          ))}
        </div>
      )}

      {/* File list */}
      {showFileList && files.length > 0 && (
        <div className="file-upload__file-list">
          <h4 className="file-upload__file-list-title">
            Selected Files ({files.length})
          </h4>
          
          {files.map((fileData) => (
            <div key={fileData.id} className="file-upload__file-item">
              <div className="file-upload__file-info">
                <div className="file-upload__file-name">{fileData.name}</div>
                <div className="file-upload__file-details">
                  {(fileData.size / 1024).toFixed(1)} KB
                  {fileData.type && ` • ${fileData.type}`}
                </div>
              </div>

              <div className="file-upload__file-status">
                {fileData.status === 'ready' && (
                  <StatusBadge variant="pending" size="small">Ready</StatusBadge>
                )}
                {fileData.status === 'uploading' && (
                  <div className="file-upload__file-progress">
                    {showProgress && (
                      <ProgressIndicator
                        variant="linear"
                        size="small"
                        value={uploadProgress[fileData.id] || 0}
                        max={100}
                        showLabel={false}
                        animated={true}
                      />
                    )}
                    <StatusBadge variant="info" size="small">
                      <LoadingSpinner size="small" variant="white" />
                      Uploading
                    </StatusBadge>
                  </div>
                )}
                {fileData.status === 'completed' && (
                  <StatusBadge variant="success" size="small">Uploaded</StatusBadge>
                )}
                {fileData.status === 'failed' && (
                  <StatusBadge variant="error" size="small" title={fileData.error}>
                    Failed
                  </StatusBadge>
                )}
              </div>

              <button
                type="button"
                className="file-upload__remove-btn"
                onClick={() => removeFile(fileData.id)}
                aria-label={`Remove ${fileData.name}`}
                disabled={fileData.status === 'uploading'}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && onUpload && (
        <div className="file-upload__actions">
          <button
            type="button"
            className="file-upload__upload-btn"
            onClick={handleUpload}
            disabled={disabled || uploading || files.every(f => f.status !== 'ready')}
          >
            {uploading ? (
              <>
                <LoadingSpinner size="small" variant="white" />
                Uploading...
              </>
            ) : (
              uploadText
            )}
          </button>
        </div>
      )}
    </div>
  );
};

FileUpload.propTypes = {
  /** Function called when files should be uploaded */
  onUpload: PropTypes.func,
  /** Function called when files are selected */
  onFileSelect: PropTypes.func,
  /** File input accept attribute */
  accept: PropTypes.string,
  /** Whether multiple files can be selected */
  multiple: PropTypes.bool,
  /** Maximum number of files */
  maxFiles: PropTypes.number,
  /** Maximum file size in bytes */
  maxSize: PropTypes.number,
  /** Allowed file types array (MIME types or extensions) */
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  /** Whether to show upload progress */
  showProgress: PropTypes.bool,
  /** Whether to show the file list */
  showFileList: PropTypes.bool,
  /** Whether to enable drag and drop */
  dragAndDrop: PropTypes.bool,
  /** Whether the upload is disabled */
  disabled: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Upload button text */
  uploadText: PropTypes.string,
  /** Browse button text */
  browseText: PropTypes.string,
  /** Drop zone text */
  dropText: PropTypes.string
};

export default FileUpload;