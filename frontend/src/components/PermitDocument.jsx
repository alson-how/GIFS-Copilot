import React, { useState, useEffect } from 'react';

const PermitDocument = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Load permit documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/permit-documents');
      const result = await response.json();

      if (result.success) {
        setDocuments(result.data);
      } else {
        setError(result.error || 'Failed to fetch documents');
      }
    } catch (err) {
      console.error('Error fetching permit documents:', err);
      setError('Failed to fetch permit documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('document', selectedFile);

      const response = await fetch('/api/permit-documents/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Document uploaded successfully! Permit Number: ${result.data.permit_number || 'Not detected'}`);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('permit-file-input');
        if (fileInput) fileInput.value = '';
        
        // Refresh documents list
        await fetchDocuments();
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not detected';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString; // Return as-is if parsing fails
    }
  };

  const getStatusColor = (expiryDate) => {
    if (!expiryDate) return '#6b7280'; // Gray for unknown
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return '#dc2626'; // Red for expired
    if (daysUntilExpiry < 30) return '#f59e0b'; // Orange for expiring soon
    return '#10b981'; // Green for valid
  };

  const getStatusText = (expiryDate) => {
    if (!expiryDate) return 'Unknown';
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry < 30) return `Expires in ${daysUntilExpiry} days`;
    return 'Valid';
  };

  return (
    <div className="permit-document-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          📄 Permit Document Management
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Upload and manage your permit documents with automatic OCR extraction
        </p>
      </div>

      {/* Upload Section */}
      <div className="upload-section card" style={{ 
        padding: '2rem', 
        marginBottom: '2rem',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        backgroundColor: 'var(--card-bg)'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          📤 Upload Permit Document
        </h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <input
            id="permit-file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              width: '100%',
              maxWidth: '400px'
            }}
          />
          <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Supported formats: PDF, JPG, PNG (Max: 10MB)
          </small>
        </div>

        {selectedFile && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--bg-secondary)', 
            borderRadius: '4px', 
            marginBottom: '1rem' 
          }}>
            <strong>Selected File:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: selectedFile && !uploading ? 'var(--primary)' : 'var(--disabled)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          {uploading ? '⏳ Processing...' : '📤 Upload & Extract'}
        </button>

        {/* Status Messages */}
        {success && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#d1fae5',
            border: '1px solid #10b981',
            borderRadius: '4px',
            color: '#065f46'
          }}>
            ✅ {success}
          </div>
        )}

        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #dc2626',
            borderRadius: '4px',
            color: '#991b1b'
          }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="documents-section card" style={{
        border: '1px solid var(--border)',
        borderRadius: '8px',
        backgroundColor: 'var(--card-bg)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)' }}>
            📋 Uploaded Permit Documents
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div>⏳ Loading documents...</div>
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            📄 No permit documents uploaded yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    Document Name
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    Permit Number
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    Issue Date
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    Expiry Date
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={doc.document_id} style={{
                    backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'
                  }}>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{doc.document_name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {doc.original_filename}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: doc.permit_number ? 'var(--bg-secondary)' : 'transparent',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace'
                      }}>
                        {doc.permit_number || 'Not detected'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                      {formatDate(doc.issue_date)}
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                      {formatDate(doc.expiry_date)}
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: getStatusColor(doc.expiry_date)
                      }}>
                        {getStatusText(doc.expiry_date)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(doc.uploaded_at).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermitDocument;
