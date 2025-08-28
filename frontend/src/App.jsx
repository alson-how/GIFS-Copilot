import React, { useState, useEffect } from 'react';
import StepBasics from './components/StepBasics.jsx';
import StepSTA from './components/StepSTA.jsx';
import StepAI from './components/StepAI.jsx';
import StepScreening from './components/StepScreening.jsx';
import StepDocs from './components/StepDocs.jsx';
import AIQuery from './components/AIQuery.jsx';

export default function App(){
  const [shipmentId, setShipmentId] = useState(null);
  const [basics, setBasics] = useState(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasData, setCanvasData] = useState(null);
  const [showChatOnly, setShowChatOnly] = useState(false);
  const [currentCanvasStep, setCurrentCanvasStep] = useState(1); // 1: Basics, 2: AI Chip, 3: Screening, 4: Docs

  // Add fade-in animation on mount
  useEffect(() => {
    document.body.classList.add('fade-in');
  }, []);

  const isAI = basics?.productType === 'ai_accelerator_gpu_tpu_npu';

  // Handle canvas opening from AI chat
  const handleOpenCanvas = (data) => {
    setCanvasData(data);
    setShowCanvas(true);
    setShowChatOnly(false);
    setCurrentCanvasStep(1); // Start with basics
  };

  // Handle canvas close
  const handleCloseCanvas = () => {
    setShowCanvas(false);
    setCanvasData(null);
    setShowChatOnly(false);
    setCurrentCanvasStep(1);
  };

  // Handle showing chat only (left arrow clicked)
  const handleShowChatOnly = () => {
    setShowChatOnly(true);
    // Don't reset canvas state - maintain current step and data
  };

  // Handle returning to canvas from chat-only view
  const handleReturnToCanvas = () => {
    setShowChatOnly(false);
  };

  // Handle step progression after saving
  const handleStepComplete = (stepNumber, id, data) => {
    setShipmentId(id);
    
    if (stepNumber === 1) {
      setBasics(data);
      // Auto-progress to next step based on product type
      if (data?.productType === 'ai_accelerator_gpu_tpu_npu') {
        setCurrentCanvasStep(2); // Go to AI Chip step
      } else {
        setCurrentCanvasStep(3); // Skip to Screening step
      }
    } else if (stepNumber === 2) {
      setCurrentCanvasStep(3); // Go to Screening
    } else if (stepNumber === 3) {
      setCurrentCanvasStep(4); // Go to Docs
    } else if (stepNumber === 4) {
      // Final step complete - close canvas
      handleCloseCanvas();
    }
  };

    return (
    <div className="app">
      {/* Header Section - Hide when canvas is fullscreen */}
      {!showCanvas && (
        <header className="header">
          <h1 className="app-title">GIFS Logistics Copilot</h1>
          <p className="app-subtitle">AI-Powered Semiconductor Export Compliance</p>
          {shipmentId && (
            <div className="shipment-id">
              <strong>Active Shipment:</strong> {shipmentId}
            </div>
          )}
        </header>
      )}

      {/* Main Content Area */}
      <div className="main-content" style={{
        display: 'flex',
        gap: '1rem',
        height: showCanvas ? '100vh' : 'auto',
        transition: 'all 0.3s ease',
        position: showCanvas ? 'fixed' : 'relative',
        top: showCanvas ? 0 : 'auto',
        left: showCanvas ? 0 : 'auto',
        right: showCanvas ? 0 : 'auto',
        bottom: showCanvas ? 0 : 'auto',
        zIndex: showCanvas ? 1000 : 'auto',
        background: showCanvas ? 'var(--background)' : 'transparent'
      }}>
        {/* Chat Panel - Show when not in canvas mode OR when showChatOnly is true */}
        {(!showCanvas || showChatOnly) && (
          <div className="chat-panel" style={{
            flex: '1',
            transition: 'all 0.3s ease'
          }}>
            <AIQuery onOpenCanvas={handleOpenCanvas} />
            
            {/* Return to Canvas button when in chat-only mode */}
            {showChatOnly && showCanvas && (
              <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 1001
              }}>
                <button
                  onClick={handleReturnToCanvas}
                  className="btn btn-primary"
                  style={{
                    borderRadius: '50px',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 20px rgba(90, 140, 179, 0.3)'
                  }}
                >
                  📋 Return to Canvas
                </button>
              </div>
            )}
          </div>
        )}

        {/* Canvas Panel - Fullscreen when active */}
        {showCanvas && !showChatOnly && (
          <div className="canvas-panel" style={{
            flex: '1',
            width: '100%',
            height: '100vh',
            background: 'var(--surface)',
            border: 'none',
            borderRadius: '0',
            overflow: 'hidden',
            animation: 'slideInRight 0.3s ease'
          }}>
            {/* Canvas Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                {/* Left Arrow Button */}
                <button
                  onClick={handleShowChatOnly}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                  }}
                  title="Show Chat Only"
                >
                  ←
                </button>
                
                <div>
                  <h3 style={{margin: 0, fontSize: '1.2rem'}}>📋 Shipment Canvas</h3>
                  <p style={{margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.9rem'}}>
                    Configure your export shipment
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleCloseCanvas}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close Canvas"
              >
                ✕
              </button>
            </div>

            {/* Canvas Content */}
            <div style={{ 
              padding: '2rem', 
              height: 'calc(100vh - 80px)', 
              overflow: 'auto',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {/* Step Progress Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '2rem',
                gap: '1rem'
              }}>
                {[
                  { step: 1, title: 'Shipment Basics', icon: '📋' },
                  { step: 2, title: 'AI Chip Directive', icon: '🤖', condition: basics?.productType === 'ai_accelerator_gpu_tpu_npu' },
                  { step: 3, title: 'Screening', icon: '🔍' },
                  { step: 4, title: 'Documentation', icon: '📄' }
                ].filter(item => item.condition !== false).map((item, index, filteredArray) => (
                  <React.Fragment key={item.step}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      opacity: currentCanvasStep >= item.step ? 1 : 0.4
                    }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: currentCanvasStep >= item.step 
                          ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
                          : 'var(--surface-light)',
                        border: currentCanvasStep === item.step 
                          ? '3px solid var(--primary-glow)'
                          : '2px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        color: currentCanvasStep >= item.step ? 'white' : 'var(--text-muted)',
                        transition: 'all 0.3s ease',
                        boxShadow: currentCanvasStep === item.step 
                          ? '0 4px 15px rgba(90, 140, 179, 0.3)'
                          : 'none'
                      }}>
                        {currentCanvasStep > item.step ? '✓' : item.icon}
                      </div>
                      <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: currentCanvasStep === item.step ? '600' : '400',
                        color: currentCanvasStep >= item.step ? 'var(--primary)' : 'var(--text-muted)',
                        textAlign: 'center',
                        maxWidth: '80px'
                      }}>
                        {item.title}
                      </div>
                    </div>
                    
                    {/* Connector line */}
                    {index < filteredArray.length - 1 && (
                      <div style={{
                        width: '40px',
                        height: '2px',
                        background: currentCanvasStep > item.step 
                          ? 'var(--primary)'
                          : 'var(--border)',
                        transition: 'background 0.3s ease'
                      }} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Step Content */}
              {currentCanvasStep === 1 && (
                <StepBasics
                  defaultShipmentId={shipmentId}
                  canvasData={canvasData}
                  onSaved={(id, data) => handleStepComplete(1, id, data)}
                  isCanvas={true}
                />
              )}
              
              {currentCanvasStep === 2 && basics?.productType === 'ai_accelerator_gpu_tpu_npu' && (
                <StepAI
                  shipmentId={shipmentId}
                  onSaved={() => handleStepComplete(2, shipmentId, null)}
                  isCanvas={true}
                />
              )}
              
              {currentCanvasStep === 3 && (
                <StepScreening
                  shipmentId={shipmentId}
                  onSaved={() => handleStepComplete(3, shipmentId, null)}
                  isCanvas={true}
                />
              )}
              
              {currentCanvasStep === 4 && (
                <StepDocs
                  shipmentId={shipmentId}
                  onSaved={() => handleStepComplete(4, shipmentId, null)}
                  isCanvas={true}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compliance Steps - Only show after basics are saved and canvas is closed */}
      {shipmentId && basics && !showCanvas && (
        <div className="compliance-steps">
          <StepSTA
            shipmentId={shipmentId}
            productType={basics?.productType}
            techOrigin={basics?.techOrigin}
          />
          {isAI && <StepAI shipmentId={shipmentId} />}
          <StepScreening shipmentId={shipmentId} />
          <StepDocs shipmentId={shipmentId} />
        </div>
      )}

      {/* Workflow Progress Indicator */}
      {shipmentId && !showCanvas && (
        <div className="card fade-in mt-4" style={{
          background: 'linear-gradient(135deg, rgba(90, 140, 179, 0.1), rgba(127, 179, 211, 0.05))',
          border: '1px solid rgba(90, 140, 179, 0.3)'
        }}>
          <div className="card-content">
            <div className="flex-between">
              <div>
                <h4 style={{color: 'var(--primary-light)', margin: 0}}>🎯 Workflow Progress</h4>
                <p style={{color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.9rem'}}>
                  Complete each step to ensure full compliance
                </p>
              </div>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <div className="step-number" style={{background: 'var(--success)'}}>✓</div>
                <div className="step-number">1</div>
                {isAI && <div className="step-number">2</div>}
                <div className="step-number">3</div>
                <div className="step-number">4</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
