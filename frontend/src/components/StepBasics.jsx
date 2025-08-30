import React, { useState, useEffect } from 'react';
import { postBasics } from '../services/api.js';
import StrategicItemPermitInterface from './StrategicItemPermitInterface.jsx';

export default function StepBasics({ onSaved, defaultShipmentId, canvasData, isCanvas }) {
  console.log('🚀 StepBasics component rendered');
  console.log('🚀 canvasData prop:', canvasData);
  
  // VERY OBVIOUS TEST - this will show an alert if component is rendering
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      console.log('🚀 ALERT TEST: StepBasics is definitely rendering!');
      // Uncomment this line to test: alert('StepBasics component is rendering!');
    }, 1000);
  }
  
  const [shipmentId, setShipmentId] = useState(defaultShipmentId || (crypto?.randomUUID?.() || ''));
  const [exportDate, setExportDate] = useState('');
  const [mode, setMode] = useState('air');
  const [destination, setDestination] = useState('China');
  const [endUser, setEndUser] = useState('');

  // Update shipmentId when canvasData contains a new shipmentId from invoice processing
  useEffect(() => {
    if (canvasData?.shipmentId && canvasData.shipmentId !== shipmentId) {
      console.log('🆔 Updating shipmentId from canvasData:', canvasData.shipmentId);
      setShipmentId(canvasData.shipmentId);
    }
  }, [canvasData?.shipmentId, shipmentId]);
  
  // Multi-product state - array of product items
  const [productItems, setProductItems] = useState([{
    id: crypto?.randomUUID?.() || Date.now().toString(),
    semiconductorCategory: 'standard_ic_asics',
    technologyOrigin: 'malaysia',
    hsCode: '',
    quantity: '',
    unit: 'PCS',
    unitPrice: '',
    endUsePurpose: '',
    productDescription: '',
    commercialValue: '',
    isStrategic: false,
    isAIChip: false
  }]);
  
  // Shipment-level fields
  const [currency, setCurrency] = useState('USD');
  const [incoterms, setIncoterms] = useState('FOB');
  const [insuranceRequired, setInsuranceRequired] = useState(true);
  const [consigneeRegistration, setConsigneeRegistration] = useState('');
  const [shipmentPriority, setShipmentPriority] = useState('Standard');
  
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Strategic Items Compliance State
  const [strategicItemsDetected, setStrategicItemsDetected] = useState(false);
  const [strategicDetectionComplete, setStrategicDetectionComplete] = useState(false);
  const [strategicDetectionLoading, setStrategicDetectionLoading] = useState(false);
  const [exportBlocked, setExportBlocked] = useState(false);
  const [complianceScore, setComplianceScore] = useState(100);
  const [missingPermits, setMissingPermits] = useState([]);

  // Product item management functions
  const addNewItem = () => {
    const newItem = {
      id: crypto?.randomUUID?.() || Date.now().toString(),
      semiconductorCategory: 'standard_ic_asics',
      technologyOrigin: 'malaysia',
      hsCode: '',
      quantity: '',
      unit: 'PCS',
      unitPrice: '',
      endUsePurpose: '',
      productDescription: '',
      commercialValue: '',
      isStrategic: false,
      isAIChip: false
    };
    setProductItems([...productItems, newItem]);
  };

  const removeItem = (id) => {
    if (productItems.length > 1) {
      setProductItems(productItems.filter(item => item.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setProductItems(productItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-detect strategic and AI chip status
        updatedItem.isStrategic = checkIfStrategic(updatedItem);
        updatedItem.isAIChip = checkIfAIChip(updatedItem);
        return updatedItem;
      }
      return item;
    }));
  };

  // Auto-detection functions (checkIfStrategic is now defined above with RAG integration)

  const checkIfAIChip = (item) => {
    const aiCategories = ['ai_accelerator_gpu_tpu_npu', 'neural_processing'];
    const aiKeywords = ['ai', 'neural', 'machine learning', 'deep learning', 'gpu', 'tensor'];
    
    return aiCategories.includes(item.semiconductorCategory) ||
           aiKeywords.some(keyword => 
             item.productDescription.toLowerCase().includes(keyword) ||
             item.endUsePurpose.toLowerCase().includes(keyword)
           );
  };

  // Strategic Items Detection
  const triggerStrategicDetection = async () => {
    if (strategicDetectionLoading) {
      console.log('⏳ Strategic detection already in progress, skipping...');
      return;
    }
    
    try {
      console.log('🔍 Triggering strategic items detection for shipment:', shipmentId);
      setStrategicDetectionLoading(true);
      
      let detectionItems = [];
      
      // First try to use OCR data if available
      if (canvasData?.ocrData?.fieldSuggestions?.product_items?.value?.length > 0) {
        console.log('🔍 Using OCR product items for detection');
        const ocrItems = canvasData.ocrData.fieldSuggestions.product_items.value;
        detectionItems = ocrItems.map(item => ({
          description: item.description,
          hs_code: item.hs_code,
          technical_specs: {
            semiconductor_category: 'ai_accelerator', // Inferred from description
            technology_origin: canvasData.ocrData.fieldSuggestions.technology_origin?.value || 'singapore',
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            commercial_value: parseFloat(item.line_total) || 0
          }
        })).filter(item => item.description && item.description.trim() !== '');
      }
      
      // Fallback to form data if no OCR data
      if (detectionItems.length === 0) {
        console.log('🔍 Using form product items for detection');
        detectionItems = productItems.map(item => ({
          description: item.productDescription,
          hs_code: item.hsCode,
          technical_specs: {
            semiconductor_category: item.semiconductorCategory,
            technology_origin: item.technologyOrigin,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unitPrice) || 0,
            commercial_value: parseFloat(item.commercialValue) || 0
          }
        })).filter(item => item.description && item.description.trim() !== '');
      }

      if (detectionItems.length === 0) {
        console.log('⚠️ No items with descriptions found for strategic detection');
        return;
      }
      
      console.log('🔍 Detection items prepared:', detectionItems);

      const response = await fetch('/api/strategic/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shipment_id: shipmentId,
          product_items: detectionItems
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Strategic detection completed:', data.data);
        setStrategicItemsDetected(data.data.strategic_items_found > 0);
        setExportBlocked(data.data.export_blocked);
        // Calculate compliance score based on strategic items and export status
        let calculatedComplianceScore = 100;
        if (data.data.strategic_items_found > 0) {
          if (data.data.export_blocked) {
            calculatedComplianceScore = 50; // Blocked due to missing permits
          } else {
            calculatedComplianceScore = 90; // Strategic items detected but compliant
          }
        }
        setComplianceScore(data.data.overall_compliance_score || calculatedComplianceScore);
        // Set missing permits based on required permits (all are missing until uploaded)
        const requiredPermits = data.data.required_permits || [];
        setMissingPermits(requiredPermits); // All required permits are initially missing
        setStrategicDetectionComplete(true);
        
        // Update product items with strategic flags
        const updatedItems = productItems.map(item => {
          const detectionResult = data.data.detection_results.find(
            result => result.product_description === item.productDescription
          );
          
          if (detectionResult) {
            return {
              ...item,
              isStrategic: detectionResult.is_strategic,
              strategicCodes: detectionResult.strategic_codes || []
            };
          }
          
          return item;
        });
        
        setProductItems(updatedItems);
      } else {
        console.error('❌ Strategic detection failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Strategic detection error:', error);
    } finally {
      setStrategicDetectionLoading(false);
    }
  };

  // Handle strategic compliance changes
  const handleComplianceChange = (complianceData) => {
    setStrategicItemsDetected(complianceData.hasStrategicItems);
    setExportBlocked(complianceData.exportBlocked);
    setComplianceScore(complianceData.complianceScore);
    setMissingPermits(complianceData.missingPermits || []);
    
    console.log('🔒 Compliance status updated:', complianceData);
  };

  // Calculate totals and summaries
  const getTotalValue = () => {
    console.log('🔍 getTotalValue called');
    console.log('🔍 canvasData:', canvasData);
    console.log('🔍 canvasData?.ocrData:', canvasData?.ocrData);
    console.log('🔍 canvasData?.ocrData?.fieldSuggestions:', canvasData?.ocrData?.fieldSuggestions);
    console.log('🔍 commercial_value available:', !!canvasData?.ocrData?.fieldSuggestions?.commercial_value);
    
    // First try to get the commercial_value from OCR data (this is the SUBTOTAL from the invoice)
    if (canvasData?.ocrData?.fieldSuggestions?.commercial_value?.value) {
      const ocrTotal = canvasData.ocrData.fieldSuggestions.commercial_value.value;
      console.log('🧮 Using OCR SUBTOTAL:', ocrTotal);
      return ocrTotal;
    }
    
    // Fallback to manual calculation from product items
    console.log('🔍 Falling back to manual calculation, productItems:', productItems);
    const total = productItems.reduce((sum, item) => {
      const value = parseFloat(item.commercialValue) || 0;
      console.log(`🧮 Item ${item.id}: commercialValue="${item.commercialValue}" -> ${value}`);
      return sum + value;
    }, 0);
    console.log('🧮 Manual total calculated:', total);
    return total;
  };

  const getTotalQuantity = () => {
    return productItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  };

  const getStrategicCount = () => {
    return productItems.filter(item => item.isStrategic).length;
  };

  const getAIChipCount = () => {
    return productItems.filter(item => item.isAIChip).length;
  };

  // Document requirements state
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState({});

  // OCR integration function
  const populateFromOCR = (ocrData) => {
    if (ocrData && ocrData.fieldSuggestions) {
      // Check if we have table data from Commercial Invoice
      if (ocrData.fieldSuggestions.invoice_table && ocrData.fieldSuggestions.product_items) {
        const tableItems = ocrData.fieldSuggestions.product_items;
        const newItems = tableItems.map((item, index) => ({
          id: crypto?.randomUUID?.() || (Date.now() + index).toString(),
          semiconductorCategory: 'standard_ic_asics', // Default, user can change
          technologyOrigin: item.origin || 'malaysia',
          hsCode: item.hs_code || '',
          quantity: item.quantity || '',
          unit: item.unit || 'PCS',
          unitPrice: item.unit_price || '',
          endUsePurpose: '',
          productDescription: item.description || '',
          commercialValue: item.line_total || item.total_amount || '',  // Use line_total first
          isStrategic: false,
          isAIChip: false,
          // Store original table data for reference
          tableRowNumber: item.row_number,
          originalTableData: item
        }));

        // Auto-detect strategic/AI status for each item
        const processedItems = newItems.map(item => ({
          ...item,
          isStrategic: checkIfStrategic(item),
          isAIChip: checkIfAIChip(item)
        }));

        setProductItems(processedItems);
        
        // Check for strategic items and high-value requirements after processing
        checkDocumentRequirements(processedItems);
      } else {
        // Fallback to single item from field suggestions
        const ocrItems = ocrData.extractedItems || [ocrData.fieldSuggestions];
        
        const newItems = ocrItems.map((itemData, index) => ({
          id: crypto?.randomUUID?.() || (Date.now() + index).toString(),
          semiconductorCategory: itemData.semiconductor_category || 'standard_ic_asics',
          technologyOrigin: itemData.technology_origin || 'malaysia',
          hsCode: itemData.hs_code || '',
          quantity: itemData.quantity || '',
          unit: itemData.quantity_unit || 'PCS',
          unitPrice: itemData.unit_price || '',
          endUsePurpose: itemData.end_use_purpose || '',
          productDescription: itemData.product_description || '',
          commercialValue: itemData.commercial_value || '',
          isStrategic: false,
          isAIChip: false
        }));

        // Auto-detect strategic/AI status for each item
        const processedItems = newItems.map(item => ({
          ...item,
          isStrategic: checkIfStrategic(item),
          isAIChip: checkIfAIChip(item)
        }));

        setProductItems(processedItems);
        
        // Check for strategic items and high-value requirements after processing
        checkDocumentRequirements(processedItems);
      }
    }
  };

  // Enhanced strategic items detection with RAG integration
  const checkIfStrategic = (item) => {
    const strategicCategories = ['military_grade', 'high_performance_computing', 'ai_accelerator_gpu_tpu_npu'];
    const strategicHSCodes = ['8542.31', '8542.32', '8542.33', '8473.30'];
    
    // Basic category and HS code checking
    const basicStrategic = strategicCategories.includes(item.semiconductorCategory) ||
                          strategicHSCodes.some(code => item.hsCode.startsWith(code)) ||
                          item.endUsePurpose.toLowerCase().includes('military') ||
                          item.endUsePurpose.toLowerCase().includes('defense');
    
    // RAG-based strategic detection from product descriptions
    const ragStrategic = checkStrategicFromDescription(item.productDescription);
    
    return basicStrategic || ragStrategic;
  };

  // RAG-based strategic items detection
  const checkStrategicFromDescription = (description) => {
    if (!description) return false;
    
    const desc = description.toLowerCase();
    const strategicKeywords = [
      'ai accelerator', 'gpu', 'tpu', 'npu', 'neural processing',
      'high performance computing', 'hpc', 'supercomputing',
      'military', 'defense', 'aerospace', 'satellite',
      'cryptographic', 'encryption', 'secure processor',
      'fpga', 'field programmable', 'asic', 'application specific',
      'radar', 'lidar', 'autonomous', 'drone', 'unmanned',
      'quantum', 'photonic', 'optical computing'
    ];
    
    return strategicKeywords.some(keyword => desc.includes(keyword));
  };

  // Document requirements checking
  const checkDocumentRequirements = (items) => {
    const requirements = [];
    const hasStrategicItems = items.some(item => item.isStrategic);
    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.commercialValue) || 0), 0);
    console.log('items', items);
		console.log('hasStrategicItems', hasStrategicItems);
    // Strategic items require technical documentation (mandatory)
    if (hasStrategicItems) {
      requirements.push({
        id: 'technical_docs',
        type: 'Technical Documentation',
        description: 'Product specifications required for strategic items',
        mandatory: true,
        reason: 'Strategic Items Detected'
      });
      
      // Also check if import permit is available
      requirements.push({
        id: 'import_permit',
        type: 'Import Permit STA 2010',
        description: 'If you have it (strategic trade authorization)',
        mandatory: false,
        reason: 'Strategic Items Detected'
      });
    }
    
          // High-value shipments recommend insurance
      if (totalValue > 100000) {
        console.log('🛡️ HIGH-VALUE DETECTED: Adding insurance requirement for $', totalValue);
        requirements.push({
          id: 'insurance_cert',
          type: 'Insurance Certificate',
          description: 'For coverage protection on high-value shipment',
          mandatory: false,
          reason: 'High-Value Shipment (>$100K)'
        });
      }
    
    setRequiredDocuments(requirements);
    
    // Update status message
    if (requirements.length > 0) {
      const mandatoryCount = requirements.filter(req => req.mandatory).length;
      const optionalCount = requirements.length - mandatoryCount;
      let message = '📋 Document requirements identified: ';
      if (mandatoryCount > 0) message += `${mandatoryCount} mandatory`;
      if (optionalCount > 0) message += `${mandatoryCount > 0 ? ', ' : ''}${optionalCount} recommended`;
      setStatus(message);
    }
  };

  // File upload handler
  const handleFileUpload = async (docType, file) => {
    if (!file) return;
    
    try {
      setStatus(`📤 Uploading ${docType}...`);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', docType);
      formData.append('shipment_id', shipmentId);
      
      const response = await fetch('/api/documents/upload-supporting', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setUploadedDocuments(prev => ({
          ...prev,
          [docType]: {
            filename: file.name,
            uploaded_at: new Date().toISOString(),
            document_id: result.document_id
          }
        }));
        setStatus(`✅ ${docType} uploaded successfully`);
      } else {
        setStatus(`❌ Failed to upload ${docType}`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setStatus(`❌ Error uploading ${docType}: ${error.message}`);
    }
  };

  // Auto-fill data from canvas when provided, or load default OCR data
  useEffect(() => {
    if (canvasData) {
      // Auto-fill export date if extracted
      if (canvasData.extractedDate) {
        setExportDate(canvasData.extractedDate);
      }
      
      // Auto-fill destination if extracted
      if (canvasData.extractedDestination) {
        // Map common country names to our dropdown values
        const destinationMap = {
          'China': 'China',
          'United States': 'United States',
          'USA': 'United States',
          'Singapore': 'Singapore',
          'Thailand': 'Thailand',
          'Vietnam': 'Vietnam',
          'Japan': 'Japan',
          'South Korea': 'South Korea',
          'Taiwan': 'Taiwan',
          'Indonesia': 'Indonesia',
          'Philippines': 'Philippines'
        };
        
        const mappedDestination = destinationMap[canvasData.extractedDestination];
        if (mappedDestination) {
          setDestination(mappedDestination);
        }
      }
      
      // Auto-fill from OCR data if available
      if (canvasData.ocrData && canvasData.ocrData.fieldSuggestions) {
        console.log('🔄 Applying OCR auto-fill from canvas data:', canvasData.ocrData.fieldSuggestions);
        handleAutoFill(canvasData.ocrData.fieldSuggestions);
        
        // Also populate product items from OCR table data
        console.log('📦 Populating product items from OCR data');
        console.log('📦 OCR data structure:', canvasData.ocrData);
        console.log('📦 Has invoice_table:', !!canvasData.ocrData.fieldSuggestions.invoice_table);
        console.log('📦 Has product_items:', !!canvasData.ocrData.fieldSuggestions.product_items);
        if (canvasData.ocrData.fieldSuggestions.invoice_table) {
          console.log('📊 Invoice table structure:', canvasData.ocrData.fieldSuggestions.invoice_table);
          console.log('📊 Table headers:', canvasData.ocrData.fieldSuggestions.invoice_table.headers);
          console.log('📊 Table rows count:', canvasData.ocrData.fieldSuggestions.invoice_table.rows?.length);
        }
        populateFromOCR(canvasData.ocrData);
      }
      
      // Show canvas-specific status message
      if (canvasData.originalQuery) {
        const ocrInfo = canvasData.ocrData ? ` (${canvasData.ocrData.documents?.length || 0} documents processed)` : '';
        setStatus(`📋 Canvas opened from: "${canvasData.originalQuery}"${ocrInfo}`);
      }
    } else {
      // Load default OCR data when no canvas data is provided (for demo/testing)
      const loadDefaultOCRData = async () => {
        try {
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ demo: true })
          });
          
          if (response.ok) {
            const ocrData = await response.json();
            if (ocrData.fieldSuggestions) {
              console.log('🔄 Loading default OCR data for demo:', ocrData.fieldSuggestions);
              handleAutoFill(ocrData.fieldSuggestions);
              setStatus('📊 Demo OCR data loaded - showing sample Commercial Invoice data');
            }
          }
        } catch (error) {
          console.log('No default OCR data available:', error.message);
        }
      };
      
      loadDefaultOCRData();
    }
  }, [canvasData]);

  // Strategic Items Detection Trigger
  useEffect(() => {
    // Check if we have OCR data with product items from Commercial Invoice
    const hasOCRProductItems = canvasData?.ocrData?.fieldSuggestions?.product_items?.value?.length > 0;
    const hasFormProductItems = productItems.filter(item => 
      item.productDescription && item.productDescription.trim() !== ''
    ).length > 0;
    
    if ((hasOCRProductItems || hasFormProductItems) && !strategicDetectionComplete && !strategicDetectionLoading && shipmentId) {
      console.log('🔍 Product items detected, triggering strategic detection...');
      console.log('🔍 OCR product items:', hasOCRProductItems ? canvasData.ocrData.fieldSuggestions.product_items.value.length : 0);
      console.log('🔍 Form product items:', hasFormProductItems ? productItems.length : 0);
      triggerStrategicDetection();
    }
  }, [productItems, canvasData, strategicDetectionComplete, strategicDetectionLoading, shipmentId]);

  // Conditional logic: high-value shipment
  useEffect(() => {
    console.log('🔍 High-value useEffect triggered');
    console.log('🔍 productItems:', productItems);
    console.log('🔍 canvasData in useEffect:', canvasData);
    console.log('🔍 canvasData?.ocrData in useEffect:', canvasData?.ocrData);
    const totalValue = getTotalValue();
    console.log('🔍 totalValue:', totalValue);
    if (totalValue > 100000) {
      console.log('🚨 HIGH-VALUE SHIPMENT DETECTED: $', totalValue);
      if (shipmentPriority === 'Standard') {
        setShipmentPriority('Urgent');
        console.log('🚨 High-value shipment detected - upgraded to Urgent priority');
      }
      if (!insuranceRequired) {
        setInsuranceRequired(true);
        console.log('🛡️ High-value shipment detected - enabled insurance requirement');
      }
    } else {
      console.log('📊 Normal-value shipment: $', totalValue);
    }
  }, [productItems, shipmentPriority, insuranceRequired, canvasData]);

  // Helper function to format dates for input fields
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Handle various date formats
      let date;
      
      // Try parsing common date formats
      if (dateString.includes('/')) {
        // Format: MM/DD/YYYY or DD/MM/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
          // Assume MM/DD/YYYY for now
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      } else if (dateString.includes('-')) {
        // Format: YYYY-MM-DD or DD-MM-YYYY
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateString);
        return '';
      }
      
      // Return in YYYY-MM-DD format for HTML date input
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return '';
    }
  };

  // Handle auto-fill from OCR document processing
  function handleAutoFill(suggestions) {
    console.log('🔄 Applying OCR auto-fill suggestions:', suggestions);
    console.log('🔍 Checking for consignee_name in suggestions:', suggestions.consignee_name);
    
    // Map OCR field names to shipment-level setters
    const shipmentFieldMapping = {
      'currency': (value) => setCurrency(value),
      'consignee_name': (value) => {
        console.log('✅ Setting endUser from consignee_name:', value);
        setEndUser(value);
      },
      'end_user_consignee_name': (value) => {
        console.log('✅ Setting endUser from end_user_consignee_name:', value);
        setEndUser(value);
      },
      'incoterms': (value) => setIncoterms(value),
      'destination_country': (value) => setDestination(value),
      'transport_mode': (value) => {
        console.log('✅ Setting transport mode from transport_mode:', value);
        // Map transport mode values
        const modeMapping = {
          'sea': 'sea',
          'ocean': 'sea', 
          'vessel': 'sea',
          'ship': 'sea',
          'air': 'air',
          'flight': 'air',
          'airline': 'air',
          'aircraft': 'air',
          'land': 'land',
          'truck': 'land',
          'road': 'land'
        };
        const mappedMode = modeMapping[value.toLowerCase()] || value.toLowerCase();
        setMode(mappedMode);
      },
      'target_export_date': (value) => {
        console.log('✅ Setting export date from target_export_date:', value);
        // Handle different date formats
        const formattedDate = formatDateForInput(value);
        setExportDate(formattedDate);
      },
      'consignee_registration': (value) => setConsigneeRegistration(value)
    };

    // Product-level fields will be handled by populateFromOCR function
    const productFields = ['commercial_value', 'quantity', 'quantity_unit', 'hs_code', 'technology_origin', 'end_use_purpose', 'product_description', 'semiconductor_category'];
    
    // Additional shipment-level mappings for missing fields
    const additionalMappings = {
      'technology_origin': (value) => {
        console.log('✅ Setting technology origin for first product item:', value);
        if (productItems.length > 0) {
          updateItem(productItems[0].id, 'technologyOrigin', value);
        }
      }
    };

    // Apply suggestions to shipment-level fields
    let appliedCount = 0;
    for (const [fieldName, suggestion] of Object.entries(suggestions)) {
      // Handle shipment-level fields
      const shipmentSetter = shipmentFieldMapping[fieldName] || additionalMappings[fieldName];
      if (shipmentSetter) {
        // Handle both direct values and object format
        const value = typeof suggestion === 'object' && suggestion.value ? suggestion.value : suggestion;
        if (value) {
          try {
            shipmentSetter(value);
            appliedCount++;
            const source = typeof suggestion === 'object' && suggestion.source ? suggestion.source : 'OCR';
            console.log(`✅ Applied shipment field ${fieldName}: ${value} (from ${source})`);
          } catch (error) {
            console.warn(`⚠️ Failed to apply ${fieldName}:`, error);
          }
        }
      }
            // Handle product-level fields by updating first product item
      else if (productFields.includes(fieldName)) {
        const value = typeof suggestion === 'object' && suggestion.value ? suggestion.value : suggestion;
        if (value) {
          try {
            const firstItemId = productItems[0]?.id;
            if (firstItemId) {
              const fieldMap = {
                'commercial_value': 'commercialValue',
                'quantity': 'quantity', 
                'quantity_unit': 'unit',
                'hs_code': 'hsCode',
                'technology_origin': 'technologyOrigin',
                'end_use_purpose': 'endUsePurpose',
                'product_description': 'productDescription',
                'semiconductor_category': 'semiconductorCategory'
              };
              const mappedField = fieldMap[fieldName];
                if (mappedField) {
                  updateItem(firstItemId, mappedField, value);
                  appliedCount++;
                  const source = typeof suggestion === 'object' && suggestion.source ? suggestion.source : 'OCR';
                  console.log(`✅ Applied product field ${fieldName}: ${value} (from ${source})`);
                }
            }
          } catch (error) {
            console.warn(`⚠️ Failed to apply product field ${fieldName}:`, error);
          }
        }
      }
    }

    // Log summary of what was processed
    console.log(`🔄 OCR Auto-fill Summary: ${appliedCount} fields applied from ${Object.keys(suggestions).length} suggestions`);
    console.log('🔍 Available fields in suggestions:', Object.keys(suggestions));
    console.log('🔍 Mapped shipment fields:', Object.keys(shipmentFieldMapping));
    console.log('🔍 Product fields to check:', productFields);
    
    // Show success message
    if (appliedCount > 0) {
      setStatus(`✨ Auto-filled ${appliedCount} fields from uploaded documents`);
      
      // Conditional logic based on auto-filled commercial value
      const totalValue = getTotalValue();
			console.log('totalValue 483', totalValue);
      if (totalValue > 100000) {
        setShipmentPriority('Urgent');
        setInsuranceRequired(true);
        console.log('🚨 High-value shipment detected - set to Urgent priority with insurance');
      }
    } else {
      setStatus('⚠️ No matching fields found for auto-fill');
    }
  }

  async function save() {
    // Check for export blocking due to strategic items compliance
    if (exportBlocked) {
      setStatus('❌ Export blocked due to strategic items compliance requirements. Please upload all required permits before proceeding.');
      alert('🚫 EXPORT BLOCKED\n\nThis shipment contains strategic items subject to Malaysian Strategic Trade Act 2010.\n\nRequired actions:\n' + 
            missingPermits.map(permit => `• Upload ${permit} permit`).join('\n') + 
            '\n\nExport cannot proceed until all permits are uploaded and validated.');
      return;
    }
    
    setLoading(true);
    setStatus('');
    try {
      // Calculate totals from all product items
      const totalValue = getTotalValue();
      const totalQuantity = getTotalQuantity();
      
      // Use first product item for backward compatibility with single-product API
      const firstItem = productItems[0] || {};
      
      const res = await postBasics({
        shipment_id: shipmentId || undefined,
        export_date: exportDate,
        mode,
        product_type: firstItem.semiconductorCategory || 'standard_ic_asics',
        hs_code: firstItem.hsCode || null,
        description: firstItem.productDescription || null,
        tech_origin: firstItem.technologyOrigin || 'malaysia',
        destination_country: destination,
        end_user_name: endUser,
        // Aggregate fields from all product items
        commercial_value: totalValue || null,
        currency,
        quantity: totalQuantity || null,
        quantity_unit: firstItem.unit || 'PCS',
        incoterms,
        end_use_purpose: firstItem.endUsePurpose || null,
        insurance_required: insuranceRequired,
        consignee_registration: consigneeRegistration || null,
        shipment_priority: shipmentPriority,
        // Multi-product data for future API enhancement
        product_items: productItems,
        strategic_count: getStrategicCount(),
        ai_chip_count: getAIChipCount()
      });
      
      const itemCount = productItems.length;
      const strategicCount = getStrategicCount();
      const aiChipCount = getAIChipCount();
      
      let statusMessage = `✅ Shipment basics saved successfully (${itemCount} product${itemCount > 1 ? 's' : ''})`;
      if (strategicCount > 0) statusMessage += ` - ${strategicCount} strategic item${strategicCount > 1 ? 's' : ''}`;
      if (aiChipCount > 0) statusMessage += ` - ${aiChipCount} AI chip${aiChipCount > 1 ? 's' : ''}`;
      
      setStatus(statusMessage);
      const id = res?.shipment_id || shipmentId;
      if (!shipmentId) setShipmentId(id);
      onSaved?.(id, { exportDate, mode, productItems, destination, endUser });
    } catch (e) {
      setStatus(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const getStatusClass = () => {
    if (!status) return '';
    if (status.includes('Error')) return 'status status-error show';
    return 'status status-success show';
  };

  const isFormValid = exportDate && mode && destination && endUser && incoterms;

  return (
    <section className={`card ${isCanvas ? '' : 'fade-in'}`} style={isCanvas ? {
      border: 'none',
      boxShadow: 'none',
      background: 'transparent'
    } : {}}>
      {!isCanvas && (
        <div className="card-header">
          <div className="step-indicator">
            <div className="step-number">0</div>
            <div className="step-title">Shipment Basics</div>
          </div>
          <div className="card-icon">📋</div>
        </div>
      )}
      
      <div className="card-content">
        {isCanvas && canvasData && (
          <div style={{
            background: 'rgba(90, 140, 179, 0.1)',
            border: '1px solid rgba(90, 140, 179, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '1rem' }}>
              📋 Canvas Data
            </h4>
            <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
              <div><strong>Query:</strong> {canvasData.originalQuery}</div>
              {canvasData.extractedDate && <div><strong>Date:</strong> {canvasData.extractedDate}</div>}
              {canvasData.extractedDestination && <div><strong>Destination:</strong> {canvasData.extractedDestination}</div>}
              {canvasData.ocrData && (
                <div><strong>OCR:</strong> {canvasData.ocrData.documents?.length || 0} documents processed</div>
              )}
            </div>
          </div>
        )}

        {/* Document Requirements Checklist */}
        {requiredDocuments.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
              📄 Document Requirements
            </h3>
            
            {/* Strategic Items Warning */}
            {requiredDocuments.some(req => req.reason === 'Strategic Items Detected') && (
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>⚠️</span>
                  <strong style={{ color: '#856404' }}>Strategic Items Detected</strong>
                </div>
                <div style={{ color: '#856404', fontSize: '0.9rem' }}>
                  Strategic items require additional documentation for export compliance
                </div>
              </div>
            )}

            {/* High-Value Warning */}
            {requiredDocuments.some(req => req.reason === 'High-Value Shipment (>$100K)') && (
              <div style={{
                background: 'rgba(23, 162, 184, 0.1)',
                border: '1px solid rgba(23, 162, 184, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>💡</span>
                  <strong style={{ color: '#0c5460' }}>High-Value Shipment Recommendation</strong>
                </div>
                <div style={{ color: '#0c5460', fontSize: '0.9rem' }}>
                  High-value shipment (&gt;${(getTotalValue() / 1000).toFixed(0)}K) - insurance coverage recommended
                </div>
              </div>
            )}

            {/* Document Checklist */}
            <div style={{
              background: 'rgba(248, 249, 250, 1)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0 
              }}>
                {requiredDocuments.map((doc) => (
                  <li key={doc.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: '0.25rem' 
                      }}>
                        <span style={{ 
                          marginRight: '0.5rem',
                          color: doc.mandatory ? '#dc3545' : '#28a745'
                        }}>
                          {uploadedDocuments[doc.id] ? '✅' : (doc.mandatory ? '🔴' : '🟡')}
                        </span>
                        <strong style={{ 
                          color: doc.mandatory ? '#dc3545' : '#495057'
                        }}>
                          {doc.type}
                          {doc.mandatory && <span style={{ color: '#dc3545' }}> *</span>}
                        </strong>
                      </div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#6c757d',
                        marginLeft: '1.5rem'
                      }}>
                        {doc.description}
                      </div>
                      {uploadedDocuments[doc.id] && (
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: '#28a745',
                          marginLeft: '1.5rem',
                          marginTop: '0.25rem'
                        }}>
                          ✅ {uploadedDocuments[doc.id].filename} uploaded
                        </div>
                      )}
                    </div>
                    <div style={{ marginLeft: '1rem' }}>
                      {!uploadedDocuments[doc.id] ? (
                        <label style={{
                          background: doc.mandatory ? '#dc3545' : '#007bff',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          border: 'none',
                          display: 'inline-block'
                        }}>
                          Upload File
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                handleFileUpload(doc.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <button
                          style={{
                            background: '#28a745',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            // Allow re-upload
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
                            input.onchange = (e) => {
                              if (e.target.files[0]) {
                                handleFileUpload(doc.id, e.target.files[0]);
                              }
                            };
                            input.click();
                          }}
                        >
                          Replace
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              
              {/* Legend */}
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.5rem 0',
                borderTop: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.8rem',
                color: '#6c757d'
              }}>
                <div><span style={{ color: '#dc3545' }}>🔴 *</span> Mandatory documents required for export</div>
                <div><span style={{ color: '#28a745' }}>🟡</span> Recommended documents</div>
                <div><span style={{ color: '#28a745' }}>✅</span> Document uploaded successfully</div>
              </div>
            </div>
          </div>
        )}

                    {/* Strategic Items Permit Interface - Must be at top for compliance */}
            <StrategicItemPermitInterface 
              shipmentId={shipmentId}
              onComplianceChange={handleComplianceChange}
              strategicItemsDetected={strategicItemsDetected}
              exportBlocked={exportBlocked}
              complianceScore={complianceScore}
              missingPermits={missingPermits}
              strategicDetectionComplete={strategicDetectionComplete}
              strategicDetectionLoading={strategicDetectionLoading}
            />

        {/* Section 1: Basic Information */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', flex: 1 }}>
              📅 Basic Information
            </h3>            
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Target Export Date *</label>
              <input 
                type="date" 
                className="form-input"
                value={exportDate} 
                onChange={e=>setExportDate(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Transport Mode *</label>
              <select 
                className="form-select"
                value={mode} 
                onChange={e=>setMode(e.target.value)}
                required
              >
                <option value="air">✈️ Air</option>
                <option value="sea">🚢 Sea</option>
                <option value="land">🚛 Land</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Destination Country *</label>
              <select 
                className="form-select"
                value={destination} 
                onChange={e=>setDestination(e.target.value)}
                required
              >
                <option value="China">🇨🇳 China</option>
                <option value="United States">🇺🇸 United States</option>
                <option value="Singapore">🇸🇬 Singapore</option>
                <option value="Thailand">🇹🇭 Thailand</option>
                <option value="Vietnam">🇻🇳 Vietnam</option>
                <option value="Japan">🇯🇵 Japan</option>
                <option value="South Korea">🇰🇷 South Korea</option>
                <option value="Taiwan">🇹🇼 Taiwan</option>
                <option value="Indonesia">🇮🇩 Indonesia</option>
                <option value="Philippines">🇵🇭 Philippines</option>
                <option value="India">🇮🇳 India</option>
                <option value="Germany">🇩🇪 Germany</option>
                <option value="United Kingdom">🇬🇧 United Kingdom</option>
                <option value="France">🇫🇷 France</option>
                <option value="Netherlands">🇳🇱 Netherlands</option>
                <option value="Australia">🇦🇺 Australia</option>
                <option value="Canada">🇨🇦 Canada</option>
                <option value="Mexico">🇲🇽 Mexico</option>
                <option value="Brazil">🇧🇷 Brazil</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">End User / Consignee *</label>
              <input 
                className="form-input"
                placeholder="Company name receiving the goods"
                value={endUser} 
                onChange={e=>setEndUser(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Invoice Table Display (if available from OCR) */}
        {canvasData && canvasData.ocrData && canvasData.ocrData.fieldSuggestions && canvasData.ocrData.fieldSuggestions.invoice_table && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
              📊 Extracted Invoice Table
            </h3>
            <div style={{
              background: 'rgba(90, 140, 179, 0.05)',
              border: '1px solid rgba(90, 140, 179, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              overflow: 'auto'
            }}>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Original table from Commercial Invoice • {canvasData.ocrData.fieldSuggestions.invoice_table?.rows?.length || 0} items detected • {canvasData.ocrData.fieldSuggestions.invoice_table?.headers?.length || 0} columns
              </div>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                background: 'white',
                borderRadius: '4px',
                overflow: 'hidden',
                minWidth: 'max-content'
              }}>
                <thead>
                  <tr style={{ background: 'black', color: 'white' }}>
                    {(canvasData.ocrData.fieldSuggestions.invoice_table?.headers || []).map((header, index) => (
                      <th key={index} style={{ 
                        padding: '0.75rem 0.5rem', 
                        textAlign: 'left', 
                        borderRight: index < (canvasData.ocrData.fieldSuggestions.invoice_table?.headers?.length || 0) - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(canvasData.ocrData.fieldSuggestions.invoice_table?.rows || []).map((row, rowIndex) => (
                    <tr key={rowIndex} style={{ 
                      borderBottom: '1px solid var(--border)',
                      background: rowIndex % 2 === 0 ? 'white' : 'rgba(0,0,0,0.02)'
                    }}>
                      {(row || []).map((cell, cellIndex) => (
                        <td key={cellIndex} style={{ 
                          padding: '0.75rem 0.5rem', 
                          borderRight: cellIndex < (row?.length || 0) - 1 ? '1px solid var(--border)' : 'none',
                          maxWidth: '250px',
                          minWidth: '80px',
                          wordBreak: 'break-word',
                          fontSize: '0.85rem',
                          color: '#333',
                          backgroundColor: 'white'
                        }}>
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.8rem', 
                color: 'var(--text-muted)',
                textAlign: 'center'
              }}>
                ✨ This original invoice table data is used to populate the editable product table below
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Trade Terms */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            💼 Trade Terms
          </h3>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Currency *</label>
              <select 
                className="form-select"
                value={currency}
                onChange={e=>setCurrency(e.target.value)}
                required
              >
                <option value="USD">💵 USD</option>
                <option value="MYR">🇲🇾 MYR</option>
                <option value="SGD">🇸🇬 SGD</option>
                <option value="EUR">🇪🇺 EUR</option>
                <option value="GBP">🇬🇧 GBP</option>
                <option value="JPY">🇯🇵 JPY</option>
                <option value="CNY">🇨🇳 CNY</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Incoterms *</label>
              <select 
                className="form-select"
                value={incoterms}
                onChange={e=>setIncoterms(e.target.value)}
                required
              >
                <option value="FOB">🚢 FOB (Free On Board)</option>
                <option value="CIF">📦 CIF (Cost, Insurance & Freight)</option>
                <option value="EXW">🏭 EXW (Ex Works)</option>
                <option value="DDP">🚚 DDP (Delivered Duty Paid)</option>
                <option value="CFR">⚓ CFR (Cost and Freight)</option>
                <option value="FCA">🚛 FCA (Free Carrier)</option>
                <option value="CPT">📋 CPT (Carriage Paid To)</option>
                <option value="CIP">🛡️ CIP (Carriage and Insurance Paid)</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Insurance Required</label>
              <select 
                className="form-select"
                value={insuranceRequired}
                onChange={e=>setInsuranceRequired(e.target.value === 'true')}
              >
                <option value={true}>✅ Yes, Insurance Required</option>
                <option value={false}>❌ No Insurance</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Shipment Priority</label>
              <select 
                className="form-select"
                value={shipmentPriority}
                onChange={e=>setShipmentPriority(e.target.value)}
              >
                <option value="Standard">📦 Standard</option>
                <option value="Urgent">⚡ Urgent</option>
                <option value="Express">🚀 Express</option>
              </select>
              {getTotalValue() > 100000 && (
                <small style={{color: 'orange', fontSize: '0.8rem'}}>
                  💡 High-value shipment detected - Urgent priority recommended
                </small>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Parties & Destination */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            🏢 Parties & Destination
          </h3>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Consignee Registration (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={consigneeRegistration}
                onChange={e=>setConsigneeRegistration(e.target.value)}
                placeholder="Registration number or license details"
              />
              <small style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>
                Business registration, import license, or other official numbers
              </small>
            </div>
          </div>
        </div>

        {/* Status and Action Buttons */}
        <div className={getStatusClass()}>{status}</div>

        <div className="card-actions">
          <button 
            type="button" 
            onClick={save}
            className={`btn ${isFormValid ? 'btn-primary' : 'btn-disabled'}`}
            disabled={loading || !isFormValid}
          >
            {loading ? '⏳ Saving...' : '💾 Save Basics'}
          </button>
          
          {!isFormValid && (
            <small style={{color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block'}}>
              ⚠️ Please fill in all required fields: Export Date, Transport Mode, Destination, End User/Consignee, and Incoterms
            </small>
          )}
        </div>
      </div>
    </section>
  );
};
