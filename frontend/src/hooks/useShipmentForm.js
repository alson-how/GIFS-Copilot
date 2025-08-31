import { useState, useEffect } from 'react';

/**
 * Custom hook for managing shipment form state
 */
export const useShipmentForm = (defaultShipmentId, canvasData) => {
  const [shipmentId, setShipmentId] = useState(
    defaultShipmentId || (crypto?.randomUUID?.() || '')
  );
  const [exportDate, setExportDate] = useState('');
  const [mode, setMode] = useState('air');
  const [destination, setDestination] = useState('China');
  const [endUser, setEndUser] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [incoterms, setIncoterms] = useState('FOB');
  const [insuranceRequired, setInsuranceRequired] = useState(true);
  const [consigneeRegistration, setConsigneeRegistration] = useState('');
  const [shipmentPriority, setShipmentPriority] = useState('Standard');
  
  // Update shipmentId when canvasData contains a new shipmentId
  useEffect(() => {
    if (canvasData?.shipmentId && canvasData.shipmentId !== shipmentId) {
      setShipmentId(canvasData.shipmentId);
    }
  }, [canvasData?.shipmentId, shipmentId]);
  
  const shipmentData = {
    shipmentId,
    exportDate,
    mode,
    destination,
    endUser,
    currency,
    incoterms,
    insuranceRequired,
    consigneeRegistration,
    shipmentPriority
  };
  
  const setters = {
    setShipmentId,
    setExportDate,
    setMode,
    setDestination,
    setEndUser,
    setCurrency,
    setIncoterms,
    setInsuranceRequired,
    setConsigneeRegistration,
    setShipmentPriority
  };
  
  const resetForm = () => {
    setExportDate('');
    setMode('air');
    setDestination('China');
    setEndUser('');
    setCurrency('USD');
    setIncoterms('FOB');
    setInsuranceRequired(true);
    setConsigneeRegistration('');
    setShipmentPriority('Standard');
  };
  
  return {
    ...shipmentData,
    ...setters,
    resetForm
  };
};