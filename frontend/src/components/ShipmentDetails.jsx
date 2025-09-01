import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { apiRequest } from '../config/api.js';
import { apiService } from '../services/apiMigration.js';
import StepBasics from './StepBasics.jsx';
import StepAI from './StepAI.jsx';
import StepScreening from './StepScreening.jsx';
import StepDocs from './StepDocs.jsx';
import AdminSidebar from './layout/AdminSidebar';
import CustomerSidebar from './layout/CustomerSidebar';
import StrategicItemDetection from './molecules/StrategicItemDetection/StrategicItemDetection.jsx';

export default function ShipmentDetails() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Detect role based on URL path
  const isAdminRoute = location.pathname.startsWith('/admin/');
  
  // Use appropriate auth context based on route
  const adminAuth = useAdminAuth();
  const customerAuth = useCustomerAuth();
  
  // Determine which auth context to use
  const auth = isAdminRoute ? adminAuth : customerAuth;
  const user = isAdminRoute ? adminAuth.admin : customerAuth.customer;
  
  
  // Canvas state
  const [currentCanvasStep, setCurrentCanvasStep] = useState(1);
  const [shipmentData, setShipmentData] = useState(null);
  const [basics, setBasics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  

  // Load shipment data on mount and when shipmentId changes
  useEffect(() => {
    if (shipmentId) {
      loadShipmentData(shipmentId);
    }
  }, [shipmentId]);


  const loadShipmentData = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both shipment metadata and invoice processing data
      const [shipmentResponse, invoiceResponse] = await Promise.all([
        apiRequest(`/shipments/${id}`),
        apiRequest(`/invoice-detection/${id}`)
      ]);
      
      if (!shipmentResponse.ok) {
        throw new Error(`Failed to load shipment: ${shipmentResponse.status}`);
      }
      
      const shipmentResult = await shipmentResponse.json();
      
      // Handle the API response format {"ok": true, "shipment": {...}}
      const shipmentData = shipmentResult.shipment || shipmentResult;
      
      // Try to get invoice processing data (may not exist for all shipments)
      let invoiceData = null;
      if (invoiceResponse.ok) {
        const invoiceResult = await invoiceResponse.json();
        if (invoiceResult.success && invoiceResult.data) {
          invoiceData = invoiceResult.data;
        }
      }
      
      // Merge shipment metadata with invoice processing data
      const mergedData = {
        ...shipmentData,
        // Override with invoice processing data if available
        ...(invoiceData && {
          export_date: invoiceData.extracted_fields?.target_export_date || shipmentData.export_date,
          mode: invoiceData.extracted_fields?.transport_mode || shipmentData.mode,
          destination_country: invoiceData.destination || shipmentData.destination_country,
          end_user_name: invoiceData.consignee_name || shipmentData.end_user_name,
          commercial_value: invoiceData.commercial_value || shipmentData.commercial_value,
          currency: invoiceData.extracted_fields?.currency || shipmentData.currency,
          quantity: invoiceData.extracted_fields?.quantity || shipmentData.quantity,
          incoterms: invoiceData.extracted_fields?.incoterms || shipmentData.incoterms,
          tech_origin: invoiceData.technology_origin || shipmentData.tech_origin,
          // Add invoice processing specific data
          invoiceProcessingData: invoiceData
        })
      };
      
      setShipmentData(mergedData);
      
      // Set basics data for step navigation
      if (mergedData) {
        setBasics({
          exportDate: mergedData.export_date,
          mode: mergedData.mode,
          destination: mergedData.destination_country,
          endUser: mergedData.end_user_name,
          productType: mergedData.product_type
        });
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // Handle step completion and navigation
  const handleStepComplete = (stepNumber, id, data) => {
    
    if (stepNumber === 1) {
      setBasics(data);
      // Auto-progress to next step based on product type
      if (data?.productType === 'ai_accelerator_gpu_tpu_npu') {
        setCurrentCanvasStep(2); // Go to AI Chip step
      } else {
        setCurrentCanvasStep(3); // Skip to Screening step
      }
    } else {
      // For other steps, just move to the next step
      setCurrentCanvasStep(stepNumber + 1);
    }
  };

  // Handle sidebar toggle
  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Handle logout
  const handleLogout = async () => {
    await auth.logout();
    navigate(isAdminRoute ? '/admin/login' : '/login');
  };


  // Canvas data structure for compatibility with existing components
  const canvasData = shipmentData ? {
    shipmentId: shipmentData.shipment_id,
    extractedDate: shipmentData.export_date,
    extractedDestination: shipmentData.destination_country,
    files: [],
    originalQuery: `Loaded shipment ${shipmentData.shipment_id}`,
    invoiceData: shipmentData.invoiceProcessingData,
    uploadCompleted: true, // Mark as completed since this is an existing shipment
    uploadTimestamp: Date.now(),
    ocrData: shipmentData.invoiceProcessingData ? {
      fieldSuggestions: {
        // Use the extracted_fields directly as they match the expected format
        ...shipmentData.invoiceProcessingData.extracted_fields,
        // Add additional fields that are at the root level of invoiceProcessingData
        consignee_name: shipmentData.invoiceProcessingData.consignee_name,
        commercial_value: shipmentData.invoiceProcessingData.commercial_value,
        technology_origin: shipmentData.invoiceProcessingData.technology_origin,
        destination_country: shipmentData.invoiceProcessingData.destination,
        // Create product_items that supports both array methods and .value property
        product_items: (() => {
          const items = shipmentData.invoiceProcessingData.product_items || [];
          // Add .value property to the array for compatibility
          items.value = items;
          return items;
        })()
      }
    } : null
  } : null;

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', minHeight: '100vh' }}>
        {isAdminRoute ? (
          <AdminSidebar 
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            admin={user}
            onLogout={handleLogout}
          />
        ) : (
          <CustomerSidebar 
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            customer={user}
            onLogout={handleLogout}
          />
        )}
        <div style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '60px' : '280px',
          transition: 'margin-left 0.3s ease',
          background: '#f5f7fa',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="loading-container" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <div>Loading shipment details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app" style={{ display: 'flex', minHeight: '100vh' }}>
        {isAdminRoute ? (
          <AdminSidebar 
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            admin={user}
            onLogout={handleLogout}
          />
        ) : (
          <CustomerSidebar 
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            customer={user}
            onLogout={handleLogout}
          />
        )}
        <div style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '60px' : '280px',
          transition: 'margin-left 0.3s ease',
          background: '#f5f7fa',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="error-container" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--error)' }}>❌</div>
            <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-secondary"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!shipmentData) {
    return (
      <div className="app" style={{ display: 'flex', minHeight: '100vh' }}>
        {isAdminRoute ? (
          <AdminSidebar 
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            admin={user}
            onLogout={handleLogout}
          />
        ) : (
          <CustomerSidebar 
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            customer={user}
            onLogout={handleLogout}
          />
        )}
        <div style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '60px' : '280px',
          transition: 'margin-left 0.3s ease',
          background: '#f5f7fa',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="error-container" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</div>
            <div style={{ marginBottom: '1rem' }}>Shipment not found</div>
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-secondary"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      {isAdminRoute ? (
        <AdminSidebar 
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          admin={user}
          onLogout={handleLogout}
        />
      ) : (
        <CustomerSidebar 
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          customer={user}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: sidebarCollapsed ? '60px' : '280px',
        transition: 'margin-left 0.3s ease',
        background: '#f5f7fa',
        minHeight: '100vh'
      }}>
        {/* Canvas Header */}
        <div className="canvas-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--card-bg)'
        }}>
          <div>
            <h2>📦 Shipment Details</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              ID: {shipmentData.shipment_id} • Created: {new Date(shipmentData.created_at).toLocaleDateString()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-secondary"
            >
              ← Back to Home
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-outline"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Canvas Navigation */}
        <div className="canvas-nav" style={{
          display: 'flex',
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          {[
            { step: 1, label: '📋 Basics', active: currentCanvasStep === 1 },
            { step: 2, label: '🤖 AI Chips', active: currentCanvasStep === 2, show: basics?.productType === 'ai_accelerator_gpu_tpu_npu' },
            { step: 3, label: '🔍 Screening', active: currentCanvasStep === 3 },
            { step: 4, label: '📄 Documents', active: currentCanvasStep === 4 }
          ].filter(item => item.show !== false).map((item) => (
            <button
              key={item.step}
              onClick={() => setCurrentCanvasStep(item.step)}
              className={`btn ${item.active ? 'btn-primary' : 'btn-outline'}`}
              style={{ marginRight: '0.5rem' }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Canvas Content */}
        <div className="canvas-content" style={{ padding: '1rem' }}>
          {currentCanvasStep === 1 && (
            <>
              <StepBasics
                defaultShipmentId={shipmentId}
                canvasData={shipmentData}
                onSaved={(id, data) => handleStepComplete(1, id, data)}
                isCanvas={true}
              />
            </>
          )}
          
          {currentCanvasStep === 2 && basics?.productType === 'ai_accelerator_gpu_tpu_npu' && (
            <StepAI
              shipmentId={shipmentData.shipment_id}
              onSaved={() => handleStepComplete(2, shipmentData.shipment_id, null)}
              isCanvas={true}
            />
          )}
          
          {currentCanvasStep === 3 && (
            <StepScreening
              shipmentId={shipmentData.shipment_id}
              onSaved={() => handleStepComplete(3, shipmentData.shipment_id, null)}
              isCanvas={true}
            />
          )}
          
          {currentCanvasStep === 4 && (
            <StepDocs
              shipmentId={shipmentData.shipment_id}
              onSaved={() => handleStepComplete(4, shipmentData.shipment_id, null)}
              isCanvas={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
