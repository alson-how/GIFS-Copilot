import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../config/api.js';
import StepBasics from './StepBasics.jsx';
import StepAI from './StepAI.jsx';
import StepScreening from './StepScreening.jsx';
import StepDocs from './StepDocs.jsx';
import Sidebar from '../Sidebar.jsx';

export default function ShipmentDetails() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  
  // Canvas state
  const [currentCanvasStep, setCurrentCanvasStep] = useState(1);
  const [shipmentData, setShipmentData] = useState(null);
  const [basics, setBasics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Strategic compliance state
  const [strategicStatus, setStrategicStatus] = useState(null);
  const [strategicLoading, setStrategicLoading] = useState(false);
  const [strategicError, setStrategicError] = useState(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [detectionError, setDetectionError] = useState(null);
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('shipment-details');

  // Load shipment data on mount and when shipmentId changes
  useEffect(() => {
    if (shipmentId) {
      loadShipmentData(shipmentId);
      loadStrategicStatus(shipmentId);
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
      console.log('📦 Loaded shipment metadata:', shipmentResult);
      
      // Handle the API response format {"ok": true, "shipment": {...}}
      const shipmentData = shipmentResult.shipment || shipmentResult;
      
      // Try to get invoice processing data (may not exist for all shipments)
      let invoiceData = null;
      if (invoiceResponse.ok) {
        const invoiceResult = await invoiceResponse.json();
        console.log('📄 Loaded invoice processing data:', invoiceResult);
        if (invoiceResult.success && invoiceResult.data) {
          invoiceData = invoiceResult.data;
        }
      } else {
        console.log('ℹ️ No invoice processing data found for this shipment');
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
      
      console.log('🔄 Merged shipment data:', mergedData);
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
      
      // Run strategic detection if we have product items from invoice data
      if (mergedData?.invoiceProcessingData?.product_items && mergedData.invoiceProcessingData.product_items.length > 0) {
        console.log('🔍 Triggering strategic detection for loaded shipment data');
        runStrategicDetection(id, mergedData.invoiceProcessingData.product_items);
      } else {
        console.log('ℹ️ No product items found in shipment data for strategic detection');
      }
      
    } catch (err) {
      console.error('❌ Error loading shipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load strategic status for compliance checking
  const loadStrategicStatus = async (id) => {
    try {
      setStrategicLoading(true);
      setStrategicError(null);
      
      console.log('🔍 Loading strategic status for shipment:', id);
      const response = await apiRequest(`/strategic/status/${id}`);
      
      if (!response.ok) {
        // If 404, shipment might not have been processed yet for strategic items
        if (response.status === 404) {
          console.log('ℹ️ No strategic status found for this shipment (not yet processed)');
          setStrategicStatus(null);
          return;
        }
        throw new Error(`Failed to load strategic status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🔍 Strategic status loaded:', result);
      
      if (result.success && result.data) {
        setStrategicStatus(result.data);
      } else {
        console.log('⚠️ Strategic status request succeeded but no data returned');
        setStrategicStatus(null);
      }
      
    } catch (err) {
      console.error('❌ Error loading strategic status:', err);
      setStrategicError(err.message);
    } finally {
      setStrategicLoading(false);
    }
  };

  // Run strategic detection on product items
  const runStrategicDetection = async (id, productItems) => {
    try {
      setDetectionLoading(true);
      setDetectionError(null);
      
      console.log('🔍 Running strategic detection for shipment:', id, 'with', productItems?.length, 'items');
      
      if (!productItems || productItems.length === 0) {
        console.log('⚠️ No product items found for strategic detection');
        return;
      }
      
      // Format product items for the API
      const formattedItems = productItems.map(item => ({
        product_description: item.product_description || item.description || item.item_description,
        hs_code: item.hs_code,
        quantity: item.quantity || 1,
        value: item.value || item.unit_price || 0,
        item_id: item.id || item.item_id
      })).filter(item => item.product_description); // Only include items with descriptions
      
      if (formattedItems.length === 0) {
        console.log('⚠️ No valid product items for strategic detection (no descriptions found)');
        return;
      }
      
      const requestBody = {
        shipment_id: id,
        product_items: formattedItems
      };
      
      console.log('🔍 Strategic detection request:', requestBody);
      
      const response = await apiRequest('/strategic/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Strategic detection failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Strategic detection completed:', result);
      
      if (result.success) {
        // After detection, reload the strategic status to get updated data
        setTimeout(() => {
          loadStrategicStatus(id);
        }, 1000); // Small delay to ensure database is updated
      } else {
        throw new Error(result.error || 'Strategic detection failed');
      }
      
    } catch (err) {
      console.error('❌ Error running strategic detection:', err);
      setDetectionError(err.message);
    } finally {
      setDetectionLoading(false);
    }
  };

  // Handle step completion and navigation
  const handleStepComplete = (stepNumber, id, data) => {
    console.log(`✅ Step ${stepNumber} completed for shipment ${id}`);
    
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

  // Handle view changes (for sidebar navigation)
  const handleViewChange = (viewId) => {
    if (viewId === 'shipments') {
      navigate('/dashboard/shipments');
    } else if (viewId === 'enhanced-workflow') {
      navigate('/dashboard/enhanced-workflow');
    } else if (viewId === 'traditional-workflow') {
      navigate('/dashboard/traditional-workflow');
    } else {
      setCurrentView(viewId);
    }
  };

  // Canvas data structure for compatibility with existing components
  const canvasData = shipmentData ? {
    shipmentId: shipmentData.shipment_id,
    extractedDate: shipmentData.export_date,
    extractedDestination: shipmentData.destination_country,
    files: [],
    originalQuery: `Loaded shipment ${shipmentData.shipment_id}`,
    invoiceData: shipmentData.invoiceProcessingData,
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
        <Sidebar 
          currentView={currentView}
          onViewChange={handleViewChange}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
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
        <Sidebar 
          currentView={currentView}
          onViewChange={handleViewChange}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
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
        <Sidebar 
          currentView={currentView}
          onViewChange={handleViewChange}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
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
      <Sidebar 
        currentView={currentView}
        onViewChange={handleViewChange}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

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

        {/* Strategic Compliance Status */}
        {(strategicStatus || strategicLoading || strategicError || detectionLoading || detectionError) && (
          <div className="strategic-compliance-section" style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: strategicStatus?.strategic_status?.exports_blocked ? '#fef2f2' : 
                           strategicStatus?.strategic_status?.strategic_items_detected > 0 ? '#fffbeb' : '#f0fdf4'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '1.5rem' }}>
                {detectionLoading ? '🔄' :
                 strategicLoading ? '⏳' : 
                 detectionError ? '❌' :
                 strategicError ? '❌' : 
                 strategicStatus?.strategic_status?.exports_blocked ? '🚫' : 
                 strategicStatus?.strategic_status?.strategic_items_detected > 0 ? '⚠️' : '✅'}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                  Strategic Compliance Status
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                  {detectionLoading ? 'Running strategic items detection...' :
                   strategicLoading ? 'Checking strategic compliance...' :
                   detectionError ? `Error running detection: ${detectionError}` :
                   strategicError ? `Error loading compliance status: ${strategicError}` :
                   !strategicStatus ? 'No strategic items detected' :
                   strategicStatus.strategic_status?.exports_blocked ? 
                     `Export BLOCKED - ${strategicStatus.strategic_status.exports_blocked_count} blocked items require permits` :
                   strategicStatus.strategic_status?.strategic_items_detected > 0 ? 
                     `${strategicStatus.strategic_status.strategic_items_detected} strategic items detected - Review required` :
                   'All clear - No strategic items detected'}
                </p>
              </div>
              {strategicStatus && (
                <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div>Total Items: {strategicStatus.strategic_status?.total_items || 0}</div>
                  <div>Strategic: {strategicStatus.strategic_status?.strategic_items_detected || 0}</div>
                  <div>Permits Required: {strategicStatus.strategic_status?.permits_required_count || 0}</div>
                </div>
              )}
              {!detectionLoading && !strategicLoading && (
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  {shipmentData?.invoiceProcessingData?.product_items && (
                    <button 
                      onClick={() => runStrategicDetection(shipmentId, shipmentData.invoiceProcessingData.product_items)}
                      className="btn btn-primary btn-sm"
                      style={{ minWidth: '120px', fontSize: '0.8rem' }}
                      disabled={detectionLoading}
                    >
                      🔍 Run Detection
                    </button>
                  )}
                  <button 
                    onClick={() => loadStrategicStatus(shipmentId)}
                    className="btn btn-outline btn-sm"
                    style={{ minWidth: '120px', fontSize: '0.8rem' }}
                    disabled={strategicLoading}
                  >
                    🔄 Refresh Status
                  </button>
                </div>
              )}
            </div>
            
            {/* Strategic Items Details */}
            {strategicStatus?.detection_results && strategicStatus.detection_results.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.925rem', fontWeight: '600' }}>
                  Strategic Items Detected ({strategicStatus.detection_results.length})
                </h4>
                <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '200px', overflow: 'auto' }}>
                  {strategicStatus.detection_results.map((result, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      backgroundColor: result.export_blocked ? '#fef2f2' : result.is_strategic ? '#fffbeb' : '#f9fafb',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                          {result.item_description}
                        </div>
                        {result.hs_code && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            HS Code: {result.hs_code}
                          </div>
                        )}
                        {result.strategic_codes && result.strategic_codes.length > 0 && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            Strategic Codes: {result.strategic_codes.join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                        <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                          <div>Confidence: {Math.round((result.final_confidence_score || 0) * 100)}%</div>
                          {result.manual_review_required && (
                            <div style={{ color: '#f59e0b', fontWeight: '500' }}>Review Required</div>
                          )}
                        </div>
                        <div style={{ fontSize: '1.25rem' }}>
                          {result.export_blocked ? '🚫' : result.is_strategic ? '⚠️' : '✅'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            <StepBasics
              defaultShipmentId={shipmentData.shipment_id}
              canvasData={canvasData}
              onSaved={(id, data) => handleStepComplete(1, id, data)}
              isCanvas={true}
            />
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
