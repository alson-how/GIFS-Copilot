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
      
      // Show canvas-specific status message
      if (canvasData.originalQuery) {
        setStatus(`📋 Canvas opened from: "${canvasData.originalQuery}"`);
      }
    }
  }, [canvasData]);

  async function refreshFiles(id) {
    if (!id) return;
    try {
      const res = await listFiles(id);
      setUploaded(res.files || []);
    } catch {}
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
        end_user_name: endUser
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

  const isFormValid = exportDate && mode && productType && techOrigin && destination && endUser;

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
        
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Target Export Date</label>
            <input 
              type="date" 
              className="form-input"
              value={exportDate} 
              onChange={e=>setExportDate(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Transport Mode</label>
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
            <label className="form-label">Semiconductor Category</label>
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
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">HS Code (Optional)</label>
            <input 
              className="form-input"
              placeholder="e.g., 85423110"
              value={hsCode} 
              onChange={e=>setHsCode(e.target.value)}
            />
            <small style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>
              Leave blank if unknown - AI will suggest in Step 5
            </small>
          </div>

          <div className="form-field">
            <label className="form-label">Technology Origin</label>
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
            <label className="form-label">Destination Country</label>
            <input 
              className="form-input"
              value={destination} 
              onChange={e=>setDestination(e.target.value)}
              placeholder="Enter destination country"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">End-User / Consignee Name</label>
            <input 
              className="form-input"
              value={endUser} 
              onChange={e=>setEndUser(e.target.value)}
              placeholder="Company or individual name"
              required
            />
          </div>
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
          <p>📋 Required fields: Export Date, Mode, Product Type, Tech Origin, Destination, End User</p>
        </div>
      </div>
    </section>
  );
}
