import React, { useState, useRef } from 'react';

/**
 * Document OCR Upload Component
 * Handles document upload, OCR processing, and auto-fill suggestions
 */
export default function DocumentOCR({ shipmentId, onAutoFill, onDocumentsProcessed }) {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [autoFillSuggestions, setAutoFillSuggestions] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    
    // Add shipment ID if available
    if (shipmentId) {
      formData.append('shipment_id', shipmentId);
    }
    
    // Add files to form data
    Array.from(files).forEach(file => {
      formData.append('documents', file);
    });

    try {
      console.log('🔍 Uploading documents for OCR processing...');
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ Documents processed:', result);

      // Update state with processed documents
      setDocuments(result.documents);
      setAutoFillSuggestions(result.fieldSuggestions);
      
      // Notify parent components
      if (onDocumentsProcessed) {
        onDocumentsProcessed(result);
      }

      // Show success message
      alert(`✅ Successfully processed ${result.processedFiles}/${result.totalFiles} documents!\n\n` +
            `Found: ${result.documents.map(d => d.documentType).join(', ')}`);

    } catch (error) {
      console.error('❌ Document upload error:', error);
      alert(`❌ Error processing documents: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Apply auto-fill suggestions
  const applyAutoFill = () => {
    if (autoFillSuggestions && onAutoFill) {
      console.log('🔄 Applying auto-fill suggestions:', autoFillSuggestions);
      onAutoFill(autoFillSuggestions);
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return '#10b981'; // Green
    if (confidence >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  // Get document type icon
  const getDocumentIcon = (docType) => {
    const icons = {
      'Commercial Invoice': '🧾',
      'Bill of Lading': '🚢',
      'Packing List': '📦',
      'Certificate of Origin': '🌍',
      'Insurance Certificate': '🛡️',
      'Import Permit': '📋',
      'Letter of Credit': '💰',
      'Delivery Order': '📄',
      'Technical Documentation': '🔧',
      'Unknown': '❓'
    };
    return icons[docType] || icons['Unknown'];
  };

  return (
    <div style={{
      background: 'rgba(16, 185, 129, 0.05)',
      border: '1px solid rgba(16, 185, 129, 0.2)',
      borderRadius: '12px',
      padding: '1.5rem',
      marginTop: '1rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div>
          <h4 style={{
            color: '#10b981',
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>
            📄 Smart Document Processing
          </h4>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            margin: '0.25rem 0 0 0'
          }}>
            Upload customs documents for automatic data extraction and form auto-fill
          </p>
        </div>
        {autoFillSuggestions && (
          <button
            className="btn btn-primary"
            onClick={applyAutoFill}
            style={{
              background: '#10b981',
              borderColor: '#10b981',
              fontSize: '0.85rem',
              padding: '0.5rem 1rem'
            }}
          >
            ✨ Auto-Fill Form
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div
        style={{
          border: `2px dashed ${dragActive ? '#10b981' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          background: dragActive ? 'rgba(16, 185, 129, 0.1)' : 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '1rem'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
            <div style={{ color: 'var(--primary)', fontWeight: '500' }}>
              Processing documents with OCR...
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Extracting data from uploaded files
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📤</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: '500', marginBottom: '0.5rem' }}>
              Drop documents here or click to browse
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Supports: PDF, JPEG, PNG, TIFF • Max 10MB per file • Up to 5 files
            </div>
            <div style={{ 
              color: '#10b981', 
              fontSize: '0.8rem', 
              marginTop: '0.5rem',
              fontWeight: '500'
            }}>
              📋 Commercial Invoice • 🚢 Bill of Lading • 📦 Packing List • 🌍 Certificate of Origin • 🛡️ Insurance
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      {/* Processed Documents */}
      {documents.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h5 style={{
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            marginBottom: '0.75rem',
            fontWeight: '600'
          }}>
            📊 Processed Documents ({documents.length})
          </h5>
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {documents.map((doc, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>
                    {getDocumentIcon(doc.documentType)}
                  </div>
                  <div>
                    <div style={{
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem'
                    }}>
                      {doc.documentType}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)'
                    }}>
                      {doc.filename} • {doc.extractionMethod}
                    </div>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  {/* Validation Flags */}
                  {doc.validationFlags && doc.validationFlags.length > 0 && (
                    <div style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '500'
                    }}>
                      ⚠️ {doc.validationFlags.length} warning{doc.validationFlags.length > 1 ? 's' : ''}
                    </div>
                  )}
                  
                  {/* Confidence Badge */}
                  <div style={{
                    background: getConfidenceColor(doc.confidence),
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>
                    {doc.confidence}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Fill Preview */}
      {autoFillSuggestions && (
        <div style={{
          marginTop: '1rem',
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <h5 style={{
            color: '#3b82f6',
            fontSize: '0.95rem',
            marginBottom: '0.75rem',
            fontWeight: '600'
          }}>
            ✨ Auto-Fill Suggestions
          </h5>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            {Object.entries(autoFillSuggestions).map(([field, suggestion]) => (
              <div
                key={field}
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.75rem'
                }}
              >
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.25rem'
                }}>
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div style={{
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  marginBottom: '0.25rem'
                }}>
                  {String(suggestion.value)}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>from {suggestion.source}</span>
                  <span style={{
                    background: suggestion.consistent ? '#10b981' : '#f59e0b',
                    color: 'white',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '3px',
                    fontSize: '0.6rem'
                  }}>
                    {suggestion.consistent ? '✓' : '⚠️'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supported Document Types */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: 'rgba(107, 114, 128, 0.05)',
        borderRadius: '6px',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <strong>Supported Documents:</strong> Commercial Invoice, Bill of Lading, Packing List, Certificate of Origin, 
        Insurance Certificate, Import Permit (STA), Letter of Credit, Delivery Order, Technical Documentation
      </div>
    </div>
  );
}
