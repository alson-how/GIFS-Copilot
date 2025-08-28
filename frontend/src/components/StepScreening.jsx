import React, { useState } from 'react';
import { postJSON } from '../services/api.js';

export default function StepScreening({ shipmentId, onSaved, isCanvas }){
  const [country, setCountry] = useState('China');
  const [name, setName] = useState('ABC Tech Solutions');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(){
    setLoading(true);
    setStatus('');
    try{
      const res = await postJSON('/api/compliance/screening', {
        shipment_id: shipmentId,
        destination_country: country,
        end_user_name: name
      });
      const result = res?.record?.screen_result;
      const evidence = res?.record?.evidence;
      
      if (result === 'CLEAR') {
        setStatus(`✅ Screening Passed: ${name} cleared for ${country}. Evidence: ${evidence}`);
      } else if (result === 'FLAGGED') {
        setStatus(`⚠️ Security Alert: Potential risk detected. Evidence: ${evidence}`);
      } else {
        setStatus(`📋 Screening Result: ${result}. Evidence: ${evidence}`);
      }
      
      // Call onSaved callback if provided (for canvas mode)
      if (onSaved) {
        setTimeout(() => onSaved(), 2000); // Brief delay to show result message
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
    if (status.includes('Security Alert')) return 'status status-warning show';
    if (status.includes('Screening Passed')) return 'status status-success show';
    return 'status status-info show';
  };

  return (
    <section className="card fade-in">
      <div className="card-header">
        <div className="step-indicator">
          <div className="step-number">3</div>
          <div className="step-title">End-User Security Screening</div>
        </div>
        <div className="card-icon">🔍</div>
      </div>
      
      <div className="card-content">
        <p className="text-secondary mb-3">
          Verify destination and end-user against restricted entity lists
        </p>
        
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Destination Country</label>
            <input 
              className="form-input"
              value={country} 
              onChange={e=>setCountry(e.target.value)}
              placeholder="Enter destination country"
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">End-User Company Name</label>
            <input 
              className="form-input"
              value={name} 
              onChange={e=>setName(e.target.value)}
              placeholder="Enter end-user company name"
            />
          </div>
          
          <div className="form-field" style={{display: 'flex', alignItems: 'end'}}>
            <button 
              className="btn btn-primary" 
              onClick={submit}
              disabled={loading || !country || !name}
              style={{width: '100%'}}
            >
              {loading && <div className="loading"></div>}
              {loading ? 'Screening...' : '🛡️ Run Security Check'}
            </button>
          </div>
        </div>

        {status && (
          <div className={getStatusClass()}>
            {status}
          </div>
        )}
        
        <div className="mt-3" style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
          <p>🔒 Screening against: Entity List, Denied Persons List, SDN List</p>
        </div>
      </div>
    </section>
  );
}
