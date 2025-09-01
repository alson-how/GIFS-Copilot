/**
 * DocumentRequirements Molecule
 * Complex document checklist with upload handling and compliance warnings
 */

import React from 'react';
import PropTypes from 'prop-types';
import { StatusBadge } from '../../atoms';
import { FormSection, WarningAlert } from '../';
import { FileUpload } from '../FileUpload';
import './DocumentRequirements.scss';

const DocumentRequirements = ({
  requiredDocuments = [],
  uploadedDocuments = {},
  handleFileUpload,
  getTotalValue,
  strategicItemsDetected = false,
  className = '',
  ...props
}) => {
  if (!requiredDocuments.length) return null;

  const totalValue = getTotalValue ? getTotalValue() : 0;
  const isHighValue = totalValue > 100000;
  const hasStrategicWarning = requiredDocuments.some(req => req.reason === 'Strategic Items Detected');
  const hasHighValueWarning = requiredDocuments.some(req => req.reason === 'High-Value Shipment (>$100K)');

  const getDocumentStatus = (docId) => {
    const uploaded = uploadedDocuments[docId];
    if (!uploaded) return 'pending';
    if (uploaded.status === 'uploading') return 'uploading';
    if (uploaded.status === 'completed') return 'completed';
    if (uploaded.status === 'failed') return 'failed';
    return 'completed';
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'uploading': return 'info';
      case 'failed': return 'error';
      default: return 'pending';
    }
  };

  return (
    <FormSection
      title="Document Requirements"
      icon="📄"
      required={true}
      className={`document-requirements ${className}`}
      {...props}
    >
      <div className="document-requirements__content">
        {/* Strategic Items Warning */}
        {hasStrategicWarning && (
          <WarningAlert
            variant="warning"
            title="Strategic Items Detected"
            message="Strategic items require additional documentation for export compliance"
          />
        )}

        {/* High-Value Warning */}
        {hasHighValueWarning && (
          <WarningAlert
            variant="info"
            title="High-Value Shipment Recommendation"
            message={`High-value shipment (>$${(totalValue / 1000).toFixed(0)}K) - insurance coverage recommended`}
          />
        )}

        {/* Document Checklist */}
        <div className="document-requirements__checklist">
          {requiredDocuments.map((doc) => (
            <div key={doc.id} className="document-requirements__item">
              <div className="document-requirements__item-header">
                <div className="document-requirements__item-info">
                  <h4 className="document-requirements__item-title">
                    {doc.name}
                  </h4>
                  {doc.description && (
                    <p className="document-requirements__item-description">
                      {doc.description}
                    </p>
                  )}
                  {doc.reason && (
                    <div className="document-requirements__item-reason">
                      <strong>Required because:</strong> {doc.reason}
                    </div>
                  )}
                </div>

                <div className="document-requirements__item-status">
                  <StatusBadge
                    variant={getStatusVariant(getDocumentStatus(doc.id))}
                    size="small"
                  >
                    {getDocumentStatus(doc.id) === 'completed' ? 'Uploaded' : 
                     getDocumentStatus(doc.id) === 'uploading' ? 'Uploading...' :
                     getDocumentStatus(doc.id) === 'failed' ? 'Failed' : 'Pending'}
                  </StatusBadge>
                </div>
              </div>

              {/* File Upload Component */}
              <div className="document-requirements__upload">
                <FileUpload
                  onUpload={(file, progressCallback) => handleFileUpload(doc.id, file, progressCallback)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  multiple={false}
                  maxSize={10 * 1024 * 1024} // 10MB
                  allowedTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
                  dragAndDrop={true}
                  showProgress={true}
                  showFileList={false}
                  browseText="Choose File"
                  placeholder={`Upload ${doc.name}`}
                  className="document-requirements__file-upload"
                />
              </div>

              {/* Uploaded File Info */}
              {uploadedDocuments[doc.id] && (
                <div className="document-requirements__uploaded-info">
                  <div className="document-requirements__uploaded-file">
                    <span className="document-requirements__file-name">
                      📎 {uploadedDocuments[doc.id].name}
                    </span>
                    <span className="document-requirements__file-size">
                      ({(uploadedDocuments[doc.id].size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  {uploadedDocuments[doc.id].uploadDate && (
                    <div className="document-requirements__upload-date">
                      Uploaded: {new Date(uploadedDocuments[doc.id].uploadDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Completion Status */}
        <div className="document-requirements__summary">
          <div className="document-requirements__progress">
            {Object.keys(uploadedDocuments).length} of {requiredDocuments.length} documents uploaded
          </div>
        </div>
      </div>
    </FormSection>
  );
};

DocumentRequirements.propTypes = {
  /** Array of required document objects */
  requiredDocuments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    reason: PropTypes.string,
    required: PropTypes.bool
  })),
  /** Object mapping document IDs to uploaded file info */
  uploadedDocuments: PropTypes.object,
  /** Function to handle file uploads */
  handleFileUpload: PropTypes.func.isRequired,
  /** Function to calculate total shipment value */
  getTotalValue: PropTypes.func,
  /** Whether strategic items have been detected */
  strategicItemsDetected: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string
};

export default DocumentRequirements;