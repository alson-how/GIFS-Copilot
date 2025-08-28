import React, { useState } from 'react';
import { postJSON } from '../services/api.js';

export default function StepAI({ shipmentId, onSaved, isCanvas }){
  const [aica, setAica] = useState(false);
  const [notice, setNotice] = useState(false);
  const [needRelic, setNeedRelic] = useState('unknown');
  const [relicNo, setRelicNo] = useState('');
  const [sta, setSta] = useState(false);
  const [staNo, setStaNo] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(){
    setLoading(true);
    setStatus('');
    try{
      const res = await postJSON('/api/compliance/ai-chip', {
        shipment_id: shipmentId,
        aica_done: aica,
        export_notice_30d: notice,
        reexport_license_needed: needRelic,
        reexport_license_number: (needRelic==='yes'? (relicNo||null) : null),
        sta_permit_ai: sta,
        sta_permit_ai_number: (sta ? (staNo||null) : null)
      });
      setStatus('✅ AI Chip Directive compliance status saved successfully');
      
      // Call onSaved callback if provided (for canvas mode)
      if (onSaved) {
        setTimeout(() => onSaved(), 1500); // Brief delay to show success message
      }
    }catch(e){
      setStatus('❌ Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusClass = () => {
    if (!status) return '';
    if (status.includes('Error')) return 'status status-error show';
    return 'status status-success show';
  };

  return (
    <section className={`card ${isCanvas ? '' : 'fade-in'}`} style={isCanvas ? {
      border: 'none',
      boxShadow: 'none',
      background: 'transparent'
    } : {background: 'linear-gradient(135deg, var(--surface), rgba(90, 140, 179, 0.05))'}}>
      {!isCanvas && (
        <div className="card-header">
          <div className="step-indicator">
            <div className="step-number">2</div>
            <div className="step-title">AI Chip Directive Compliance</div>
          </div>
          <div className="card-icon">🧠</div>
        </div>
      )}
      
      <div className="card-content">
        <p className="text-secondary mb-3">
          Advanced AI chip export controls and licensing requirements
        </p>
        
        <div className="two-column mb-3">
          <div className="checkbox-field">
            <input 
              type="checkbox" 
              className="checkbox"
              checked={aica} 
              onChange={e=>setAica(e.target.checked)}
              id="aica-check"
            />
            <label htmlFor="aica-check">AICA Assessment Completed</label>
          </div>
          
          <div className="checkbox-field">
            <input 
              type="checkbox" 
              className="checkbox"
              checked={notice} 
              onChange={e=>setNotice(e.target.checked)}
              id="notice-check"
            />
            <label htmlFor="notice-check">30-Day Export Notice Submitted</label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Re-export License Status</label>
            <select 
              className="form-select"
              value={needRelic} 
              onChange={e=>setNeedRelic(e.target.value)}
            >
              <option value="unknown">❓ Status Unknown</option>
              <option value="no">✅ Not Required</option>
              <option value="yes">📋 License Required</option>
            </select>
          </div>

          {needRelic==='yes' && (
            <div className="form-field">
              <label className="form-label">Re-export License Number</label>
              <input 
                className="form-input"
                value={relicNo} 
                onChange={e=>setRelicNo(e.target.value)}
                placeholder="Enter license number"
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="checkbox-field">
            <input 
              type="checkbox" 
              className="checkbox"
              checked={sta} 
              onChange={e=>setSta(e.target.checked)}
              id="sta-check"
            />
            <label htmlFor="sta-check">STA Permit Obtained for AI Components</label>
          </div>

          {sta && (
            <div className="form-field">
              <label className="form-label">STA Permit Number</label>
              <input 
                className="form-input"
                value={staNo} 
                onChange={e=>setStaNo(e.target.value)}
                placeholder="Enter STA permit number"
              />
            </div>
          )}
        </div>

        <div className="flex-between mt-4">
          <button 
            className="btn btn-primary" 
            onClick={submit}
            disabled={loading}
          >
            {loading && <div className="loading"></div>}
            {loading ? 'Saving...' : '💾 Save AI Compliance Status'}
          </button>
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
