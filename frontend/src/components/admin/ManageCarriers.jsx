/**
 * Manage Carriers - Admin View
 * Admin interface for managing carriers, services, and pricing
 */

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../config/api.js';
import './ManageCarriers.scss';

const ManageCarriers = () => {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRateCalculator, setShowRateCalculator] = useState(false);

  // Form state for adding/editing carriers
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    description: '',
    default_margin_percentage: 15.00,
    is_active: true
  });

  // Rate calculator state
  const [rateCalc, setRateCalc] = useState({
    origin_country: 'Malaysia',
    destination_country: '',
    weight_kg: 1,
    selected_carriers: [],
    rates: [],
    loading: false
  });

  // Fetch carriers from API
  const fetchCarriers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
      
      const response = await apiRequest('/admin/carriers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCarriers(data.data.carriers || []);
      } else {
        throw new Error(data.error || 'Failed to fetch carriers');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarriers();
  }, []);

  // Handle form submission for creating/updating carrier
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
      
      const method = selectedCarrier ? 'PUT' : 'POST';
      const url = selectedCarrier ? `/admin/carriers/${selectedCarrier.carrier_id}` : '/admin/carriers';
      
      const response = await apiRequest(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        await fetchCarriers(); // Refresh the list
        setShowAddForm(false);
        setSelectedCarrier(null);
        setFormData({
          name: '',
          code: '',
          contact_email: '',
          contact_phone: '',
          website: '',
          description: '',
          default_margin_percentage: 15.00,
          is_active: true
        });
      } else {
        throw new Error(data.error || 'Failed to save carrier');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle carrier details view
  const handleViewDetails = async (carrier) => {
    try {
      const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
      
      const response = await apiRequest(`/admin/carriers/${carrier.carrier_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSelectedCarrier(data.data);
        setShowDetails(true);
      } else {
        throw new Error(data.error || 'Failed to fetch carrier details');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle edit carrier
  const handleEdit = (carrier) => {
    setFormData({
      name: carrier.name,
      code: carrier.code,
      contact_email: carrier.contact_email || '',
      contact_phone: carrier.contact_phone || '',
      website: carrier.website || '',
      description: carrier.description || '',
      default_margin_percentage: carrier.default_margin_percentage,
      is_active: carrier.is_active
    });
    setSelectedCarrier(carrier);
    setShowAddForm(true);
  };

  // Handle rate calculation
  const calculateRates = async () => {
    try {
      setRateCalc(prev => ({ ...prev, loading: true }));
      const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
      
      const response = await apiRequest('/admin/carriers/calculate-rates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin_country: rateCalc.origin_country,
          destination_country: rateCalc.destination_country,
          weight_kg: rateCalc.weight_kg,
          selected_carriers: rateCalc.selected_carriers.length > 0 ? rateCalc.selected_carriers : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setRateCalc(prev => ({ 
          ...prev, 
          rates: data.data.rates || [],
          loading: false
        }));
      } else {
        throw new Error(data.error || 'Failed to calculate rates');
      }
    } catch (err) {
      setError(err.message);
      setRateCalc(prev => ({ ...prev, loading: false }));
    }
  };

  if (loading) {
    return (
      <div className="manage-carriers">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading carriers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manage-carriers">
        <div className="error-container">
          <div className="error-message">
            <h3>Error Loading Carriers</h3>
            <p>{error}</p>
            <button onClick={fetchCarriers} className="btn-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-carriers">
      <div className="carriers-container">
        {/* Header */}
        <div className="carriers-header">
          <div className="header-left">
            <h1>Manage Carriers</h1>
            <p>Manage shipping carriers, services, and pricing</p>
          </div>
          
          <div className="header-actions">
            <button 
              className="btn-secondary"
              onClick={() => setShowRateCalculator(true)}
            >
              Rate Calculator
            </button>
            <button 
              className="btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Carrier
            </button>
          </div>
        </div>

        {/* Carriers Grid */}
        <div className="carriers-grid">
          {carriers.map(carrier => (
            <div key={carrier.carrier_id} className={`carrier-card ${!carrier.is_active ? 'inactive' : ''}`}>
              <div className="carrier-header">
                <div className="carrier-info">
                  <h3>{carrier.name}</h3>
                  <span className="carrier-code">{carrier.code}</span>
                  {!carrier.is_active && <span className="inactive-badge">Inactive</span>}
                </div>
                <div className="carrier-margin">
                  {carrier.default_margin_percentage}% margin
                </div>
              </div>
              
              <div className="carrier-stats">
                <div className="stat">
                  <span className="stat-label">Services</span>
                  <span className="stat-value">{carrier.service_count}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Active</span>
                  <span className="stat-value">{carrier.active_service_count}</span>
                </div>
              </div>

              {carrier.contact_email && (
                <div className="carrier-contact">
                  <span>{carrier.contact_email}</span>
                </div>
              )}

              {carrier.website && (
                <div className="carrier-website">
                  <a href={carrier.website} target="_blank" rel="noopener noreferrer">
                    Visit Website
                  </a>
                </div>
              )}

              <div className="carrier-actions">
                <button 
                  className="btn-small btn-outline"
                  onClick={() => handleViewDetails(carrier)}
                >
                  View Details
                </button>
                <button 
                  className="btn-small btn-primary"
                  onClick={() => handleEdit(carrier)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {carriers.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🚚</div>
            <h3>No carriers found</h3>
            <p>Add your first shipping carrier to get started.</p>
            <button 
              className="btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Carrier
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Carrier Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedCarrier ? 'Edit Carrier' : 'Add New Carrier'}</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedCarrier(null);
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Carrier Name*</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Code*</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Default Margin (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.default_margin_percentage}
                    onChange={(e) => setFormData({...formData, default_margin_percentage: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedCarrier ? 'Update' : 'Create'} Carrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Carrier Details Modal */}
      {showDetails && selectedCarrier && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h2>{selectedCarrier.name} Details</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowDetails(false);
                  setSelectedCarrier(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="carrier-details">
                <div className="details-section">
                  <h3>Basic Information</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Code:</label>
                      <span>{selectedCarrier.code}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className={selectedCarrier.is_active ? 'status-active' : 'status-inactive'}>
                        {selectedCarrier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Default Margin:</label>
                      <span>{selectedCarrier.default_margin_percentage}%</span>
                    </div>
                    {selectedCarrier.contact_email && (
                      <div className="detail-item">
                        <label>Email:</label>
                        <span>{selectedCarrier.contact_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedCarrier.services && selectedCarrier.services.length > 0 && (
                  <div className="details-section">
                    <h3>Services ({selectedCarrier.services.length})</h3>
                    <div className="services-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Service Name</th>
                            <th>Type</th>
                            <th>Transit Days</th>
                            <th>Weight Range</th>
                            <th>Pricing Rules</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCarrier.services.map(service => (
                            <tr key={service.service_id}>
                              <td>{service.service_name}</td>
                              <td>
                                <span className={`service-type ${service.service_type.toLowerCase()}`}>
                                  {service.service_type}
                                </span>
                              </td>
                              <td>
                                {service.transit_days_min === service.transit_days_max 
                                  ? service.transit_days_min 
                                  : `${service.transit_days_min}-${service.transit_days_max}`} days
                              </td>
                              <td>
                                {service.min_weight_kg}-{service.max_weight_kg} kg
                              </td>
                              <td>{service.pricing_count} rules</td>
                              <td>
                                <span className={service.is_active ? 'status-active' : 'status-inactive'}>
                                  {service.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Calculator Modal */}
      {showRateCalculator && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h2>Shipping Rate Calculator</h2>
              <button 
                className="modal-close"
                onClick={() => setShowRateCalculator(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="rate-calculator">
                <div className="calc-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Origin Country</label>
                      <input
                        type="text"
                        value={rateCalc.origin_country}
                        onChange={(e) => setRateCalc({...rateCalc, origin_country: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Destination Country*</label>
                      <input
                        type="text"
                        value={rateCalc.destination_country}
                        onChange={(e) => setRateCalc({...rateCalc, destination_country: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Weight (kg)*</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={rateCalc.weight_kg}
                        onChange={(e) => setRateCalc({...rateCalc, weight_kg: parseFloat(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Selected Carriers (optional)</label>
                      <select
                        multiple
                        value={rateCalc.selected_carriers}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setRateCalc({...rateCalc, selected_carriers: values});
                        }}
                      >
                        {carriers.filter(c => c.is_active).map(carrier => (
                          <option key={carrier.carrier_id} value={carrier.code}>
                            {carrier.name} ({carrier.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button 
                    className="btn-primary"
                    onClick={calculateRates}
                    disabled={rateCalc.loading || !rateCalc.destination_country}
                  >
                    {rateCalc.loading ? 'Calculating...' : 'Calculate Rates'}
                  </button>
                </div>

                {rateCalc.rates.length > 0 && (
                  <div className="calc-results">
                    <h3>Available Rates ({rateCalc.rates.length})</h3>
                    <div className="rates-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Carrier</th>
                            <th>Service</th>
                            <th>Transit</th>
                            <th>Base Cost</th>
                            <th>Margin</th>
                            <th>Final Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rateCalc.rates.map((rate, index) => (
                            <tr key={index}>
                              <td>{rate.carrier_name}</td>
                              <td>{rate.service_type}</td>
                              <td>{rate.transit_days_min}-{rate.transit_days_max} days</td>
                              <td>${rate.total_cost}</td>
                              <td>{rate.margin_percentage}%</td>
                              <td className="final-cost">${rate.total_cost_with_margin}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCarriers;