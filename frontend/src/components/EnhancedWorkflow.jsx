import React, { useState, useEffect } from 'react';
import Step1Container from './step1/Step1Container.jsx';
import StepBasics from './StepBasics.jsx';
import StepSTA from './StepSTA.jsx';
import StepAI from './StepAI.jsx';
import StepScreening from './StepScreening.jsx';
import StepDocs from './StepDocs.jsx';
import { stepRoutingAPI } from '../services/stepRoutingAPI.js';

/**
 * Enhanced Workflow - Complete multi-step workflow with batch processing
 * Integrates new Step 1 batch processing with existing Step 2-5 components
 */
export default function EnhancedWorkflow({ initialMode = 'batch' }) {
  const [currentMode, setCurrentMode] = useState(initialMode); // 'batch' or 'individual'
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowData, setWorkflowData] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentList, setShipmentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle advancement from Step 1 to Step 2
   * Called when batch processing is complete
   */
  const handleAdvanceFromStep1 = async (workflowStatus, metadata) => {
    try {
      console.log('🚀 Advancing from Step 1 to Step 2:', { workflowStatus, metadata });
      
      setWorkflowData(metadata);
      setShipmentList(workflowStatus.shipments || []);
      
      // Select first shipment for individual processing
      if (workflowStatus.shipments && workflowStatus.shipments.length > 0) {
        const firstShipment = workflowStatus.shipments[0];
        setSelectedShipment(firstShipment);
        setCurrentStep(firstShipment.current_step);
      }

      // Switch to individual mode for step-by-step processing
      setCurrentMode('individual');
      
    } catch (error) {
      console.error('❌ Failed to advance from Step 1:', error);
      setError(`Failed to advance: ${error.message}`);
    }
  };

  /**
   * Handle completion of individual steps (2-5)
   */
  const handleStepComplete = async (stepNumber, stepData) => {
    if (!selectedShipment) {
      setError('No shipment selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`✅ Completing step ${stepNumber} for shipment ${selectedShipment.shipment_id}`);

      // Complete the step via API
      const result = await stepRoutingAPI.completeStep(
        selectedShipment.shipment_id, 
        stepNumber, 
        stepData
      );

      // Update shipment data
      const updatedShipment = {
        ...selectedShipment,
        current_step: result.currentStep,
        [`step${stepNumber}_completed_at`]: new Date().toISOString()
      };
      
      setSelectedShipment(updatedShipment);
      
      // Advance to next step or complete workflow
      if (result.currentStep && result.currentStep <= 5) {
        setCurrentStep(result.currentStep);
      } else {
        // Workflow complete
        setCurrentStep(999);
        console.log('🎉 Workflow completed for shipment', selectedShipment.shipment_id);
      }

    } catch (error) {
      console.error(`❌ Failed to complete step ${stepNumber}:`, error);
      setError(`Failed to complete step: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle shipment selection from list
   */
  const handleShipmentSelect = (shipment) => {
    setSelectedShipment(shipment);
    setCurrentStep(shipment.current_step);
    setError(null);
  };

  /**
   * Switch back to batch mode
   */
  const handleBackToBatch = () => {
    setCurrentMode('batch');
    setCurrentStep(1);
    setSelectedShipment(null);
    setShipmentList([]);
    setWorkflowData(null);
    setError(null);
  };

  /**
   * Render Step 1 (Batch Processing)
   */
  const renderStep1 = () => (
    <Step1Container 
      onAdvanceToStep2={handleAdvanceFromStep1}
      userId="demo-user"
    />
  );

  /**
   * Render shipment selection interface
   */
  const renderShipmentSelection = () => (
    <div className="shipment-selection" style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      margin: '2rem auto',
      maxWidth: '1200px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Select Shipment for Processing</h2>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            {shipmentList.length} shipments ready for step-by-step processing
          </p>
        </div>
        <button 
          onClick={handleBackToBatch}
          className="btn"
          style={{ 
            background: 'rgba(255,255,255,0.2)', 
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '0.5rem 1rem'
          }}
        >
          ← Back to Batch Processing
        </button>
      </div>

      {/* Shipment List */}
      <div style={{ padding: '2rem' }}>
        <div className="shipments-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1rem'
        }}>
          {shipmentList.map((shipment) => (
            <div
              key={shipment.shipment_id}
              className={`shipment-card ${selectedShipment?.shipment_id === shipment.shipment_id ? 'selected' : ''}`}
              style={{
                border: selectedShipment?.shipment_id === shipment.shipment_id 
                  ? '2px solid var(--primary)' 
                  : '1px solid var(--border)',
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                background: selectedShipment?.shipment_id === shipment.shipment_id 
                  ? 'rgba(90, 140, 179, 0.05)' 
                  : 'white',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleShipmentSelect(shipment)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>
                  {shipment.source_file || `Shipment ${shipment.shipment_id?.slice(0, 8)}`}
                </h4>
                <span style={{
                  background: shipment.current_step === 999 ? '#e8f5e8' : '#e3f2fd',
                  color: shipment.current_step === 999 ? '#2e7d2e' : '#1976d2',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem'
                }}>
                  {shipment.current_step === 999 ? 'Complete' : `Step ${shipment.current_step}`}
                </span>
              </div>
              
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <div>🌍 <strong>Destination:</strong> {shipment.destination_country}</div>
                <div>💰 <strong>Value:</strong> {shipment.currency || 'USD'} {(shipment.commercial_value || 0).toLocaleString()}</div>
                <div>📦 <strong>Items:</strong> {shipment.product_count || 0}</div>
              </div>

              <div style={{ 
                width: '100%', 
                background: '#e0e0e0', 
                borderRadius: '4px', 
                height: '6px',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  width: `${shipment.progress || 0}%`,
                  background: 'var(--primary)',
                  height: '100%',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Progress: {shipment.progress || 0}% • {shipment.next_action || 'Ready'}
              </div>
            </div>
          ))}
        </div>

        {selectedShipment && (
          <div style={{ 
            marginTop: '2rem', 
            textAlign: 'center',
            padding: '1rem',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>
              Selected: {selectedShipment.source_file || `Shipment ${selectedShipment.shipment_id?.slice(0, 8)}`}
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
              Ready to proceed with Step {selectedShipment.current_step} processing
            </p>
            <button
              onClick={() => setCurrentMode('individual')}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem' }}
            >
              🚀 Start Step {selectedShipment.current_step}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render individual step components
   */
  const renderCurrentStep = () => {
    if (!selectedShipment) {
      return renderShipmentSelection();
    }

    const commonProps = {
      onSaved: (shipmentId, data) => handleStepComplete(currentStep, data),
      defaultShipmentId: selectedShipment.shipment_id,
      shipmentData: selectedShipment,
      isEnhancedWorkflow: true
    };

    switch (currentStep) {
      case 1:
        return <StepBasics {...commonProps} />;
      case 2:
        return <StepSTA {...commonProps} />;
      case 3:
        return <StepAI {...commonProps} />;
      case 4:
        return <StepScreening {...commonProps} />;
      case 5:
        return <StepDocs {...commonProps} />;
      case 999:
        return renderWorkflowComplete();
      default:
        return <div>Unknown step: {currentStep}</div>;
    }
  };

  /**
   * Render workflow completion
   */
  const renderWorkflowComplete = () => (
    <div className="workflow-complete" style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      margin: '2rem auto',
      maxWidth: '800px',
      overflow: 'hidden',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
        color: 'white',
        padding: '3rem 2rem'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ margin: 0, fontSize: '2rem' }}>Workflow Complete!</h2>
        <p style={{ margin: '1rem 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
          Shipment {selectedShipment?.source_file} is ready for export
        </p>
      </div>
      
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h3>📋 Processing Summary</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <div>
              <strong>Total Value:</strong><br/>
              {selectedShipment?.currency || 'USD'} {(selectedShipment?.commercial_value || 0).toLocaleString()}
            </div>
            <div>
              <strong>Destination:</strong><br/>
              {selectedShipment?.destination_country}
            </div>
            <div>
              <strong>Products:</strong><br/>
              {selectedShipment?.product_count || 0} items
            </div>
            <div>
              <strong>Completion:</strong><br/>
              100% processed
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => {
              const nextShipment = shipmentList.find(s => 
                s.shipment_id !== selectedShipment.shipment_id && s.current_step < 999
              );
              if (nextShipment) {
                handleShipmentSelect(nextShipment);
                setCurrentMode('individual');
              } else {
                setCurrentMode('selection');
              }
            }}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            📦 Process Next Shipment
          </button>
          
          <button
            onClick={handleBackToBatch}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            🔄 Start New Batch
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Render mode selector
   */
  const renderModeSelector = () => (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1rem',
      margin: '1rem auto',
      maxWidth: '600px',
      textAlign: 'center'
    }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Choose Processing Mode</h3>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={() => setCurrentMode('batch')}
          className={`btn ${currentMode === 'batch' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.75rem 1.5rem' }}
        >
          📦 Batch Processing
        </button>
        <button
          onClick={() => setCurrentMode('selection')}
          className={`btn ${currentMode === 'individual' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.75rem 1.5rem' }}
          disabled={shipmentList.length === 0}
        >
          🔄 Individual Steps
        </button>
      </div>
    </div>
  );

  return (
    <div className="enhanced-workflow" style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          padding: '1rem',
          margin: '1rem auto',
          maxWidth: '800px',
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

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e3e3e3',
              borderTop: '4px solid #5a8cb3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <div>Processing...</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {currentMode === 'batch' && renderStep1()}
      {currentMode === 'selection' && renderShipmentSelection()}
      {currentMode === 'individual' && renderCurrentStep()}
      
      {/* Mode Selector - shown when not in batch mode */}
      {currentMode !== 'batch' && currentStep !== 999 && renderModeSelector()}
    </div>
  );
}
