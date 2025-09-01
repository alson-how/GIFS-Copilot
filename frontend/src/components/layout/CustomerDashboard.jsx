/**
 * Customer Dashboard Layout
 * Main layout component with sidebar navigation for authenticated customers
 */

import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import CustomerSidebar from './CustomerSidebar';

// Import page components
import AIQuery from '../AIQuery';
import TraditionalWorkflow from '../../pages/workflow/TraditionalWorkflow';
import ShipmentOrdersList from '../ShipmentOrdersList';
import PermitDocument from '../PermitDocument';
import ShipmentDetails from '../ShipmentDetails';

// Import canvas workflow components
import StepBasics from '../StepBasics';
import StepSTA from '../StepSTA';
import StepAI from '../StepAI';
import StepScreening from '../StepScreening';
import StepDocs from '../StepDocs';

import './CustomerDashboard.scss';

const CustomerDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Canvas workflow state
  const [shipmentId, setShipmentId] = useState(null);
  const [basics, setBasics] = useState(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasData, setCanvasData] = useState(null);
  const [showChatOnly, setShowChatOnly] = useState(false);
  const [currentCanvasStep, setCurrentCanvasStep] = useState(1);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Handle canvas opening from AI chat
  const handleOpenCanvas = (data) => {
    console.log('🎯 CustomerDashboard handleOpenCanvas called with data:', data);
    console.log('🎯 CustomerDashboard handleOpenCanvas shipmentId:', data?.shipmentId);
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
    <div className="customer-dashboard">
      {/* Sidebar */}
      <CustomerSidebar 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        customer={customer}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`dashboard-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <button 
              className="sidebar-toggle"
              onClick={handleToggleSidebar}
            >
              ☰
            </button>
            <h1>3PL Logistics Platform</h1>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">
                {customer?.first_name} {customer?.last_name}
              </span>
              <span className="user-company">{customer?.company_name}</span>
            </div>
            <div className="user-avatar">
              {customer?.first_name?.charAt(0)}{customer?.last_name?.charAt(0)}
            </div>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          {showCanvas ? (
            // Canvas workflow layout
            <div className="canvas-workflow" style={{
              display: 'flex',
              gap: '1rem',
              height: 'calc(100vh - 80px)',
              transition: 'all 0.3s ease'
            }}>
              {/* Chat Panel - Show when not in chat-only mode */}
              {!showChatOnly && (
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
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'var(--primary-color)',
                          color: 'white',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      >
                        ← Return to Canvas
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Canvas Panel */}
              <div className="canvas-panel" style={{
                flex: '1',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Canvas Header */}
                <div className="canvas-header" style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#374151' }}>Shipment Canvas</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                      Step {currentCanvasStep} of 4
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={handleShowChatOnly}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: 'white',
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      ← Chat Only
                    </button>
                    <button
                      onClick={handleCloseCanvas}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: 'white',
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {/* Canvas Content */}
                <div className="canvas-content" style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '1.5rem'
                }}>
                  {currentCanvasStep === 1 && (
                    <>
                      {console.log('🎯 CustomerDashboard rendering StepBasics with canvasData:', canvasData)}
                      {console.log('🎯 CustomerDashboard rendering StepBasics shipmentId from canvasData:', canvasData?.shipmentId)}
                      <StepBasics
                        onSaved={handleStepComplete}
                        canvasData={canvasData}
                        defaultShipmentId={shipmentId}
                        isCanvas={true}
                      />
                    </>
                  )}
                  {currentCanvasStep === 2 && (
                    <StepSTA
                      onComplete={handleStepComplete}
                      shipmentId={shipmentId}
                    />
                  )}
                  {currentCanvasStep === 3 && (
                    <StepScreening
                      onComplete={handleStepComplete}
                      shipmentId={shipmentId}
                    />
                  )}
                  {currentCanvasStep === 4 && (
                    <StepDocs
                      onComplete={handleStepComplete}
                      shipmentId={shipmentId}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Regular dashboard routes
            <Routes>
              {/* Default route - AIQuery */}
              <Route path="/" element={<AIQuery onOpenCanvas={handleOpenCanvas} />} />
              
              {/* Navigation routes */}
              <Route path="/ai-query" element={<AIQuery onOpenCanvas={handleOpenCanvas} />} />
              <Route path="/traditional-workflow" element={<TraditionalWorkflow />} />
              <Route path="/shipping-list" element={<ShipmentOrdersList />} />
              <Route path="/permit-documents" element={<PermitDocument />} />
              
              {/* Detail routes */}
              <Route path="/shipment/:shipmentId" element={<ShipmentDetails />} />
              
              {/* Catch-all redirect to AI Query */}
              <Route path="*" element={<AIQuery onOpenCanvas={handleOpenCanvas} />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
};

export default CustomerDashboard;