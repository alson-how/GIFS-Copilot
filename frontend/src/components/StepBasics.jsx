import React, { useState, useEffect } from 'react';
import { postBasics } from '../services/api.js';

export default function StepBasics({ onSaved, defaultShipmentId, canvasData, isCanvas }) {
  const [shipmentId, setShipmentId] = useState(defaultShipmentId || (crypto?.randomUUID?.() || ''));
  const [exportDate, setExportDate] = useState('');
  const [mode, setMode] = useState('air');
  const [destination, setDestination] = useState('China');
  const [endUser, setEndUser] = useState('');
  
  // Multi-product state - array of product items
  const [productItems, setProductItems] = useState([{
    id: crypto?.randomUUID?.() || Date.now().toString(),
    semiconductorCategory: 'standard_ic_asics',
    technologyOrigin: 'malaysia',
    hsCode: '',
    quantity: '',
    unit: 'PCS',
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

  // Product item management functions
  const addNewItem = () => {
    const newItem = {
      id: crypto?.randomUUID?.() || Date.now().toString(),
      semiconductorCategory: 'standard_ic_asics',
      technologyOrigin: 'malaysia',
      hsCode: '',
      quantity: '',
      unit: 'PCS',
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

  // Auto-detection functions
  const checkIfStrategic = (item) => {
    const strategicCategories = ['military_grade', 'high_performance_computing', 'ai_accelerator_gpu_tpu_npu'];
    const strategicHSCodes = ['8542.31', '8542.32', '8542.33'];
    
    return strategicCategories.includes(item.semiconductorCategory) ||
           strategicHSCodes.some(code => item.hsCode.startsWith(code)) ||
           item.endUsePurpose.toLowerCase().includes('military') ||
           item.endUsePurpose.toLowerCase().includes('defense');
  };

  const checkIfAIChip = (item) => {
    const aiCategories = ['ai_accelerator_gpu_tpu_npu', 'neural_processing'];
    const aiKeywords = ['ai', 'neural', 'machine learning', 'deep learning', 'gpu', 'tensor'];
    
    return aiCategories.includes(item.semiconductorCategory) ||
           aiKeywords.some(keyword => 
             item.productDescription.toLowerCase().includes(keyword) ||
             item.endUsePurpose.toLowerCase().includes(keyword)
           );
  };

  // Calculate totals and summaries
  const getTotalValue = () => {
    return productItems.reduce((sum, item) => sum + (parseFloat(item.commercialValue) || 0), 0);
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

  // OCR integration function
  const populateFromOCR = (ocrData) => {
    if (ocrData && ocrData.fieldSuggestions) {
      // If OCR contains multiple product items, create multiple items
      const ocrItems = ocrData.extractedItems || [ocrData.fieldSuggestions];
      
      const newItems = ocrItems.map((itemData, index) => ({
        id: crypto?.randomUUID?.() || (Date.now() + index).toString(),
        semiconductorCategory: itemData.semiconductor_category || 'standard_ic_asics',
        technologyOrigin: itemData.technology_origin || 'malaysia',
        hsCode: itemData.hs_code || '',
        quantity: itemData.quantity || '',
        unit: itemData.quantity_unit || 'PCS',
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
    }
  };

  // Auto-fill data from canvas when provided
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
      }
      
      // Show canvas-specific status message
      if (canvasData.originalQuery) {
        const ocrInfo = canvasData.ocrData ? ` (${canvasData.ocrData.documents?.length || 0} documents processed)` : '';
        setStatus(`📋 Canvas opened from: "${canvasData.originalQuery}"${ocrInfo}`);
      }
    }
  }, [canvasData]);

  // Conditional logic: high-value shipment
  useEffect(() => {
    const totalValue = getTotalValue();
    if (totalValue > 100000) {
      if (shipmentPriority === 'Standard') {
        setShipmentPriority('Urgent');
        console.log('🚨 High-value shipment detected - upgraded to Urgent priority');
      }
      if (!insuranceRequired) {
        setInsuranceRequired(true);
        console.log('🛡️ High-value shipment detected - enabled insurance requirement');
      }
    }
  }, [productItems, shipmentPriority, insuranceRequired]);



  // Handle auto-fill from OCR document processing
  function handleAutoFill(suggestions) {
    console.log('🔄 Applying OCR auto-fill suggestions:', suggestions);
    
    // Map OCR field names to shipment-level setters
    const shipmentFieldMapping = {
      'currency': (value) => setCurrency(value),
      'consignee_name': (value) => setEndUser(value),
      'end_user_consignee_name': (value) => setEndUser(value),
      'incoterms': (value) => setIncoterms(value),
      'destination_country': (value) => setDestination(value),
      'transport_mode': (value) => setMode(value.toLowerCase()),
      'target_export_date': (value) => setExportDate(value),
      'consignee_registration': (value) => setConsigneeRegistration(value)
    };

    // Product-level fields will be handled by populateFromOCR function
    const productFields = ['commercial_value', 'quantity', 'quantity_unit', 'hs_code', 'technology_origin', 'end_use_purpose', 'product_description', 'semiconductor_category'];

    // Apply suggestions to shipment-level fields
    let appliedCount = 0;
    for (const [fieldName, suggestion] of Object.entries(suggestions)) {
      // Handle shipment-level fields
      const shipmentSetter = shipmentFieldMapping[fieldName];
      if (shipmentSetter && suggestion.value) {
        try {
          shipmentSetter(suggestion.value);
          appliedCount++;
          console.log(`✅ Applied shipment field ${fieldName}: ${suggestion.value} (from ${suggestion.source})`);
        } catch (error) {
          console.warn(`⚠️ Failed to apply ${fieldName}:`, error);
        }
      }
      // Handle product-level fields by updating first product item
      else if (productFields.includes(fieldName) && suggestion.value) {
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
              updateItem(firstItemId, mappedField, suggestion.value);
              appliedCount++;
              console.log(`✅ Applied product field ${fieldName}: ${suggestion.value} (from ${suggestion.source})`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to apply product field ${fieldName}:`, error);
        }
      }
    }

    // Show success message
    if (appliedCount > 0) {
      setStatus(`✨ Auto-filled ${appliedCount} fields from uploaded documents`);
      
      // Conditional logic based on auto-filled commercial value
      const totalValue = getTotalValue();
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

  const isFormValid = exportDate && mode && destination && endUser && incoterms &&
                     productItems.length > 0 && 
                     productItems.every(item => 
                       item.semiconductorCategory && 
                       item.technologyOrigin && 
                       item.quantity && parseFloat(item.quantity) > 0 &&
                       item.commercialValue && parseFloat(item.commercialValue) > 0 &&
                       (!item.semiconductorCategory.includes('ic') && 
                        !item.semiconductorCategory.includes('memory') && 
                        !item.semiconductorCategory.includes('ai_accelerator') || item.endUsePurpose)
                     );

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

        {/* Section 1: Basic Information */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            📅 Basic Information
          </h3>
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

        {/* Section 2: Multi-Product Details */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', margin: 0 }}>
              📦 Product Details ({productItems.length} item{productItems.length !== 1 ? 's' : ''})
            </h3>
            <button 
              type="button" 
              onClick={addNewItem}
              className="btn btn-secondary"
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.9rem',
                background: 'var(--secondary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              + Add Item
            </button>
          </div>

          {/* Product Items */}
          {productItems.map((item, index) => (
            <div 
              key={item.id} 
              className="product-item-card"
              style={{
                border: `2px solid ${item.isStrategic ? '#ff9800' : (item.isAIChip ? '#2196f3' : 'var(--border)')}`,
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                background: item.isStrategic ? 'rgba(255, 152, 0, 0.05)' : (item.isAIChip ? 'rgba(33, 150, 243, 0.05)' : 'white'),
                position: 'relative'
              }}
            >
              {/* Item Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem' }}>
                    Product {index + 1}
                  </h4>
                  {item.isStrategic && (
                    <span style={{
                      background: '#ff9800',
                      color: 'white',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      🛡️ STRATEGIC
                    </span>
                  )}
                  {item.isAIChip && (
                    <span style={{
                      background: '#2196f3',
                      color: 'white',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      🧠 AI CHIP
                    </span>
                  )}
                </div>
                {productItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    style={{
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Product Fields */}
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Semiconductor Category *</label>
                  <select 
                    className="form-select"
                    value={item.semiconductorCategory} 
                    onChange={e => updateItem(item.id, 'semiconductorCategory', e.target.value)}
                  >
                    <option value="standard_ic_asics">🔲 Standard IC/ASICs</option>
                    <option value="memory_nand_dram">💾 Memory (NAND/DRAM)</option>
                    <option value="discrete_semiconductors">⚡ Discrete Semiconductors</option>
                    <option value="pcbas_modules">🔧 PCBAs / Modules</option>
                    <option value="ai_accelerator_gpu_tpu_npu">🧠 AI Accelerator (GPU/TPU/NPU)</option>
                    <option value="military_grade">🛡️ Military Grade</option>
                    <option value="high_performance_computing">⚡ High Performance Computing</option>
                    <option value="neural_processing">🧠 Neural Processing</option>
                    <option value="unsure">❓ Unsure</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Technology Origin *</label>
                  <select 
                    className="form-select"
                    value={item.technologyOrigin} 
                    onChange={e => updateItem(item.id, 'technologyOrigin', e.target.value)}
                  >
                    <option value="malaysia">🇲🇾 Malaysia</option>
                    <option value="us_origin">🇺🇸 US Origin</option>
                    <option value="eu_origin">🇪🇺 EU Origin</option>
                    <option value="mixed">🌍 Mixed Origin</option>
                    <option value="unknown">❓ Unknown</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">HS Code (Optional)</label>
                  <input 
                    className="form-input"
                    placeholder="e.g., 85423110"
                    value={item.hsCode} 
                    onChange={e => updateItem(item.id, 'hsCode', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Commercial Value *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={item.commercialValue}
                    onChange={e => updateItem(item.id, 'commercialValue', e.target.value)}
                    placeholder="Enter value"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                    placeholder="Enter quantity"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Unit *</label>
                  <select 
                    className="form-select"
                    value={item.unit}
                    onChange={e => updateItem(item.id, 'unit', e.target.value)}
                    required
                  >
                    <option value="PCS">📦 Pieces (PCS)</option>
                    <option value="KG">⚖️ Kilograms (KG)</option>
                    <option value="TONS">🏋️ Tons</option>
                    <option value="CBM">📐 Cubic Meters (CBM)</option>
                    <option value="LITERS">🧪 Liters</option>
                  </select>
                </div>
              </div>

              {(item.semiconductorCategory.includes('ic') || item.semiconductorCategory.includes('memory') || item.semiconductorCategory.includes('ai_accelerator')) && (
                <div className="form-field">
                  <label className="form-label">End Use Purpose *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={item.endUsePurpose}
                    onChange={e => updateItem(item.id, 'endUsePurpose', e.target.value)}
                    placeholder="Enter end use purpose (e.g., Consumer Electronics, Industrial Automation, Medical Devices...)"
                    required
                  />
                  <div className="form-hint">
                    Common examples: Consumer Electronics, Industrial Automation, Automotive, Telecommunications, Medical Devices, Research & Development
                  </div>
                </div>
              )}

              <div className="form-field">
                <label className="form-label">Product Description (Optional)</label>
                <textarea 
                  className="form-input"
                  placeholder="Paste part description. The AI will suggest HS code in Step 5 for broker validation."
                  value={item.productDescription} 
                  onChange={e => updateItem(item.id, 'productDescription', e.target.value)}
                  rows="2"
                  style={{resize: 'vertical', minHeight: '60px'}}
                />
              </div>
            </div>
          ))}

          {/* Summary Section */}
          <div style={{
            background: 'rgba(90, 140, 179, 0.1)',
            border: '1px solid rgba(90, 140, 179, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '0.9rem' }}>📊 Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div><strong>Total Items:</strong> {productItems.length}</div>
              <div><strong>Total Value:</strong> {currency} {getTotalValue().toLocaleString()}</div>
              <div><strong>Total Quantity:</strong> {getTotalQuantity().toLocaleString()}</div>
              {getStrategicCount() > 0 && <div style={{color: '#ff9800'}}><strong>Strategic Items:</strong> {getStrategicCount()}</div>}
              {getAIChipCount() > 0 && <div style={{color: '#2196f3'}}><strong>AI Chips:</strong> {getAIChipCount()}</div>}
            </div>
          </div>
        </div>

        {/* Section 3: Trade Terms */}
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
              ⚠️ Please fill in all required fields for each product item
            </small>
          )}
        </div>
      </div>
    </section>
  );
}
