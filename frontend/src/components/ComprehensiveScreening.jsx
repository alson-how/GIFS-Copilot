import React, { useState, useEffect } from 'react';

// Main comprehensive screening component with 6 sections
export default function ComprehensiveScreening({ shipmentId, onSaved }) {
  const [activeSection, setActiveSection] = useState(1);
  const [screeningData, setScreeningData] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [overallRisk, setOverallRisk] = useState(0);
  const [screeningResults, setScreeningResults] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (shipmentId) {
      initializeScreening();
    }
  }, [shipmentId]);

  const initializeScreening = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/comprehensive-screening/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipment_id: shipmentId })
      });
      const data = await response.json();
      
      if (data.success) {
        setScreeningData(data.initialData);
        setStatus('✅ Initialized from shipment data');
      }
    } catch (error) {
      setStatus('❌ Failed to initialize screening');
    } finally {
      setLoading(false);
    }
  };

  const updateScreeningData = (field, value) => {
    setScreeningData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calculate overall risk when risk scores change
    if (field.includes('_risk_score')) {
      const geographic = screeningData.geographic_risk_score || 5;
      const product = screeningData.product_risk_score || 5;
      const endUser = screeningData.end_user_risk_score || 5;
      const transaction = screeningData.transaction_risk_score || 5;
      
      const newOverallRisk = (geographic + product + endUser + transaction) / 4;
      setOverallRisk(newOverallRisk);
    }
  };

  const saveScreeningData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/comprehensive-screening/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(screeningData)
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus('✅ Screening data saved successfully');
        setOverallRisk(data.overall_risk_score);
        if (data.enhanced_dd_required) {
          setStatus(prev => prev + ' - Enhanced Due Diligence Required');
        }
      } else {
        setStatus('❌ ' + data.error);
      }
    } catch (error) {
      setStatus('❌ Failed to save screening data');
    } finally {
      setLoading(false);
    }
  };

  const performListScreening = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/comprehensive-screening/screen-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screening_id: screeningData.screening_id,
          company_name: screeningData.company_name,
          country: screeningData.country
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setScreeningResults(data.results);
        setStatus(data.has_matches ? '⚠️ Matches found in screening lists' : '✅ No matches found');
      }
    } catch (error) {
      setStatus('❌ Failed to perform list screening');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 7) return '#dc2626'; // Red - High risk
    if (score >= 5) return '#f59e0b'; // Amber - Medium risk  
    return '#16a34a'; // Green - Low risk
  };

  const getRiskLabel = (score) => {
    if (score >= 7) return 'HIGH RISK';
    if (score >= 5) return 'MEDIUM RISK';
    return 'LOW RISK';
  };

  const sections = [
    { id: 1, title: 'End-User Details', icon: '🏢' },
    { id: 2, title: 'Transaction Context', icon: '💼' },
    { id: 3, title: 'Comprehensive Screening', icon: '🔍' },
    { id: 4, title: 'Risk Assessment', icon: '⚖️' },
    { id: 5, title: 'Documentation', icon: '📄' },
    { id: 6, title: 'Compliance Workflow', icon: '✅' }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: 'var(--primary)', marginBottom: '30px' }}>
        🛡️ Comprehensive End-User Security Screening
      </h2>

      {/* Progress Navigation */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '30px', 
        borderBottom: '2px solid var(--border)',
        overflowX: 'auto'
      }}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeSection === section.id ? 'var(--primary)' : 'transparent',
              color: activeSection === section.id ? 'white' : 'var(--text)',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              fontWeight: activeSection === section.id ? 'bold' : 'normal'
            }}
          >
            {section.icon} {section.title}
          </button>
        ))}
      </div>

      {/* Overall Risk Score Display */}
      {overallRisk > 0 && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${getRiskColor(overallRisk)}20, ${getRiskColor(overallRisk)}10)`,
          border: `2px solid ${getRiskColor(overallRisk)}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: getRiskColor(overallRisk) 
            }}>
              Overall Risk Score: {overallRisk.toFixed(1)}/10
            </div>
            <div style={{ 
              padding: '4px 12px', 
              borderRadius: '20px', 
              background: getRiskColor(overallRisk), 
              color: 'white', 
              fontSize: '12px', 
              fontWeight: 'bold' 
            }}>
              {getRiskLabel(overallRisk)}
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px', 
          borderRadius: '6px', 
          background: status.includes('❌') ? '#fee2e2' : '#f0fdf4',
          border: `1px solid ${status.includes('❌') ? '#fecaca' : '#bbf7d0'}`,
          color: status.includes('❌') ? '#dc2626' : '#166534'
        }}>
          {status}
        </div>
      )}

      {/* Section Content */}
      <div style={{ 
        background: 'white', 
        border: '1px solid var(--border)', 
        borderRadius: '8px', 
        padding: '30px' 
      }}>
        {activeSection === 1 && (
          <EndUserDetailsSection 
            data={screeningData} 
            onChange={updateScreeningData}
          />
        )}
        {activeSection === 2 && (
          <TransactionContextSection 
            data={screeningData} 
            onChange={updateScreeningData}
          />
        )}
        {activeSection === 3 && (
          <ComprehensiveScreeningSection 
            data={screeningData}
            results={screeningResults}
            onPerformScreening={performListScreening}
            loading={loading}
          />
        )}
        {activeSection === 4 && (
          <RiskAssessmentSection 
            data={screeningData} 
            onChange={updateScreeningData}
            overallRisk={overallRisk}
          />
        )}
        {activeSection === 5 && (
          <DocumentationSection 
            screeningId={screeningData.screening_id}
            documents={documents}
            setDocuments={setDocuments}
          />
        )}
        {activeSection === 6 && (
          <ComplianceWorkflowSection 
            data={screeningData}
            onChange={updateScreeningData}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ 
        marginTop: '30px', 
        display: 'flex', 
        gap: '15px', 
        justifyContent: 'space-between' 
      }}>
        <div>
          {activeSection > 1 && (
            <button
              onClick={() => setActiveSection(activeSection - 1)}
              style={{
                padding: '12px 24px',
                border: '2px solid var(--border)',
                background: 'white',
                color: 'var(--text)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ← Previous Section
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={saveScreeningData}
            disabled={loading}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'var(--primary)',
              color: 'white',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⏳ Saving...' : '💾 Save Progress'}
          </button>
          
          {activeSection < 6 && (
            <button
              onClick={() => setActiveSection(activeSection + 1)}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'var(--secondary)',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Next Section →
            </button>
          )}
          
          {activeSection === 6 && (
            <button
              onClick={() => onSaved && onSaved()}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: '#16a34a',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✅ Complete Screening
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Section 1: End-User Details
function EndUserDetailsSection({ data, onChange }) {
  return (
    <div>
      <h3 style={{ color: 'var(--primary)', marginBottom: '20px' }}>
        🏢 End-User Details
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Registration Number *
          </label>
          <input
            type="text"
            value={data.end_user_registration_number || ''}
            onChange={(e) => onChange('end_user_registration_number', e.target.value)}
            placeholder="Company registration number"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Business Type *
          </label>
          <select
            value={data.business_type || ''}
            onChange={(e) => onChange('business_type', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          >
            <option value="">Select business type</option>
            <option value="corporation">Corporation</option>
            <option value="government">Government</option>
            <option value="academic">Academic Institution</option>
            <option value="individual">Individual</option>
            <option value="ngo">Non-Governmental Organization</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Company Name *
          </label>
          <input
            type="text"
            value={data.company_name || ''}
            onChange={(e) => onChange('company_name', e.target.value)}
            placeholder="Official company name"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Local Company Name
          </label>
          <input
            type="text"
            value={data.company_name_local || ''}
            onChange={(e) => onChange('company_name_local', e.target.value)}
            placeholder="Company name in local language"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>

      <h4 style={{ color: 'var(--primary)', margin: '30px 0 15px 0' }}>
        📍 Address Information
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Street Address 1 *
          </label>
          <input
            type="text"
            value={data.street_address_1 || ''}
            onChange={(e) => onChange('street_address_1', e.target.value)}
            placeholder="Primary street address"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Street Address 2
          </label>
          <input
            type="text"
            value={data.street_address_2 || ''}
            onChange={(e) => onChange('street_address_2', e.target.value)}
            placeholder="Apartment, suite, unit, building, floor, etc."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            City *
          </label>
          <input
            type="text"
            value={data.city || ''}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="City"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            State/Province
          </label>
          <input
            type="text"
            value={data.state_province || ''}
            onChange={(e) => onChange('state_province', e.target.value)}
            placeholder="State or Province"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Postal Code *
          </label>
          <input
            type="text"
            value={data.postal_code || ''}
            onChange={(e) => onChange('postal_code', e.target.value)}
            placeholder="Postal/ZIP code"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Country *
          </label>
          <input
            type="text"
            value={data.country || ''}
            onChange={(e) => onChange('country', e.target.value)}
            placeholder="Country"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
      </div>

      <h4 style={{ color: 'var(--primary)', margin: '30px 0 15px 0' }}>
        📞 Contact Information
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Primary Contact Name *
          </label>
          <input
            type="text"
            value={data.primary_contact_name || ''}
            onChange={(e) => onChange('primary_contact_name', e.target.value)}
            placeholder="Full name"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Primary Contact Title
          </label>
          <input
            type="text"
            value={data.primary_contact_title || ''}
            onChange={(e) => onChange('primary_contact_title', e.target.value)}
            placeholder="Job title"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Primary Email *
          </label>
          <input
            type="email"
            value={data.primary_contact_email || ''}
            onChange={(e) => onChange('primary_contact_email', e.target.value)}
            placeholder="email@company.com"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Primary Phone *
          </label>
          <input
            type="tel"
            value={data.primary_contact_phone || ''}
            onChange={(e) => onChange('primary_contact_phone', e.target.value)}
            placeholder="+1-555-123-4567"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Secondary Contact Name
          </label>
          <input
            type="text"
            value={data.secondary_contact_name || ''}
            onChange={(e) => onChange('secondary_contact_name', e.target.value)}
            placeholder="Backup contact"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Secondary Email
          </label>
          <input
            type="email"
            value={data.secondary_contact_email || ''}
            onChange={(e) => onChange('secondary_contact_email', e.target.value)}
            placeholder="backup@company.com"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Company Website
          </label>
          <input
            type="url"
            value={data.website_url || ''}
            onChange={(e) => onChange('website_url', e.target.value)}
            placeholder="https://www.company.com"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Section 2: Transaction Context
function TransactionContextSection({ data, onChange }) {
  const productCategories = [
    'semiconductors', 'electronics', 'software', 'telecommunications',
    'encryption', 'military', 'dual_use', 'chemicals', 'materials', 'other'
  ];

  return (
    <div>
      <h3 style={{ color: 'var(--primary)', marginBottom: '20px' }}>
        💼 Transaction Context
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Shipment Value (USD) *
          </label>
          <input
            type="number"
            step="0.01"
            value={data.shipment_value || ''}
            onChange={(e) => onChange('shipment_value', parseFloat(e.target.value))}
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Transaction Frequency
          </label>
          <select
            value={data.transaction_frequency || 'one-time'}
            onChange={(e) => onChange('transaction_frequency', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          >
            <option value="one-time">One-time Transaction</option>
            <option value="recurring">Recurring Transaction</option>
            <option value="ongoing">Ongoing Relationship</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Customer Relationship
          </label>
          <select
            value={data.customer_relationship || 'new'}
            onChange={(e) => onChange('customer_relationship', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          >
            <option value="new">New Customer</option>
            <option value="existing">Existing Customer</option>
            <option value="long-term">Long-term Partner</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Previous Transaction Count
          </label>
          <input
            type="number"
            value={data.previous_transaction_count || 0}
            onChange={(e) => onChange('previous_transaction_count', parseInt(e.target.value))}
            placeholder="0"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Product Categories *
        </label>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '10px',
          padding: '15px',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          background: '#f9fafb'
        }}>
          {productCategories.map(category => (
            <label key={category} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={(data.product_categories || []).includes(category)}
                onChange={(e) => {
                  const categories = data.product_categories || [];
                  if (e.target.checked) {
                    onChange('product_categories', [...categories, category]);
                  } else {
                    onChange('product_categories', categories.filter(c => c !== category));
                  }
                }}
              />
              <span style={{ textTransform: 'capitalize' }}>
                {category.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          End-Use Declaration * (minimum 20 characters)
        </label>
        <textarea
          value={data.end_use_declaration || ''}
          onChange={(e) => onChange('end_use_declaration', e.target.value)}
          placeholder="Detailed description of how the products will be used..."
          rows={4}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            resize: 'vertical'
          }}
          required
          minLength={20}
        />
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--text-muted)', 
          marginTop: '5px' 
        }}>
          Characters: {(data.end_use_declaration || '').length}/20 minimum
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            End-Use Location *
          </label>
          <input
            type="text"
            value={data.end_use_location || ''}
            onChange={(e) => onChange('end_use_location', e.target.value)}
            placeholder="Where products will be used"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Intended Recipients
          </label>
          <input
            type="text"
            value={data.intended_recipients || ''}
            onChange={(e) => onChange('intended_recipients', e.target.value)}
            placeholder="Who will receive/use the products"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Section 3: Comprehensive Screening
function ComprehensiveScreeningSection({ data, results, onPerformScreening, loading }) {
  const screeningLists = [
    { name: 'entity_list', title: 'Entity List', description: 'US Commerce Department Entity List' },
    { name: 'sdn_list', title: 'SDN List', description: 'Specially Designated Nationals' },
    { name: 'unverified_list', title: 'Unverified List', description: 'Unverified End-Users' },
    { name: 'military_end_user', title: 'Military End User', description: 'Military End-User List' },
    { name: 'eu_consolidated', title: 'EU Consolidated', description: 'EU Consolidated Sanctions' },
    { name: 'un_sanctions', title: 'UN Sanctions', description: 'UN Security Council Sanctions' },
    { name: 'bis_denied_persons', title: 'Denied Persons', description: 'BIS Denied Persons List' }
  ];

  return (
    <div>
      <h3 style={{ color: 'var(--primary)', marginBottom: '20px' }}>
        🔍 Comprehensive Screening Against Watchlists
      </h3>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: '#f0f9ff', 
        border: '1px solid #0ea5e9', 
        borderRadius: '6px' 
      }}>
        <p style={{ margin: 0, color: '#0c4a6e' }}>
          <strong>Screening Target:</strong> {data.company_name || 'Not specified'} ({data.country || 'Unknown country'})
        </p>
      </div>

      <button
        onClick={onPerformScreening}
        disabled={loading || !data.company_name}
        style={{
          padding: '12px 24px',
          border: 'none',
          background: loading ? '#6b7280' : 'var(--primary)',
          color: 'white',
          borderRadius: '6px',
          cursor: loading || !data.company_name ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {loading ? '🔄 Screening in Progress...' : '🔍 Perform Comprehensive Screening'}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
        {screeningLists.map(list => {
          const result = results.find(r => r.list_name === list.name);
          
          return (
            <div
              key={list.name}
              style={{
                padding: '15px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: result ? (result.match_found ? '#fef2f2' : '#f0fdf4') : 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)' }}>
                    {list.title}
                  </h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                    {list.description}
                  </p>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  {!result && (
                    <span style={{ 
                      padding: '4px 8px', 
                      background: '#f3f4f6', 
                      color: '#6b7280', 
                      borderRadius: '4px', 
                      fontSize: '12px' 
                    }}>
                      Pending
                    </span>
                  )}
                  
                  {result && (
                    <div>
                      <span style={{
                        padding: '4px 8px',
                        background: result.match_found ? '#dc2626' : '#16a34a',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {result.match_found ? '⚠️ MATCH FOUND' : '✅ NO MATCH'}
                      </span>
                      
                      {result.match_found && (
                        <div style={{ marginTop: '8px', fontSize: '12px' }}>
                          <div><strong>Entity:</strong> {result.matched_entity_name}</div>
                          <div><strong>Confidence:</strong> {(result.match_confidence * 100).toFixed(1)}%</div>
                          <div><strong>Reason:</strong> {result.match_reason}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {results.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: results.some(r => r.match_found) ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${results.some(r => r.match_found) ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '6px' 
        }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            color: results.some(r => r.match_found) ? '#dc2626' : '#166534' 
          }}>
            Screening Summary
          </h4>
          <p style={{ margin: 0 }}>
            {results.some(r => r.match_found) 
              ? '⚠️ One or more matches found. Enhanced due diligence required.' 
              : '✅ No matches found across all screening lists.'}
          </p>
        </div>
      )}
    </div>
  );
}

// Section 4: Risk Assessment
function RiskAssessmentSection({ data, onChange, overallRisk }) {
  const riskCategories = [
    {
      key: 'geographic_risk_score',
      notesKey: 'geographic_risk_notes',
      title: 'Geographic Risk',
      description: 'Risk based on destination country and region'
    },
    {
      key: 'product_risk_score',
      notesKey: 'product_risk_notes', 
      title: 'Product Risk',
      description: 'Risk based on product type and strategic nature'
    },
    {
      key: 'end_user_risk_score',
      notesKey: 'end_user_risk_notes',
      title: 'End-User Risk', 
      description: 'Risk based on end-user profile and background'
    },
    {
      key: 'transaction_risk_score',
      notesKey: 'transaction_risk_notes',
      title: 'Transaction Risk',
      description: 'Risk based on transaction value and context'
    }
  ];

  const getRiskColor = (score) => {
    if (score >= 7) return '#dc2626';
    if (score >= 5) return '#f59e0b';
    return '#16a34a';
  };

  return (
    <div>
      <h3 style={{ color: 'var(--primary)', marginBottom: '20px' }}>
        ⚖️ Risk Assessment (1-10 Scale)
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {riskCategories.map(category => (
          <div
            key={category.key}
            style={{
              padding: '20px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'white'
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>
              {category.title}
            </h4>
            <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
              {category.description}
            </p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Risk Score (1 = Low, 10 = High)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={data[category.key] || 5}
                onChange={(e) => onChange(category.key, parseInt(e.target.value))}
                style={{ width: '100%', marginBottom: '10px' }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Low Risk</span>
                <span style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: getRiskColor(data[category.key] || 5)
                }}>
                  {data[category.key] || 5}/10
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>High Risk</span>
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Risk Notes
              </label>
              <textarea
                value={data[category.notesKey] || ''}
                onChange={(e) => onChange(category.notesKey, e.target.value)}
                placeholder="Explain the risk factors..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Overall Risk Summary */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        borderRadius: '8px',
        background: `linear-gradient(135deg, ${getRiskColor(overallRisk)}20, ${getRiskColor(overallRisk)}10)`,
        border: `2px solid ${getRiskColor(overallRisk)}`
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: getRiskColor(overallRisk) }}>
          Overall Risk Assessment
        </h4>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: getRiskColor(overallRisk) }}>
            {overallRisk.toFixed(1)}/10
          </div>
          <div>
            <div style={{ 
              padding: '6px 16px', 
              borderRadius: '20px', 
              background: getRiskColor(overallRisk), 
              color: 'white', 
              fontSize: '14px', 
              fontWeight: 'bold',
              display: 'inline-block',
              marginBottom: '8px'
            }}>
              {overallRisk >= 7 ? 'HIGH RISK' : overallRisk >= 5 ? 'MEDIUM RISK' : 'LOW RISK'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Average of all risk categories
            </div>
          </div>
        </div>

        {overallRisk >= 7 && (
          <div style={{ 
            padding: '12px', 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '6px',
            color: '#991b1b'
          }}>
            <strong>⚠️ High Risk Transaction:</strong> Enhanced due diligence and manual review required.
          </div>
        )}
        
        {overallRisk >= 5 && overallRisk < 7 && (
          <div style={{ 
            padding: '12px', 
            background: '#fffbeb', 
            border: '1px solid #fed7aa', 
            borderRadius: '6px',
            color: '#92400e'
          }}>
            <strong>🔍 Medium Risk Transaction:</strong> Additional documentation may be required.
          </div>
        )}
        
        {overallRisk < 5 && (
          <div style={{ 
            padding: '12px', 
            background: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '6px',
            color: '#166534'
          }}>
            <strong>✅ Low Risk Transaction:</strong> Standard processing may proceed.
          </div>
        )}
      </div>
    </div>
  );
}

// Section 5: Documentation
function DocumentationSection({ screeningId, documents, setDocuments }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const documentTypes = [
    { value: 'end_user_certificate', label: 'End-User Certificate' },
    { value: 'business_license', label: 'Business License' },
    { value: 'reference_letter', label: 'Reference Letter' },
    { value: 'bank_reference', label: 'Bank Reference' },
    { value: 'trade_reference', label: 'Trade Reference' },
    { value: 'other', label: 'Other Document' }
  ];

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const documentType = event.target.dataset.documentType;
    
    setUploading(true);
    setUploadStatus('Uploading...');

    const formData = new FormData();
    formData.append('document', file);
    formData.append('screening_id', screeningId);
    formData.append('document_type', documentType);

    try {
      const response = await fetch('/api/comprehensive-screening/upload-document', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUploadStatus('✅ Document uploaded successfully');
        // Add to documents list
        setDocuments(prev => [...prev, {
          document_id: data.document_id,
          document_type: documentType,
          document_name: data.filename,
          file_size: data.size,
          upload_status: 'uploaded',
          uploaded_at: new Date().toISOString()
        }]);
      } else {
        setUploadStatus('❌ Upload failed: ' + data.error);
      }
    } catch (error) {
      setUploadStatus('❌ Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(''), 3000);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <h3 style={{ color: 'var(--primary)', marginBottom: '20px' }}>
        📄 Supporting Documentation
      </h3>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: '#f0f9ff', 
        border: '1px solid #0ea5e9', 
        borderRadius: '6px' 
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#0c4a6e' }}>Required Documents</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#0c4a6e' }}>
          <li>End-User Certificate (mandatory for strategic items)</li>
          <li>Business License or Registration Certificate</li>
          <li>Bank Reference or Financial Statement</li>
          <li>Trade References (for new customers over $50K)</li>
        </ul>
      </div>

      {uploadStatus && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          borderRadius: '4px',
          background: uploadStatus.includes('❌') ? '#fee2e2' : '#f0fdf4',
          border: `1px solid ${uploadStatus.includes('❌') ? '#fecaca' : '#bbf7d0'}`,
          color: uploadStatus.includes('❌') ? '#dc2626' : '#166534'
        }}>
          {uploadStatus}
        </div>
      )}

      {/* Upload Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        {documentTypes.map(docType => (
          <div
            key={docType.value}
            style={{
              padding: '20px',
              border: '2px dashed var(--border)',
              borderRadius: '8px',
              textAlign: 'center',
              background: '#fafafa',
              position: 'relative'
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>
              {docType.label}
            </h4>
            
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              data-document-type={docType.value}
              disabled={uploading}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
            />
            
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              📎 Click to upload<br/>
              PDF, DOC, DOCX, JPG, PNG<br/>
              Max 10MB
            </div>
            
            {/* Show uploaded document for this type */}
            {documents.filter(doc => doc.document_type === docType.value).map(doc => (
              <div
                key={doc.document_id}
                style={{
                  marginTop: '10px',
                  padding: '8px',
                  background: '#e5f3ff',
                  border: '1px solid #b3d9ff',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#0066cc' }}>
                  {doc.document_name}
                </div>
                <div style={{ color: '#666' }}>
                  {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <h4 style={{ color: 'var(--primary)', marginBottom: '15px' }}>
            📋 Uploaded Documents ({documents.length})
          </h4>
          
          <div style={{ 
            border: '1px solid var(--border)', 
            borderRadius: '6px', 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', 
              gap: '15px', 
              padding: '12px 15px', 
              background: '#f8fafc', 
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              <div>Document Name</div>
              <div>Type</div>
              <div>Size</div>
              <div>Status</div>
              <div>Uploaded</div>
            </div>
            
            {documents.map(doc => (
              <div
                key={doc.document_id}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', 
                  gap: '15px', 
                  padding: '12px 15px', 
                  borderTop: '1px solid var(--border)',
                  fontSize: '14px'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{doc.document_name}</div>
                <div style={{ textTransform: 'capitalize' }}>
                  {doc.document_type.replace('_', ' ')}
                </div>
                <div>{formatFileSize(doc.file_size)}</div>
                <div>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: doc.upload_status === 'uploaded' ? '#dcfce7' : '#fee2e2',
                    color: doc.upload_status === 'uploaded' ? '#166534' : '#dc2626'
                  }}>
                    {doc.upload_status}
                  </span>
                </div>
                <div>{new Date(doc.uploaded_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Section 6: Compliance Workflow
function ComplianceWorkflowSection({ data, onChange }) {
  const statusOptions = [
    { value: 'pending', label: 'Pending Review', color: '#f59e0b' },
    { value: 'in_review', label: 'Under Review', color: '#3b82f6' },
    { value: 'approved', label: 'Approved', color: '#16a34a' },
    { value: 'denied', label: 'Denied', color: '#dc2626' },
    { value: 'requires_enhanced_dd', label: 'Requires Enhanced DD', color: '#7c2d12' }
  ];

  const currentStatus = statusOptions.find(s => s.value === (data.screening_status || 'pending'));

  return (
    <div>
      <h3 style={{ color: 'var(--primary)', marginBottom: '20px' }}>
        ✅ Compliance Workflow & Approval
      </h3>
      
      {/* Current Status */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        border: `2px solid ${currentStatus?.color || '#f59e0b'}`,
        borderRadius: '8px',
        background: `${currentStatus?.color || '#f59e0b'}15`
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: currentStatus?.color }}>
          Current Status
        </h4>
        <div style={{ 
          display: 'inline-block',
          padding: '8px 16px', 
          borderRadius: '20px', 
          background: currentStatus?.color, 
          color: 'white', 
          fontSize: '16px', 
          fontWeight: 'bold' 
        }}>
          {currentStatus?.label || 'Pending Review'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Assigned Compliance Officer
          </label>
          <input
            type="text"
            value={data.assigned_officer || ''}
            onChange={(e) => onChange('assigned_officer', e.target.value)}
            placeholder="Officer name"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Screening Status
          </label>
          <select
            value={data.screening_status || 'pending'}
            onChange={(e) => onChange('screening_status', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '4px'
            }}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Officer Notes & Comments
        </label>
        <textarea
          value={data.officer_notes || ''}
          onChange={(e) => onChange('officer_notes', e.target.value)}
          placeholder="Compliance officer notes, review comments, approval/denial reasons..."
          rows={4}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Enhanced Due Diligence Section */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        border: '1px solid var(--border)', 
        borderRadius: '8px',
        background: '#fafafa'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: 'var(--primary)' }}>
          Enhanced Due Diligence
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={data.enhanced_dd_required || false}
                onChange={(e) => onChange('enhanced_dd_required', e.target.checked)}
              />
              <span style={{ fontWeight: 'bold' }}>Enhanced DD Required</span>
            </label>
          </div>
          
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={data.enhanced_dd_completed || false}
                onChange={(e) => onChange('enhanced_dd_completed', e.target.checked)}
                disabled={!data.enhanced_dd_required}
              />
              <span style={{ fontWeight: 'bold' }}>Enhanced DD Completed</span>
            </label>
          </div>
          
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={data.manual_review_required || false}
                onChange={(e) => onChange('manual_review_required', e.target.checked)}
              />
              <span style={{ fontWeight: 'bold' }}>Manual Review Required</span>
            </label>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Compliance Expiry Date
            </label>
            <input
              type="date"
              value={data.compliance_expiry_date || ''}
              onChange={(e) => onChange('compliance_expiry_date', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border)',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Approval/Denial Section */}
      {(data.screening_status === 'approved' || data.screening_status === 'denied') && (
        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          border: `1px solid ${data.screening_status === 'approved' ? '#16a34a' : '#dc2626'}`,
          borderRadius: '8px',
          background: data.screening_status === 'approved' ? '#f0fdf4' : '#fef2f2'
        }}>
          <h4 style={{ 
            margin: '0 0 15px 0', 
            color: data.screening_status === 'approved' ? '#166534' : '#991b1b' 
          }}>
            {data.screening_status === 'approved' ? '✅ Approval Details' : '❌ Denial Details'}
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {data.screening_status === 'approved' ? 'Approved By' : 'Denied By'}
              </label>
              <input
                type="text"
                value={data.approved_by || ''}
                onChange={(e) => onChange('approved_by', e.target.value)}
                placeholder="Officer name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {data.screening_status === 'approved' ? 'Approval Date' : 'Denial Date'}
              </label>
              <input
                type="datetime-local"
                value={data.approval_date ? new Date(data.approval_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => onChange('approval_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
          
          {data.screening_status === 'denied' && (
            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Denial Reason
              </label>
              <textarea
                value={data.denial_reason || ''}
                onChange={(e) => onChange('denial_reason', e.target.value)}
                placeholder="Detailed reason for denial..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Workflow Summary */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        background: '#f0f9ff', 
        border: '1px solid #0ea5e9', 
        borderRadius: '8px' 
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#0c4a6e' }}>
          📋 Compliance Checklist
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: data.company_name ? '#16a34a' : '#dc2626',
              fontSize: '18px'
            }}>
              {data.company_name ? '✅' : '❌'}
            </span>
            <span>End-user details completed</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: (data.end_use_declaration || '').length >= 20 ? '#16a34a' : '#dc2626',
              fontSize: '18px'
            }}>
              {(data.end_use_declaration || '').length >= 20 ? '✅' : '❌'}
            </span>
            <span>End-use declaration provided (20+ chars)</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: '#f59e0b', // Always pending until screening is performed
              fontSize: '18px'
            }}>
              ⏳
            </span>
            <span>Watchlist screening completed</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: data.assigned_officer ? '#16a34a' : '#dc2626',
              fontSize: '18px'
            }}>
              {data.assigned_officer ? '✅' : '❌'}
            </span>
            <span>Compliance officer assigned</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: data.screening_status === 'approved' ? '#16a34a' : '#f59e0b',
              fontSize: '18px'
            }}>
              {data.screening_status === 'approved' ? '✅' : '⏳'}
            </span>
            <span>Final approval status</span>
          </div>
        </div>
      </div>
    </div>
  );
}
