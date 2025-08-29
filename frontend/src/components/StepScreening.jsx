import React, { useState, useEffect } from 'react';
import ComprehensiveScreening from './ComprehensiveScreening.jsx';

// Enhanced Step 2 - Comprehensive End-User Security Screening
export default function StepScreening({ shipmentId, onSaved }) {
  const [screeningData, setScreeningData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (shipmentId) {
      loadExistingScreening();
    }
  }, [shipmentId]);

  const loadExistingScreening = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/comprehensive-screening/${shipmentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setScreeningData(data.screening);
        }
      }
    } catch (error) {
      console.log('No existing screening found, will initialize new one');
    } finally {
      setLoading(false);
    }
  };

  const handleScreeningComplete = () => {
    setStatus('✅ Comprehensive screening completed successfully!');
    if (onSaved) {
      onSaved();
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        color: 'var(--primary)'
      }}>
        <div>⏳ Loading screening data...</div>
      </div>
    );
  }

  return (
    <div>
      {status && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          borderRadius: '8px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          {status}
        </div>
      )}
      
      <ComprehensiveScreening 
        shipmentId={shipmentId}
        onSaved={handleScreeningComplete}
      />
    </div>
  );
}