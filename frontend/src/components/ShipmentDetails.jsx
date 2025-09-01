import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../config/api.js';
import { apiService } from '../services/apiMigration.js';
import StepBasics from './StepBasics.jsx';
import StepAI from './StepAI.jsx';
import StepScreening from './StepScreening.jsx';
import StepDocs from './StepDocs.jsx';
import Sidebar from './Sidebar';
import StrategicItemPermitInterface from './StrategicItemPermitInterface.jsx';

export default function ShipmentDetails() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  
  // Canvas state
  const [currentCanvasStep, setCurrentCanvasStep] = useState(1);
  const [shipmentData, setShipmentData] = useState(null);
  const [basics, setBasics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('shipment-details');
  
  // Strategic detection state
  const [strategicItemsDetected, setStrategicItemsDetected] = useState(false);
  const [strategicDetectionComplete, setStrategicDetectionComplete] = useState(false);
  const [strategicDetectionLoading, setStrategicDetectionLoading] = useState(false);
  const [exportBlocked, setExportBlocked] = useState(false);
  const [complianceScore, setComplianceScore] = useState(100);
  const [missingPermits, setMissingPermits] = useState([]);
  const [strategicItemsCount, setStrategicItemsCount] = useState(0);

  // Load shipment data on mount and when shipmentId changes
  useEffect(() => {
    if (shipmentId) {
      loadShipmentData(shipmentId);
    }
  }, [shipmentId]);

  // Load Strategic Status when shipment data is available
  useEffect(() => {
    console.log('🔍 ShipmentDetails: Strategic status useEffect triggered');
    console.log('🔍 ShipmentDetails: strategicDetectionComplete:', strategicDetectionComplete);
    console.log('🔍 ShipmentDetails: strategicDetectionLoading:', strategicDetectionLoading);
    console.log('🔍 ShipmentDetails: shipmentId:', shipmentId);
    console.log('🔍 ShipmentDetails: shipmentData available:', !!shipmentData);
    console.log('🔍 ShipmentDetails: invoiceProcessingData available:', !!shipmentData?.invoiceProcessingData);
    
    if (!strategicDetectionComplete && !strategicDetectionLoading && shipmentId && shipmentData) {
      console.log('🔍 ShipmentDetails: Loading strategic status for shipment...');
      loadStrategicStatus();
    }
  }, [shipmentId, strategicDetectionComplete, strategicDetectionLoading, shipmentData]);

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
      
    } catch (err) {
      console.error('❌ Error loading shipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load Strategic Status (get existing results)
  const loadStrategicStatus = async () => {
    if (strategicDetectionLoading) {
      console.log('⏳ Strategic status loading already in progress, skipping...');
      return;
    }
    
    try {
      console.log('🔍 ShipmentDetails: Loading strategic status for shipment:', shipmentId);
      setStrategicDetectionLoading(true);
      
      const data = await apiService.strategic.getShipmentStatus(shipmentId);

      if (data.success) {
        console.log('✅ ShipmentDetails: Strategic status loaded:', data.data);
        console.log('🔍 ShipmentDetails: Full API response:', JSON.stringify(data.data, null, 2));
        
        // The API response structure has nested objects
        const apiData = data.data;
        const strategicStatus = apiData.strategic_status || {};
        const permitStatus = apiData.permit_status || {};
        
        console.log('🔍 ShipmentDetails: apiData:', apiData);
        console.log('🔍 ShipmentDetails: strategicStatus:', strategicStatus);
        console.log('🔍 ShipmentDetails: permitStatus:', permitStatus);
        console.log('🔍 ShipmentDetails: detection_results length:', apiData.detection_results?.length || 0);
        
        // Update state with existing strategic detection results
        setStrategicItemsDetected(strategicStatus.has_strategic_items || false);
        setExportBlocked(strategicStatus.export_blocked || false);
        
        // Calculate compliance score based on actual status
        let calculatedComplianceScore = 100;
        if (strategicStatus.export_blocked) {
          calculatedComplianceScore = 0; // Export blocked = 0% compliance
        } else if (strategicStatus.has_strategic_items && permitStatus.missing_permits?.length > 0) {
          calculatedComplianceScore = 25; // Strategic items with missing permits = low compliance
        } else if (strategicStatus.has_strategic_items) {
          calculatedComplianceScore = 75; // Strategic items but permits uploaded = good compliance
        }
        
        setComplianceScore(calculatedComplianceScore);
        // Use the strategic items count from the API response - try multiple field names
        const strategicCount = strategicStatus.strategic_items_found || 
                              strategicStatus.strategic_items || 
                              strategicStatus.total_items ||
                              apiData.detection_results?.length ||
                              (strategicStatus.has_strategic_items ? 1 : 0);
        console.log('🔍 ShipmentDetails: Setting strategicItemsCount to:', strategicCount);
        setStrategicItemsCount(strategicCount);
        setMissingPermits(permitStatus.missing_permits || permitStatus.required_permits || []);
        setStrategicDetectionComplete(true);
        
        console.log('🔍 ShipmentDetails: Final state set:', {
          strategicItemsDetected: strategicStatus.has_strategic_items,
          exportBlocked: strategicStatus.export_blocked,
          complianceScore: calculatedComplianceScore,
          strategicItemsCount: strategicCount
        });
        
      } else {
        console.log('ℹ️ ShipmentDetails: No existing strategic status found:', data.error);
        // If no existing status, trigger detection
        triggerStrategicDetection();
      }
    } catch (error) {
      console.error('❌ ShipmentDetails: Strategic status loading error:', error);
      // If API fails, try to trigger detection
      triggerStrategicDetection();
    } finally {
      setStrategicDetectionLoading(false);
    }
  };

  // Trigger Strategic Detection (fallback if no existing status)
  const triggerStrategicDetection = async () => {
    try {
      console.log('🔍 ShipmentDetails: Triggering strategic detection for shipment:', shipmentId);
      
      let detectionItems = [];
      
      // Use OCR data if available from invoice processing
      if (shipmentData?.invoiceProcessingData?.product_items?.length > 0) {
        console.log('🔍 ShipmentDetails: Using OCR product items for detection');
        const ocrItems = shipmentData.invoiceProcessingData.product_items;
        detectionItems = ocrItems.map(item => ({
          product_description: item.description || item.product_description || item.item_description,
          hs_code: item.hs_code,
          quantity: parseFloat(item.quantity) || 1,
          value: parseFloat(item.value || item.line_total || item.unit_price) || 0,
          item_id: item.id || item.item_id
        })).filter(item => item.product_description && item.product_description.trim() !== '');
      }

      if (detectionItems.length === 0) {
        console.log('⚠️ ShipmentDetails: No items with descriptions found for strategic detection');
        setStrategicDetectionComplete(true);
        return;
      }
      
      console.log('🔍 ShipmentDetails: Calling strategic detect API with items:', detectionItems);

      const data = await apiService.strategic.detect({
        shipment_id: shipmentId,
        product_items: detectionItems
      });

      if (data.success) {
        console.log('✅ ShipmentDetails: Strategic detection completed:', data.data);
        // After detection, reload status to get updated results
        setTimeout(() => loadStrategicStatus(), 1000);
      } else {
        console.error('❌ ShipmentDetails: Strategic detection failed:', data.error);
        setStrategicDetectionComplete(true);
      }
    } catch (error) {
      console.error('❌ ShipmentDetails: Strategic detection error:', error);
      setStrategicDetectionComplete(true);
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
                defaultShipmentId={shipmentData.shipment_id}
                canvasData={shipmentData}
                onSaved={(id, data) => handleStepComplete(1, id, data)}
                isCanvas={true}
              />
              
              {/* Strategic Item Detection Interface */}
              <div style={{ marginTop: '2rem' }}>
                <StrategicItemPermitInterface
                  shipmentId={shipmentData.shipment_id}
                  strategicItemsDetected={strategicItemsDetected}
                  strategicDetectionComplete={strategicDetectionComplete}
                  strategicDetectionLoading={strategicDetectionLoading}
                  exportBlocked={exportBlocked}
                  complianceScore={complianceScore}
                  missingPermits={missingPermits}
                  strategicItemsCount={strategicItemsCount}
                  onRetriggerDetection={() => {
                    setStrategicDetectionComplete(false);
                    triggerStrategicDetection();
                  }}
                />
              </div>
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
