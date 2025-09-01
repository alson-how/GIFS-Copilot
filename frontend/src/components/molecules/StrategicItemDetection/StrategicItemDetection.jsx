/**
 * Strategic Item Detection Component
 * Handles strategic trade compliance detection and status display
 * Shared between StepBasics and ShipmentDetails for consistency
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { apiService } from '../../../services/apiMigration.js';
import StrategicItemPermitInterface from '../../StrategicItemPermitInterface.jsx';

const StrategicItemDetection = ({
  shipmentId,
  productItems = [],
  canvasData = null,
  onStrategicStatusChange,
  className = ''
}) => {
  // Strategic detection state
  const [strategicItemsDetected, setStrategicItemsDetected] = useState(false);
  const [strategicDetectionComplete, setStrategicDetectionComplete] = useState(false);
  const [strategicDetectionLoading, setStrategicDetectionLoading] = useState(false);
  const [exportBlocked, setExportBlocked] = useState(false);
  const [complianceScore, setComplianceScore] = useState(100);
  const [missingPermits, setMissingPermits] = useState([]);
  const [strategicItemsCount, setStrategicItemsCount] = useState(0);

  // Reset strategic detection state when shipmentId changes
  useEffect(() => {
    console.log('🔄 StrategicItemDetection: Shipment ID changed, resetting state');
    setStrategicDetectionComplete(false);
    setStrategicDetectionLoading(false);
    setStrategicItemsDetected(false);
    setExportBlocked(false);
    setComplianceScore(100);
    setMissingPermits([]);
    setStrategicItemsCount(0);
  }, [shipmentId]);

  // Load Strategic Status when component mounts or shipmentId changes
  useEffect(() => {
    console.log('🔍 StrategicItemDetection: Component mounted/shipmentId changed');
    console.log('🔍 StrategicItemDetection: strategicDetectionComplete:', strategicDetectionComplete);
    console.log('🔍 StrategicItemDetection: strategicDetectionLoading:', strategicDetectionLoading);
    console.log('🔍 StrategicItemDetection: shipmentId (PROP):', shipmentId);
    console.log('🔍 StrategicItemDetection: canvasData.shipment_id:', canvasData?.shipment_id);
    console.log('🔍 StrategicItemDetection: Using shipmentId from PROP (not canvas):', shipmentId);
    
    if (!strategicDetectionComplete && !strategicDetectionLoading && shipmentId) {
      console.log('🔍 StrategicItemDetection: Loading strategic status for shipment...');
      loadStrategicStatus();
    }
  }, [shipmentId, strategicDetectionComplete, strategicDetectionLoading]);

  // Trigger detection when product items are available
  useEffect(() => {
    const hasOCRProductItems = canvasData?.invoiceProcessingData?.product_items?.length > 0;
    const hasFormProductItems = productItems?.length > 0;
    
    console.log('🔍 StrategicItemDetection: Product items check:', {
      hasOCRProductItems,
      hasFormProductItems,
      strategicDetectionComplete,
      strategicDetectionLoading,
      shipmentId: !!shipmentId
    });

    if ((hasOCRProductItems || hasFormProductItems) && !strategicDetectionComplete && !strategicDetectionLoading && shipmentId) {
      console.log('🔍 StrategicItemDetection: Product items detected, triggering strategic detection...');
      triggerStrategicDetection();
    }
  }, [productItems, canvasData, strategicDetectionComplete, strategicDetectionLoading, shipmentId]);

  // Load Strategic Status (get existing results)
  const loadStrategicStatus = async () => {
    if (strategicDetectionLoading) {
      console.log('⏳ Strategic status loading already in progress, skipping...');
      return;
    }
    
    try {
      console.log('🔍 StrategicItemDetection: Loading strategic status for shipment:', shipmentId);
      setStrategicDetectionLoading(true);
      
      const data = await apiService.strategic.getShipmentStatus(shipmentId);

      if (data.success) {
        console.log('✅ StrategicItemDetection: Strategic status loaded:', data.data);
        console.log('🔍 StrategicItemDetection: Full API response:', JSON.stringify(data.data, null, 2));
        
        // The API response structure has nested objects
        const apiData = data.data;
        const strategicStatus = apiData.strategic_status || {};
        const permitStatus = apiData.permit_status || {};
        
        console.log('🔍 StrategicItemDetection: apiData:', apiData);
        console.log('🔍 StrategicItemDetection: strategicStatus:', strategicStatus);
        console.log('🔍 StrategicItemDetection: permitStatus:', permitStatus);
        console.log('🔍 StrategicItemDetection: detection_results length:', apiData.detection_results?.length || 0);
        
        // Update state with existing strategic detection results
        const hasStrategicItems = strategicStatus.has_strategic_items || false;
        const isExportBlocked = strategicStatus.export_blocked || false;
        
        setStrategicItemsDetected(hasStrategicItems);
        setExportBlocked(isExportBlocked);
        
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
        console.log('🔍 StrategicItemDetection: Setting strategicItemsCount to:', strategicCount);
        setStrategicItemsCount(strategicCount);
        setMissingPermits(permitStatus.missing_permits || permitStatus.required_permits || []);
        setStrategicDetectionComplete(true);
        
        console.log('🔍 StrategicItemDetection: Final state set:', {
          strategicItemsDetected: hasStrategicItems,
          exportBlocked: isExportBlocked,
          complianceScore: calculatedComplianceScore,
          strategicItemsCount: strategicCount
        });
        
        // Notify parent component of status change
        if (onStrategicStatusChange) {
          onStrategicStatusChange({
            hasStrategicItems,
            exportBlocked: isExportBlocked,
            complianceScore: calculatedComplianceScore,
            strategicItemsCount: strategicCount,
            missingPermits: permitStatus.missing_permits || permitStatus.required_permits || []
          });
        }
        
      } else {
        console.log('ℹ️ StrategicItemDetection: No existing strategic status found:', data.error);
        // If no existing status, trigger detection
        triggerStrategicDetection();
      }
    } catch (error) {
      console.error('❌ StrategicItemDetection: Strategic status loading error:', error);
      // If API fails, try to trigger detection
      triggerStrategicDetection();
    } finally {
      setStrategicDetectionLoading(false);
    }
  };

  // Trigger Strategic Detection (fallback if no existing status)
  const triggerStrategicDetection = async () => {
    try {
      console.log('🔍 StrategicItemDetection: Triggering strategic detection for shipment:', shipmentId);
      
      let detectionItems = [];
      
      // Use OCR data if available from canvas/invoice processing
      if (canvasData?.invoiceProcessingData?.product_items?.length > 0) {
        console.log('🔍 StrategicItemDetection: Using OCR product items for detection');
        const ocrItems = canvasData.invoiceProcessingData.product_items;
        detectionItems = ocrItems.map(item => ({
          product_description: item.description || item.product_description || item.item_description,
          hs_code: item.hs_code,
          quantity: parseFloat(item.quantity) || 1,
          value: parseFloat(item.value || item.line_total || item.unit_price) || 0,
          item_id: item.id || item.item_id
        })).filter(item => item.product_description && item.product_description.trim() !== '');
      } else if (productItems?.length > 0) {
        // Use form product items as fallback
        console.log('🔍 StrategicItemDetection: Using form product items for detection');
        detectionItems = productItems.map(item => ({
          product_description: item.productDescription || item.description,
          hs_code: item.hsCode,
          quantity: parseFloat(item.quantity) || 1,
          value: parseFloat(item.unitPrice || item.commercialValue) || 0,
          item_id: item.id
        })).filter(item => item.product_description && item.product_description.trim() !== '');
      }

      if (detectionItems.length === 0) {
        console.log('⚠️ StrategicItemDetection: No items with descriptions found for strategic detection');
        setStrategicDetectionComplete(true);
        return;
      }
      
      console.log('🔍 StrategicItemDetection: Calling strategic detect API with items:', detectionItems);

      const data = await apiService.strategic.detect({
        shipment_id: shipmentId,
        product_items: detectionItems
      });

      if (data.success) {
        console.log('✅ StrategicItemDetection: Strategic detection completed:', data.data);
        // After detection, reload status to get updated results
        setTimeout(() => loadStrategicStatus(), 1000);
      } else {
        console.error('❌ StrategicItemDetection: Strategic detection failed:', data.error);
        setStrategicDetectionComplete(true);
      }
    } catch (error) {
      console.error('❌ StrategicItemDetection: Strategic detection error:', error);
      setStrategicDetectionComplete(true);
    }
  };

  // Handle retrigger detection
  const handleRetriggerDetection = useCallback(() => {
    setStrategicDetectionComplete(false);
    setStrategicDetectionLoading(false);
    triggerStrategicDetection();
  }, [shipmentId]);

  return (
    <div className={`strategic-item-detection ${className}`}>
      <StrategicItemPermitInterface
        shipmentId={shipmentId}
        strategicItemsDetected={strategicItemsDetected}
        strategicDetectionComplete={strategicDetectionComplete}
        strategicDetectionLoading={strategicDetectionLoading}
        exportBlocked={exportBlocked}
        complianceScore={complianceScore}
        missingPermits={missingPermits}
        strategicItemsCount={strategicItemsCount}
        canvasData={canvasData}
        onRetriggerDetection={handleRetriggerDetection}
      />
    </div>
  );
};

StrategicItemDetection.propTypes = {
  shipmentId: PropTypes.string.isRequired,
  productItems: PropTypes.array,
  canvasData: PropTypes.object,
  onStrategicStatusChange: PropTypes.func,
  className: PropTypes.string
};

export default StrategicItemDetection;