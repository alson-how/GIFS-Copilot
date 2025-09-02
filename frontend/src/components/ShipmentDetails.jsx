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
      
      // Debug: Log the raw API response
      console.log('🔍 DEBUG - Raw shipmentData from API:', shipmentData);
      console.log('🔍 DEBUG - Raw invoiceData from API:', invoiceData);
      console.log('🔍 DEBUG - shipmentData.data:', shipmentData.data);
      
      // Extract the actual data from the nested structure
      const actualShipmentData = shipmentData.data || shipmentData;
      
      // Merge shipment metadata with invoice processing data
      const mergedData = {
        ...actualShipmentData,
        // Override with invoice processing data if available
        ...(invoiceData && {
          export_date: invoiceData.extracted_fields?.target_export_date || actualShipmentData.export_date || actualShipmentData.exportDate,
          mode: invoiceData.extracted_fields?.transport_mode || actualShipmentData.mode,
          destination_country: invoiceData.destination || actualShipmentData.destination_country || actualShipmentData.destination,
          end_user_name: invoiceData.consignee_name || actualShipmentData.end_user_name || actualShipmentData.endUser,
          commercial_value: invoiceData.commercial_value || actualShipmentData.commercial_value,
          currency: invoiceData.extracted_fields?.currency || actualShipmentData.currency,
          quantity: invoiceData.extracted_fields?.quantity || actualShipmentData.quantity,
          incoterms: invoiceData.extracted_fields?.incoterms || actualShipmentData.incoterms,
          tech_origin: invoiceData.technology_origin || actualShipmentData.tech_origin || actualShipmentData.techOrigin,
          // Add invoice processing specific data
          invoiceProcessingData: invoiceData
        })
      };
      
      // Debug: Log the merged data
      console.log('🔍 DEBUG - Merged data being passed to setShipmentData:', mergedData);
      console.log('🔍 DEBUG - end_user_name in merged data:', mergedData.end_user_name);
      console.log('🔍 DEBUG - endUser in merged data:', mergedData.endUser);
      
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
    // Also include the direct fields for StepBasics component
    end_user_name: shipmentData.end_user_name,
    endUser: shipmentData.endUser,
    export_date: shipmentData.export_date,
    exportDate: shipmentData.exportDate,
    destination_country: shipmentData.destination_country,
    destination: shipmentData.destination,
    mode: shipmentData.mode,
    currency: shipmentData.currency,
    incoterms: shipmentData.incoterms,
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
          const items = shipmentData.invoiceProcessingData.extracted_fields?.product_items || 
                       shipmentData.invoiceProcessingData.product_items || [];
          // Add .value property to the array for compatibility
          items.value = items;
          return items;
        })(),
        // Add invoice table data if available (check nested location first)
        invoice_table: shipmentData.invoiceProcessingData.extracted_fields?.invoice_table || 
                      shipmentData.invoiceProcessingData.invoice_table || (
          // Fallback: create table structure from product_items if no table data exists
          shipmentData.invoiceProcessingData.extracted_fields?.product_items?.length > 0 ? {
            headers: ['Description', 'Quantity', 'Unit Price', 'Total Amount'],
            rows: shipmentData.invoiceProcessingData.extracted_fields.product_items.map(item => [
              item.description || item.product_description || '',
              item.quantity || '',
              item.unit_price || '',
              item.line_total || item.total_amount || ''
            ])
          } : null
        )
      }
    } : null
  } : null;
  
  // Debug: Log canvasData being passed to StepBasics
  if (canvasData) {
    console.log('🔍 DEBUG - canvasData being passed to StepBasics:', canvasData);
    console.log('🔍 DEBUG - canvasData.end_user_name:', canvasData.end_user_name);
    console.log('🔍 DEBUG - canvasData.endUser:', canvasData.endUser);
  }

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

        {/* Status Timeline */}
        <div className="status-flow" style={{
          background: '#f7fafc',
          borderRadius: '10px',
          padding: '20px',
          marginTop: '30px'
        }}>
          <h2 style={{
            color: '#2d3748',
            marginBottom: '20px',
            fontSize: '18px'
          }}>📈 Complete Status Progression Timeline</h2>
          
          <div className="status-timeline" style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            padding: '20px 0'
          }}>
            {/* Status Timeline Line */}
            <div style={{
              position: 'absolute',
              top: '35px',
              left: '50px',
              right: '50px',
              height: '2px',
              background: 'linear-gradient(90deg, #48bb78 0%, #ed8936 50%, #667eea 100%)'
            }}></div>
            
            {/* Create Order - Always active */}
            <div className="status-item active" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: '#f0fff4',
                border: '3px solid #48bb78',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>📝</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>Create Order</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>Customer</div>
            </div>

            {/* Under Review - Active if shipment exists */}
            <div className={`status-item ${shipmentData ? 'active' : ''}`} style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: shipmentData ? '#f0fff4' : 'white',
                border: `3px solid ${shipmentData ? '#48bb78' : '#cbd5e0'}`,
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>👀</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>Under Review</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>3PL Admin</div>
            </div>

            {/* Quoted */}
            <div className="status-item" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: 'white',
                border: '3px solid #cbd5e0',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>💰</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>Quoted</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>3PL Admin</div>
            </div>

            {/* Confirmed */}
            <div className="status-item" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: 'white',
                border: '3px solid #cbd5e0',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>✅</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>Confirmed</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>Customer</div>
            </div>

            {/* Pickup Scheduled */}
            <div className="status-item" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: 'white',
                border: '3px solid #cbd5e0',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>📅</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>Pickup Scheduled</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>3PL Admin</div>
            </div>

            {/* Picked Up */}
            <div className="status-item" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: 'white',
                border: '3px solid #cbd5e0',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>🚚</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>Picked Up</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>Carrier</div>
            </div>

            {/* At Warehouse */}
            <div className="status-item" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: 'white',
                border: '3px solid #cbd5e0',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>🏭</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>At Warehouse</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>3PL</div>
            </div>

            {/* Customs */}
            <div className="status-item" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: 'white',
                border: '3px solid #cbd5e0',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>🛃</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>Customs</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>3PL/Broker</div>
            </div>

            {/* In Transit */}
            <div className="status-item" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: 'white',
                border: '3px solid #cbd5e0',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>✈️</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>In Transit</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>Carrier</div>
            </div>

            {/* Delivered */}
            <div className="status-item" style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}>
              <div className="status-icon" style={{
                width: '50px',
                height: '50px',
                background: 'white',
                border: '3px solid #cbd5e0',
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>📦</div>
              <div className="status-label" style={{
                fontSize: '12px',
                color: '#4a5568',
                fontWeight: 600
              }}>Delivered</div>
              <div className="status-owner" style={{
                fontSize: '10px',
                color: '#a0aec0',
                marginTop: '3px'
              }}>Carrier</div>
            </div>
          </div>
        </div>

        {/* Canvas Content - Always Show */}
        <div className="canvas-content" style={{ padding: '1rem' }}>
            <StepBasics
            defaultShipmentId={shipmentId}
              canvasData={canvasData}
              onSaved={(id, data) => handleStepComplete(1, id, data)}
              isCanvas={true}
            />
          
        </div>
      </div>
    </div>
  );
}
