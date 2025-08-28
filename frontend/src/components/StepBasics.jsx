import React, { useState, useEffect } from 'react';
import { postBasics, uploadFiles, listFiles } from '../services/api.js';

export default function StepBasics({ onSaved, defaultShipmentId, canvasData, isCanvas }) {
  const [shipmentId, setShipmentId] = useState(defaultShipmentId || (crypto?.randomUUID?.() || ''));
  const [exportDate, setExportDate] = useState('');
  const [mode, setMode] = useState('air');
  const [productType, setProductType] = useState('standard_ic_asics');
  const [hsCode, setHsCode] = useState('');
  const [description, setDescription] = useState('');
  const [techOrigin, setTechOrigin] = useState('malaysia');
  const [destination, setDestination] = useState('China');
  const [endUser, setEndUser] = useState('');
  
  // New critical fields
  const [commercialValue, setCommercialValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('PCS');
  const [incoterms, setIncoterms] = useState('FOB');
  const [endUsePurpose, setEndUsePurpose] = useState('');
  const [insuranceRequired, setInsuranceRequired] = useState(true);
  const [consigneeRegistration, setConsigneeRegistration] = useState('');
  const [shipmentPriority, setShipmentPriority] = useState('Standard');
  
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [tag, setTag] = useState('datasheet');
  const [files, setFiles] = useState([]);
  const [uploaded, setUploaded] = useState([]);

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
          'Korea': 'South Korea',
          'South Korea': 'South Korea',
          'Taiwan': 'Taiwan',
          'Philippines': 'Philippines',
          'Indonesia': 'Indonesia',
          'India': 'India',
          'Australia': 'Australia',
          'Germany': 'Germany',
          'United Kingdom': 'United Kingdom',
          'UK': 'United Kingdom',
          'France': 'France'
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

  // Auto-suggest priority and insurance based on commercial value
  useEffect(() => {
    const value = parseFloat(commercialValue);
    if (value > 100000) {
      if (shipmentPriority === 'Standard') {
        setShipmentPriority('Urgent');
      }
      if (!insuranceRequired) {
        setInsuranceRequired(true);
      }
    }
  }, [commercialValue, shipmentPriority, insuranceRequired]);

  async function refreshFiles(id) {
    if (!id) return;
    try {
      const res = await listFiles(id);
      setUploaded(res.files || []);
    } catch {}
  }

  // Handle auto-fill from OCR document processing
  function handleAutoFill(suggestions) {
    console.log('🔄 Applying OCR auto-fill suggestions:', suggestions);
    
    // Map OCR field names to form state setters
    const fieldMapping = {
      'commercial_value': (value) => setCommercialValue(String(value)),
      'currency': (value) => setCurrency(value),
      'quantity': (value) => setQuantity(String(value)),
      'quantity_unit': (value) => setQuantityUnit(value),
      'hs_code': (value) => setHsCode(value),
      'consignee_name': (value) => setEndUser(value),
      'end_user_consignee_name': (value) => setEndUser(value),
      'incoterms': (value) => setIncoterms(value),
      'technology_origin': (value) => setTechOrigin(value.toLowerCase()),
      'destination_country': (value) => setDestination(value),
      'transport_mode': (value) => setMode(value.toLowerCase()),
      'target_export_date': (value) => setExportDate(value),
      'end_use_purpose': (value) => setEndUsePurpose(value),
      'consignee_registration': (value) => setConsigneeRegistration(value)
    };

    // Apply suggestions to form fields
    let appliedCount = 0;
    for (const [fieldName, suggestion] of Object.entries(suggestions)) {
      const setter = fieldMapping[fieldName];
      if (setter && suggestion.value) {
        try {
          setter(suggestion.value);
          appliedCount++;
          console.log(`✅ Applied ${fieldName}: ${suggestion.value} (from ${suggestion.source})`);
        } catch (error) {
          console.warn(`⚠️ Failed to apply ${fieldName}:`, error);
        }
      }
    }

    // Show success message
    if (appliedCount > 0) {
      setStatus(`✨ Auto-filled ${appliedCount} fields from uploaded documents`);
      
      // Auto-apply conditional logic
      const commercialVal = parseFloat(suggestions.commercial_value?.value || 0);
      if (commercialVal > 100000) {
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
      const res = await postBasics({
        shipment_id: shipmentId || undefined,
        export_date: exportDate,
        mode,
        product_type: productType,
        hs_code: hsCode || null,          // optional at Step 1
        description: description || null, // if you want to pass for LLM HS-suggestion later
        tech_origin: techOrigin,
        destination_country: destination,
        end_user_name: endUser,
        // New critical fields
        commercial_value: parseFloat(commercialValue) || null,
        currency,
        quantity: parseFloat(quantity) || null,
        quantity_unit: quantityUnit,
        incoterms,
        end_use_purpose: endUsePurpose || null,
        insurance_required: insuranceRequired,
        consignee_registration: consigneeRegistration || null,
        shipment_priority: shipmentPriority
      });
      setStatus('✅ Shipment basics saved successfully');
      const id = res?.shipment_id || shipmentId;
      if (!shipmentId) setShipmentId(id);
      await refreshFiles(id);
      onSaved?.(id, { exportDate, mode, productType, hsCode, techOrigin, destination, endUser });
    } catch (e) {
      setStatus(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function doUpload() {
    if (!shipmentId) {
      setStatus('Please save basics first (we need a shipment_id).');
      return;
    }
    if (!files || files.length === 0) {
      setStatus('Choose at least one file.');
      return;
    }
    setStatus('uploading…');
    try {
      await uploadFiles({ shipment_id: shipmentId, tag, files });
      setFiles([]);
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      await refreshFiles(shipmentId);
      setStatus('uploaded.');
    } catch (e) {
      setStatus(`upload error: ${e.message}`);
    }
  }

  const getStatusClass = () => {
    if (!status) return '';
    if (status.includes('Error')) return 'status status-error show';
    return 'status status-success show';
  };

  const isFormValid = exportDate && mode && productType && techOrigin && destination && endUser && 
                     commercialValue && parseFloat(commercialValue) > 0 && 
                     quantity && parseFloat(quantity) > 0 && 
                     incoterms && 
                     (!productType.includes('ic') && !productType.includes('memory') && !productType.includes('ai_accelerator') || endUsePurpose);

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
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '500'}}>
              🎯 Auto-filled from your request
            </div>
            <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem'}}>
              "{canvasData.originalQuery}"
            </div>
          </div>
        )}
        
        {!isCanvas && (
          <p className="text-secondary mb-3">
            Enter basic shipment information to begin the compliance workflow
          </p>
        )}

        {/* Shipment ID Display */}
        <div className="mb-3" style={{
          background: 'rgba(90, 140, 179, 0.1)',
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div className="flex-between">
            <span className="form-label">Shipment ID</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.8rem',
              color: 'var(--primary-light)'
            }}>
              {shipmentId}
            </span>
          </div>
        </div>
        
        {/* Section 1: Basic Info */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            📋 Basic Information
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
              >
                <option value="air">✈️ Air Freight</option>
                <option value="sea">🚢 Sea Freight</option>
                <option value="courier">📦 Express Courier</option>
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
                <option value="Critical">🔥 Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Product Details */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            📦 Product Details
          </h3>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Semiconductor Category *</label>
              <select 
                className="form-select"
                value={productType} 
                onChange={e=>setProductType(e.target.value)}
              >
                <option value="standard_ic_asics">🔲 Standard IC/ASICs</option>
                <option value="memory_nand_dram">💾 Memory (NAND/DRAM)</option>
                <option value="discrete_semiconductors">⚡ Discrete Semiconductors</option>
                <option value="pcbas_modules">🔧 PCBAs / Modules</option>
                <option value="ai_accelerator_gpu_tpu_npu">🧠 AI Accelerator (GPU/TPU/NPU)</option>
                <option value="unsure">❓ Unsure</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Technology Origin *</label>
              <select 
                className="form-select"
                value={techOrigin} 
                onChange={e=>setTechOrigin(e.target.value)}
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
                value={hsCode} 
                onChange={e=>setHsCode(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Quantity *</label>
              <input 
                type="number"
                className="form-input"
                placeholder="Enter quantity"
                value={quantity} 
                onChange={e=>setQuantity(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Unit *</label>
              <select 
                className="form-select"
                value={quantityUnit} 
                onChange={e=>setQuantityUnit(e.target.value)}
              >
                <option value="PCS">📦 Pieces (PCS)</option>
                <option value="KG">⚖️ Kilograms (KG)</option>
                <option value="TONS">🏗️ Tons</option>
                <option value="CBM">📐 Cubic Meters (CBM)</option>
                <option value="LITERS">🧪 Liters</option>
              </select>
            </div>

            {(productType.includes('ic') || productType.includes('memory') || productType.includes('ai_accelerator')) && (
              <div className="form-field">
                <label className="form-label">End Use Purpose *</label>
                <input
                  type="text"
                  className="form-input"
                  value={endUsePurpose}
                  onChange={e=>setEndUsePurpose(e.target.value)}
                  placeholder="Enter end use purpose (e.g., Consumer Electronics, Industrial Automation, Medical Devices...)"
                  required
                />
                <div className="form-hint">
                  Common examples: Consumer Electronics, Industrial Automation, Automotive, Telecommunications, Medical Devices, Research & Development
                </div>
              </div>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">Product Description (Optional)</label>
            <textarea 
              className="form-input"
              placeholder="Paste part description. The AI will suggest HS code in Step 5 for broker validation."
              value={description} 
              onChange={e=>setDescription(e.target.value)}
              rows="3"
              style={{resize: 'vertical', minHeight: '80px'}}
            />
            <small style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>
              Detailed description helps with accurate HS code classification
            </small>
          </div>
        </div>

        {/* Section 3: Trade Terms */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            💰 Trade Terms
          </h3>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Commercial Value *</label>
              <input 
                type="number"
                className="form-input"
                placeholder="Enter value"
                value={commercialValue} 
                onChange={e=>setCommercialValue(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
              {parseFloat(commercialValue) > 100000 && (
                <small style={{color: 'orange', fontSize: '0.8rem'}}>
                  💡 High value shipment - consider urgent priority and insurance
                </small>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Currency *</label>
              <select 
                className="form-select"
                value={currency} 
                onChange={e=>setCurrency(e.target.value)}
              >
                <option value="USD">🇺🇸 USD</option>
                <option value="MYR">🇲🇾 MYR</option>
                <option value="SGD">🇸🇬 SGD</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Incoterms *</label>
              <select 
                className="form-select"
                value={incoterms} 
                onChange={e=>setIncoterms(e.target.value)}
              >
                <option value="FOB">🚢 FOB (Free on Board)</option>
                <option value="CIF">📦 CIF (Cost, Insurance & Freight)</option>
                <option value="EXW">🏭 EXW (Ex Works)</option>
                <option value="DDP">🚚 DDP (Delivered Duty Paid)</option>
                <option value="CPT">🚛 CPT (Carriage Paid To)</option>
                <option value="CIP">📋 CIP (Carriage & Insurance Paid)</option>
                <option value="FCA">📍 FCA (Free Carrier)</option>
                <option value="DAP">🏠 DAP (Delivered at Place)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Insurance Required</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="radio"
                    name="insurance"
                    checked={insuranceRequired === true}
                    onChange={() => setInsuranceRequired(true)}
                  />
                  ✅ Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="radio"
                    name="insurance"
                    checked={insuranceRequired === false}
                    onChange={() => setInsuranceRequired(false)}
                  />
                  ❌ No
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Parties & Destination */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            🌍 Parties & Destination
          </h3>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Destination Country *</label>
              <input 
                className="form-input"
                value={destination} 
                onChange={e=>setDestination(e.target.value)}
                placeholder="Enter destination country"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">End-User / Consignee Name *</label>
              <input 
                className="form-input"
                value={endUser} 
                onChange={e=>setEndUser(e.target.value)}
                placeholder="Company or individual name"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">Consignee Registration (Optional)</label>
              <input 
                className="form-input"
                value={consigneeRegistration} 
                onChange={e=>setConsigneeRegistration(e.target.value)}
                placeholder="Registration number or ID"
              />
            </div>
          </div>
        </div>

                {/* File Upload Section - Only show when NOT in canvas mode */}
        {!isCanvas && (
          <div style={{
            marginTop: '2rem',
            borderTop: '2px dashed var(--border)',
            paddingTop: '1.5rem'
          }}>
            <div className="flex gap-2 mb-3">
              <div className="card-icon" style={{fontSize: '1rem'}}>📎</div>
              <h3 style={{color: 'var(--primary-light)', margin: 0, fontSize: '1.2rem'}}>
                Upload Supporting Documents (Optional)
              </h3>
            </div>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem'}}>
              Add early documents so the AI can suggest HS codes and auto-fill fields later.
            </p>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Document Type</label>
                <select
                  className="form-select"
                  value={tag}
                  onChange={e=>setTag(e.target.value)}
                >
                  <option value="datasheet">📄 Datasheet</option>
                  <option value="po">📋 Purchase Order</option>
                  <option value="proforma">💰 Proforma Invoice</option>
                  <option value="previous_docs">📁 Previous Shipment Docs</option>
                  <option value="other">📎 Other</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Select Files</label>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  className="form-input"
                  onChange={e=>setFiles([...e.target.files])}
                  style={{
                    padding: '0.5rem',
                    border: '2px dashed var(--border)',
                    borderRadius: '8px',
                    background: 'var(--surface-light)'
                  }}
                />
              </div>

              <div className="form-field" style={{display: 'flex', alignItems: 'end'}}>
                <button
                  className="btn btn-secondary"
                  onClick={doUpload}
                  disabled={!shipmentId || !files.length}
                  style={{width: '100%'}}
                >
                  📤 Upload Files
                </button>
              </div>
            </div>

            {uploaded?.length > 0 && (
              <div style={{
                marginTop: '1.5rem',
                background: 'rgba(90, 140, 179, 0.05)',
                border: '1px solid rgba(90, 140, 179, 0.2)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <h4 style={{color: 'var(--primary-light)', marginBottom: '1rem', fontSize: '1rem'}}>
                  📁 Uploaded Files ({uploaded.length})
                </h4>
                <div style={{display: 'grid', gap: '0.75rem'}}>
                  {uploaded.map(f => (
                    <div key={f.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: 'var(--surface-light)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}>
                      <div style={{flex: 1}}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.25rem'
                        }}>
                          <span style={{
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            textTransform: 'uppercase'
                          }}>
                            {f.tag}
                          </span>
                          <strong style={{color: 'var(--text-primary)', fontSize: '0.9rem'}}>
                            {f.original_name}
                          </strong>
                        </div>
                        <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>
                          {f.mime_type} • {Math.round(f.size_bytes / 1024)} KB
                        </div>
                      </div>
                      <a
                        href={`${import.meta.env.VITE_API || 'http://localhost:8080'}/files/${f.file_path.split('/').pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.8rem',
                          textDecoration: 'none'
                        }}
                      >
                        🔗 Open
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-between mt-4">
          <button 
            className="btn btn-primary" 
            onClick={save}
            disabled={loading || !isFormValid}
            style={{flex: 1}}
          >
            {loading && <div className="loading"></div>}
            {loading ? 'Saving...' : '💾 Save & Continue to Compliance Steps'}
          </button>
        </div>

        {status && (
          <div className={getStatusClass()}>
            {status}
          </div>
        )}
        
        <div className="mt-3" style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
          <p>📋 Required fields: Export Date, Mode, Product Type, Tech Origin, Destination, End User, Commercial Value, Quantity, Incoterms</p>
          <p>⚡ End Use Purpose required for semiconductor categories</p>
          <p>💡 Values over $100K auto-suggest urgent priority and insurance</p>
        </div>
      </div>
    </section>
  );
}
