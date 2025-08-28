import React, { useState } from 'react';
import { postJSON } from '../services/api.js';

export default function StepSTA({ shipmentId, productType, techOrigin }){
  const [hs, setHs] = useState('85423110');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(){
    setLoading(true);
    setStatus('');
    try{
      const res = await postJSON('/api/compliance/sta-screening', {
        shipment_id: shipmentId,
        hs_code: hs,
        product_type: productType,
        tech_origin: techOrigin
      });
      const isStrategic = res?.record?.is_strategic;
      setStatus(`Analysis Complete: ${isStrategic ? '⚠️ Strategic Item Detected' : '✅ Non-Strategic Item'}`);
    }catch(e){
      setStatus('❌ Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusClass = () => {
    if (!status) return '';
    if (status.includes('Error')) return 'status status-error show';
    if (status.includes('Strategic Item Detected')) return 'status status-warning show';
    if (status.includes('Non-Strategic')) return 'status status-success show';
    return 'status status-info show';
  };

  return (
    <section className="card fade-in">
      <div className="card-header">
        <div className="step-indicator">
          <div className="step-number">1</div>
          <div className="step-title">Export Controls Screening</div>
        </div>
      </div>
      
      <div className="card-content">
        <p className="text-secondary mb-3">
          Verify compliance with Strategic Trade Act 2010 regulations
        </p>
        
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">HS Classification Code</label>
            <input 
              className="form-input"
              type="text"
              value={hs} 
              onChange={e=>setHs(e.target.value)}
              placeholder="Enter 8-digit HS code"
              pattern="[0-9]{8}"
            />
            <small style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>
              Current: {productType} from {techOrigin}
            </small>
          </div>
          
          <div className="form-field" style={{display: 'flex', alignItems: 'end'}}>
            <button 
              className="btn btn-primary" 
              onClick={submit}
              disabled={loading || !hs}
              style={{width: '100%'}}
            >
              {loading && <div className="loading"></div>}
              {loading ? 'Analyzing...' : '🔍 Screen & Validate'}
            </button>
          </div>
        </div>

        {status && (
          <div className={getStatusClass()}>
            {status}
          </div>
        )}
      </div>
    </section>
  );
}
