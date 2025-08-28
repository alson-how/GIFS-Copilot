import React, { useState } from 'react';
import { postJSON } from '../services/api.js';

export default function StepDocs({ shipmentId, onSaved, isCanvas }){
  const [hsCode, setHsCode] = useState('85423110');
  const [hsValidated, setHsValidated] = useState(false);
  const [pco, setPco] = useState('');
  const [k2, setK2] = useState(false);
  const [permits, setPermits] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(){
    setLoading(true);
    setStatus('');
    try{
      const res = await postJSON('/api/compliance/docs', {
        shipment_id: shipmentId,
        hs_code: hsCode,
        hs_validated: hsValidated,
        pco_number: pco || null,
        k2_ready: k2,
        permit_refs: permits ? permits.split(',').map(s=>s.trim()) : []
      });
      setStatus('✅ Documentation and classification status saved successfully');
      
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

  const getCompletionStatus = () => {
    const checklist = [
      { label: 'HS Code Entered', completed: hsCode.length >= 8 },
      { label: 'HS Code Validated', completed: hsValidated },
      { label: 'K2 Form Ready', completed: k2 },
      { label: 'Permits Referenced', completed: permits.length > 0 }
    ];
    
    const completedCount = checklist.filter(item => item.completed).length;
    return { checklist, completedCount, total: checklist.length };
  };

  const completion = getCompletionStatus();

  return (
    <section className="card fade-in">
      <div className="card-header">
        <div className="step-indicator">
          <div className="step-number">4</div>
          <div className="step-title">Documentation & Classification</div>
        </div>
        <div className="card-icon">📋</div>
      </div>
      
      <div className="card-content">
        <p className="text-secondary mb-3">
          Finalize customs documentation and export classification
        </p>

        <div className="mb-4" style={{
          background: 'rgba(90, 140, 179, 0.1)', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div className="flex-between mb-2">
            <span className="form-label">Completion Status</span>
            <span style={{color: 'var(--primary)'}}>{completion.completedCount}/{completion.total}</span>
          </div>
          <div className="checklist">
            {completion.checklist.map((item, index) => (
              <div key={index} className="flex gap-2" style={{marginBottom: '0.5rem'}}>
                <span style={{color: item.completed ? 'var(--success)' : 'var(--text-muted)'}}>
                  {item.completed ? '✅' : '⏳'}
                </span>
                <span style={{color: item.completed ? 'var(--text-primary)' : 'var(--text-muted)'}}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">HS Classification Code</label>
            <input 
              className="form-input"
              value={hsCode} 
              onChange={e=>setHsCode(e.target.value)}
              placeholder="Enter 8-digit HS code"
              pattern="[0-9]{8}"
            />
          </div>
          
          <div className="checkbox-field">
            <input 
              type="checkbox" 
              className="checkbox"
              checked={hsValidated} 
              onChange={e=>setHsValidated(e.target.checked)}
              id="hs-validated"
            />
            <label htmlFor="hs-validated">HS Code Validated by Expert</label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">PCO Number (Optional)</label>
            <input 
              className="form-input"
              value={pco} 
              onChange={e=>setPco(e.target.value)}
              placeholder="Pre-shipment Control Order number"
            />
          </div>
          
          <div className="checkbox-field">
            <input 
              type="checkbox" 
              className="checkbox"
              checked={k2} 
              onChange={e=>setK2(e.target.checked)}
              id="k2-ready"
            />
            <label htmlFor="k2-ready">K2 Customs Form Prepared</label>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Export Permit References</label>
          <input 
            className="form-input"
            value={permits} 
            onChange={e=>setPermits(e.target.value)}
            placeholder="Enter permit numbers (comma-separated): STA-XXXX, US-BIS-YYYY"
          />
          <small style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>
            Include all relevant permit and license numbers
          </small>
        </div>

        <div className="flex-between mt-4">
          <button 
            className="btn btn-primary" 
            onClick={submit}
            disabled={loading}
            style={{flex: 1}}
          >
            {loading && <div className="loading"></div>}
            {loading ? 'Saving...' : '📄 Finalize Documentation'}
          </button>
        </div>

        {status && (
          <div className={getStatusClass()}>
            {status}
          </div>
        )}
        
        <div className="mt-3" style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
          <p>📋 Required forms: K2 (Export Declaration), PCO (if applicable), Export Permits</p>
        </div>
      </div>
    </section>
  );
}
