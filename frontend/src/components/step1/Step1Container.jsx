import React, { useState, useEffect } from 'react';
import BatchUploadInterface from './BatchUploadInterface.jsx';
import { batchProcessingAPI } from '../../services/batchProcessingAPI.js';
import { stepRoutingAPI } from '../../services/stepRoutingAPI.js';

/**
 * Step 1 Container - Main UI orchestrator for batch processing workflow
 * Handles: upload → OCR processing → data collection → database save → step advancement
 */
export default function Step1Container({ onAdvanceToStep2, userId = 'demo-user' }) {
  const [currentPhase, setCurrentPhase] = useState('upload'); // upload, processing, review, saving, complete
  const [batchId, setBatchId] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [processingResults, setProcessingResults] = useState(null);
  const [extractedShipments, setExtractedShipments] = useState([]);
  const [saveResults, setSaveResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  /**
   * Handle batch upload completion
   * @param {Object} results - Upload results from BatchUploadInterface
   */
  const handleUploadComplete = async (results) => {
    try {
      setUploadResults(results);
      setBatchId(results.batchId);
      setCurrentPhase('processing');
      setLoading(true);

      console.log('📤 Upload complete, starting OCR processing...');
      
      // Start OCR processing
      const ocrResults = await batchProcessingAPI.processBatchOCR(results.batchId);
      setProcessingResults(ocrResults);
      setExtractedShipments(ocrResults.extractedShipments || []);
      
      if (ocrResults.extractedShipments?.length > 0) {
        setCurrentPhase('review');
        console.log(`✅ OCR processing complete: ${ocrResults.extractedShipments.length} shipments extracted`);
      } else {
        throw new Error('No shipments could be extracted from uploaded files');
      }

    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      setError(`OCR processing failed: ${error.message}`);
      setCurrentPhase('upload');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle user confirmation to save extracted data
   */
  const handleConfirmAndSave = async () => {
    if (!batchId || extractedShipments.length === 0) {
      setError('No data to save');
      return;
    }

    try {
      setCurrentPhase('saving');
      setLoading(true);
      setError(null);

      console.log('💾 Saving extracted shipments to database...');
      
      // Save to database
      const saveResult = await batchProcessingAPI.saveStep1ToDatabase(batchId);
      setSaveResults(saveResult);

      if (saveResult.success) {
        setCurrentPhase('complete');
        console.log(`✅ Successfully saved ${saveResult.savedShipments.length} shipments`);
      } else {
        throw new Error('Failed to save shipments to database');
      }

    } catch (error) {
      console.error('❌ Database save failed:', error);
      setError(`Failed to save to database: ${error.message}`);
      setCurrentPhase('review');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle advancement to Step 2
   */
  const handleProceedToStep2 = async () => {
    if (!saveResults?.savedShipments) {
      setError('No saved shipments to proceed with');
      return;
    }

    try {
      setLoading(true);
      
      // Get workflow status for saved shipments
      const shipmentIds = saveResults.savedShipments.map(s => s.shipment_id);
      const workflowStatus = await stepRoutingAPI.getWorkflowStatus(shipmentIds);
      
      // Pass data to Step 2 component
      onAdvanceToStep2?.(workflowStatus, {
        batchId,
        completedShipments: saveResults.savedShipments,
        totalValue: saveResults.totalValue,
        nextStep: saveResults.nextStep
      });

    } catch (error) {
      console.error('❌ Failed to advance to Step 2:', error);
      setError(`Failed to advance to Step 2: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset to start over
   */
  const handleStartOver = () => {
    setCurrentPhase('upload');
    setBatchId(null);
    setUploadResults(null);
    setProcessingResults(null);
    setExtractedShipments([]);
    setSaveResults(null);
    setError(null);
    setLoading(false);
  };

  /**
   * Render upload phase
   */
  const renderUploadPhase = () => (
    <div className="step1-phase upload-phase">
      <div className="phase-header" style={{ color: 'black' }}>
        <h2 style={{ color: 'black' }}>📤 Step 1: Upload Commercial Invoices</h2>
        <p style={{ color: 'black' }}>Upload multiple commercial invoice files for batch processing and OCR extraction</p>
      </div>
      
      <BatchUploadInterface
        onUploadComplete={handleUploadComplete}
        userId={userId}
        acceptedTypes={['.pdf', '.png', '.jpg', '.jpeg']}
        maxFiles={10}
        maxSizePerFile={10 * 1024 * 1024} // 10MB
      />
      
      {error && (
        <div className="error-message" style={{ 
          background: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '6px', 
          padding: '1rem', 
          marginTop: '1rem',
          color: '#c33'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );

  /**
   * Render processing phase
   */
  const renderProcessingPhase = () => (
    <div className="step1-phase processing-phase">
      <div className="phase-header" style={{ color: 'black' }}>
        <h2 style={{ color: 'black' }}>🔄 Processing Documents</h2>
        <p style={{ color: 'black' }}>Extracting data from uploaded files using OCR technology...</p>
      </div>
      
      <div className="processing-status" style={{
        background: 'rgba(90, 140, 179, 0.1)',
        border: '1px solid rgba(90, 140, 179, 0.3)',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e3e3e3',
          borderTop: '4px solid #5a8cb3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        
        <h3>Processing {uploadResults?.totalFiles || 0} files...</h3>
        <p>Extracting text, identifying document types, and parsing commercial data</p>
        
        {processingResults && (
          <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            <div>✅ Processed: {processingResults.processedFiles}</div>
            <div>❌ Failed: {processingResults.failedFiles}</div>
            <div>📊 Shipments Found: {processingResults.extractedShipments?.length || 0}</div>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render review phase
   */
  const renderReviewPhase = () => (
    <div className="step1-phase review-phase">
      <div className="phase-header" style={{ color: 'black' }}>
        <h2 style={{ color: 'black' }}>📋 Review Extracted Data</h2>
        <p style={{ color: 'black' }}>Review the extracted shipment data before saving to database</p>
      </div>
      
      <div className="extraction-summary" style={{
        background: 'rgba(76, 175, 80, 0.1)',
        border: '1px solid rgba(76, 175, 80, 0.3)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ color: 'black' }}>✅ Extraction Complete</h3>
        <div className="summary-stats" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginTop: '1rem'
        }}>
          <div>📄 <strong>Files Processed:</strong> {processingResults?.processedFiles || 0}</div>
          <div>📦 <strong>Shipments Found:</strong> {extractedShipments.length}</div>
          <div>💰 <strong>Total Value:</strong> ${extractedShipments.reduce((sum, s) => sum + (s.commercial_value || 0), 0).toLocaleString()}</div>
          <div>🚀 <strong>Success Rate:</strong> {Math.round((processingResults?.processedFiles || 0) / (uploadResults?.totalFiles || 1) * 100)}%</div>
        </div>
      </div>

      {/* Shipment details table */}
      <div className="shipments-table" style={{ 
        background: 'white', 
        borderRadius: '8px', 
        border: '1px solid var(--border)',
        overflow: 'auto',
        marginBottom: '2rem'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'black', color: 'white' }}>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Source File</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Destination</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>End User</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Value</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Items</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {extractedShipments.map((shipment, index) => (
              <tr key={shipment.shipment_id} style={{ 
                borderBottom: '1px solid var(--border)',
                background: index % 2 === 0 ? 'white' : 'rgba(0,0,0,0.02)'
              }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>{shipment.source_file}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{shipment.destination_country}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{shipment.end_user_name}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                  {shipment.currency} {(shipment.commercial_value || 0).toLocaleString()}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  {shipment.product_items?.length || 0}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    background: shipment.confidence_score > 0.8 ? '#e8f5e8' : '#fff3cd',
                    color: shipment.confidence_score > 0.8 ? '#2e7d2e' : '#856404'
                  }}>
                    {Math.round((shipment.confidence_score || 0) * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="phase-actions" style={{ 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button 
          onClick={handleStartOver}
          className="btn btn-secondary"
          style={{ padding: '0.75rem 1.5rem' }}
        >
          🔄 Start Over
        </button>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleConfirmAndSave}
            className="btn btn-primary"
            disabled={loading || extractedShipments.length === 0}
            style={{ padding: '0.75rem 2rem' }}
          >
            {loading ? '⏳ Saving...' : '💾 Save to Database'}
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Render saving phase
   */
  const renderSavingPhase = () => (
    <div className="step1-phase saving-phase">
      <div className="phase-header" style={{ color: 'black' }}>
        <h2 style={{ color: 'black' }}>💾 Saving to Database</h2>
        <p style={{ color: 'black' }}>Storing extracted shipment data and advancing workflow...</p>
      </div>
      
      <div className="saving-status" style={{
        background: 'rgba(255, 193, 7, 0.1)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e3e3e3',
          borderTop: '4px solid #ffc107',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        
        <h3>Saving {extractedShipments.length} shipments...</h3>
        <p>Creating database records and preparing for next step</p>
      </div>
    </div>
  );

  /**
   * Render completion phase
   */
  const renderCompletePhase = () => (
    <div className="step1-phase complete-phase">
      <div className="phase-header" style={{ color: 'black' }}>
        <h2 style={{ color: 'black' }}>✅ Step 1 Complete</h2>
        <p style={{ color: 'black' }}>All shipments have been successfully processed and saved</p>
      </div>
      
      <div className="completion-summary" style={{
        background: 'rgba(76, 175, 80, 0.1)',
        border: '1px solid rgba(76, 175, 80, 0.3)',
        borderRadius: '8px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h3>🎉 Processing Complete!</h3>
        
        <div className="success-stats" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem',
          marginTop: '1.5rem'
        }}>
          <div>📦 <strong>Shipments Created:</strong> {saveResults?.savedShipments?.length || 0}</div>
          <div>💰 <strong>Total Value:</strong> ${(saveResults?.totalValue || 0).toLocaleString()}</div>
          <div>🔄 <strong>Next Step:</strong> {saveResults?.nextStep?.stepName || 'Determine routing'}</div>
          <div>⚡ <strong>Priority:</strong> {saveResults?.nextStep?.priority || 'Normal'}</div>
        </div>

        {saveResults?.nextStep?.reason && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: 'rgba(255,255,255,0.7)', 
            borderRadius: '6px',
            fontSize: '0.9rem'
          }}>
            <strong>Routing Logic:</strong> {saveResults.nextStep.reason}
          </div>
        )}
      </div>

      <div className="completion-actions" style={{ 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button 
          onClick={handleStartOver}
          className="btn btn-secondary"
          style={{ padding: '0.75rem 1.5rem' }}
        >
          🆕 Process More Files
        </button>
        
        <button 
          onClick={handleProceedToStep2}
          className="btn btn-primary"
          disabled={loading}
          style={{ 
            padding: '0.75rem 2rem',
            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
          }}
        >
          {loading ? '⏳ Loading...' : '🚀 Proceed to Step 2'}
        </button>
      </div>
    </div>
  );

  // Add CSS animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <section className="step1-container" style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      margin: '2rem auto',
      maxWidth: '1200px',
      overflow: 'hidden'
    }}>
      {/* Progress indicator */}
      <div className="step1-progress" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Step 1: Batch Processing</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            Upload → Process → Review → Save → Advance
          </p>
        </div>
        
        <div className="phase-indicator" style={{ display: 'flex', gap: '0.5rem' }}>
          {['upload', 'processing', 'review', 'saving', 'complete'].map((phase, index) => (
            <div
              key={phase}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: currentPhase === phase ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="step1-content" style={{ padding: '2rem' }}>
        {currentPhase === 'upload' && renderUploadPhase()}
        {currentPhase === 'processing' && renderProcessingPhase()}
        {currentPhase === 'review' && renderReviewPhase()}
        {currentPhase === 'saving' && renderSavingPhase()}
        {currentPhase === 'complete' && renderCompletePhase()}
        
        {error && currentPhase !== 'upload' && (
          <div className="error-message" style={{ 
            background: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '6px', 
            padding: '1rem', 
            marginTop: '1rem',
            color: '#c33'
          }}>
            <strong>Error:</strong> {error}
            <button 
              onClick={() => setError(null)}
              style={{ 
                float: 'right', 
                background: 'none', 
                border: 'none', 
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: '#c33'
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
