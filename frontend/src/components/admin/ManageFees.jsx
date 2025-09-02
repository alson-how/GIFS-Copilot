/**
 * Manage Additional Fees - Admin View
 * Admin interface for managing additional fees, zones, and weight breaks
 */

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../config/api.js';
import './ManageFees.scss';

const ManageFees = () => {
  const [activeTab, setActiveTab] = useState('fees'); // 'fees', 'zones', 'weight-breaks'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Additional Fees State
  const [fees, setFees] = useState([]);
  const [feesByCategory, setFeesByCategory] = useState({});
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  
  // Zones State
  const [zones, setZones] = useState([]);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  
  // Weight Breaks State
  const [weightBreaks, setWeightBreaks] = useState([]);
  const [weightsByService, setWeightsByService] = useState({});
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState(null);

  // Fee Calculator State
  const [calculator, setCalculator] = useState({
    commodity_value: 10000,
    base_rate: 500,
    weight_kg: 50,
    service_type: 'express',
    destination_country: 'Singapore',
    selected_fees: [],
    results: null,
    loading: false
  });

  // Form States
  const [feeForm, setFeeForm] = useState({
    category: 'origin',
    fee_code: '',
    fee_name: '',
    fee_type: 'fixed',
    base_amount: 0,
    percentage_rate: 0,
    calculation_base: '',
    unit_type: '',
    description: '',
    is_required: false
  });

  const [zoneForm, setZoneForm] = useState({
    zone_code: '',
    zone_name: '',
    origin_country: 'Malaysia',
    destination_country: '',
    zone_number: 1,
    distance_km: 0,
    transit_days_min: 1,
    transit_days_max: 3,
    rate_multiplier: 1.0,
    fuel_surcharge_rate: 0.0
  });

  const [weightForm, setWeightForm] = useState({
    break_name: '',
    service_type: 'express',
    origin_country: 'Malaysia',
    destination_country: '',
    weight_min_kg: 0,
    weight_max_kg: 30,
    rate_per_kg: 10.0,
    minimum_charge: 25.0
  });

  const categories = [
    { value: 'origin', label: 'Origin Charges' },
    { value: 'customs', label: 'Customs & Compliance' },
    { value: 'destination', label: 'Destination Charges' },
    { value: 'special', label: 'Special Services' },
    { value: 'accessorial', label: 'Accessorial Charges' },
    { value: 'equipment', label: 'Equipment & Labor' },
    { value: 'documentation', label: 'Documentation' }
  ];

  const feeTypes = [
    { value: 'fixed', label: 'Fixed Amount' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'per_unit', label: 'Per Unit' }
  ];

  const serviceTypes = [
    { value: 'express', label: 'Express' },
    { value: 'economy', label: 'Economy' },
    { value: 'sea_freight', label: 'Sea Freight' },
    { value: 'ground', label: 'Ground' }
  ];

  useEffect(() => {
    if (activeTab === 'fees') {
      fetchFees();
    } else if (activeTab === 'zones') {
      fetchZones();
    } else if (activeTab === 'weight-breaks') {
      fetchWeightBreaks();
    }
  }, [activeTab]);

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');
    return await apiRequest(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  };

  // ==================== FEES FUNCTIONS ====================

  const fetchFees = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('/admin/fees');
      const data = await response.json();
      
      if (data.success) {
        setFees(data.data.fees);
        setFeesByCategory(data.data.feesByCategory);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = selectedFee ? 'PUT' : 'POST';
      const url = selectedFee ? `/admin/fees/${selectedFee.fee_id}` : '/admin/fees';
      
      const response = await makeAuthenticatedRequest(url, {
        method,
        body: JSON.stringify(feeForm)
      });

      const data = await response.json();
      if (data.success) {
        await fetchFees();
        setShowFeeForm(false);
        setSelectedFee(null);
        resetFeeForm();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetFeeForm = () => {
    setFeeForm({
      category: 'origin',
      fee_code: '',
      fee_name: '',
      fee_type: 'fixed',
      base_amount: 0,
      percentage_rate: 0,
      calculation_base: '',
      unit_type: '',
      description: '',
      is_required: false
    });
  };

  // ==================== ZONES FUNCTIONS ====================

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('/admin/fees/zones');
      const data = await response.json();
      
      if (data.success) {
        setZones(data.data.zones);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = selectedZone ? 'PUT' : 'POST';
      const url = selectedZone ? `/admin/fees/zones/${selectedZone.zone_id}` : '/admin/fees/zones';
      
      const response = await makeAuthenticatedRequest(url, {
        method,
        body: JSON.stringify(zoneForm)
      });

      const data = await response.json();
      if (data.success) {
        await fetchZones();
        setShowZoneForm(false);
        setSelectedZone(null);
        resetZoneForm();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetZoneForm = () => {
    setZoneForm({
      zone_code: '',
      zone_name: '',
      origin_country: 'Malaysia',
      destination_country: '',
      zone_number: 1,
      distance_km: 0,
      transit_days_min: 1,
      transit_days_max: 3,
      rate_multiplier: 1.0,
      fuel_surcharge_rate: 0.0
    });
  };

  const addZoneRow = () => {
    setZones([...zones, {
      zone_id: `temp-${Date.now()}`,
      zone_code: '',
      zone_name: '',
      origin_country: 'Malaysia',
      destination_country: '',
      zone_number: zones.length + 1,
      rate_multiplier: 1.0,
      isNew: true
    }]);
  };

  // ==================== WEIGHT BREAKS FUNCTIONS ====================

  const fetchWeightBreaks = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('/admin/fees/weight-breaks');
      const data = await response.json();
      
      if (data.success) {
        setWeightBreaks(data.data.weightBreaks);
        setWeightsByService(data.data.weightsByService);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = selectedWeight ? 'PUT' : 'POST';
      const url = selectedWeight ? `/admin/fees/weight-breaks/${selectedWeight.break_id}` : '/admin/fees/weight-breaks';
      
      const response = await makeAuthenticatedRequest(url, {
        method,
        body: JSON.stringify(weightForm)
      });

      const data = await response.json();
      if (data.success) {
        await fetchWeightBreaks();
        setShowWeightForm(false);
        setSelectedWeight(null);
        resetWeightForm();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetWeightForm = () => {
    setWeightForm({
      break_name: '',
      service_type: 'express',
      origin_country: 'Malaysia',
      destination_country: '',
      weight_min_kg: 0,
      weight_max_kg: 30,
      rate_per_kg: 10.0,
      minimum_charge: 25.0
    });
  };

  const addWeightBreakRow = () => {
    setWeightBreaks([...weightBreaks, {
      break_id: `temp-${Date.now()}`,
      break_name: '',
      weight_min_kg: 0,
      weight_max_kg: 0,
      rate_per_kg: 0,
      isNew: true
    }]);
  };

  // ==================== CALCULATOR FUNCTIONS ====================

  const calculateFees = async () => {
    try {
      setCalculator(prev => ({ ...prev, loading: true }));
      
      const response = await makeAuthenticatedRequest('/admin/fees/calculate', {
        method: 'POST',
        body: JSON.stringify({
          commodity_value: calculator.commodity_value,
          base_rate: calculator.base_rate,
          weight_kg: calculator.weight_kg,
          service_type: calculator.service_type,
          destination_country: calculator.destination_country,
          selected_fees: calculator.selected_fees
        })
      });

      const data = await response.json();
      if (data.success) {
        setCalculator(prev => ({ 
          ...prev, 
          results: data.data.calculation,
          loading: false 
        }));
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
      setCalculator(prev => ({ ...prev, loading: false }));
    }
  };

  if (loading && activeTab === 'fees' && fees.length === 0) {
    return (
      <div className="manage-fees">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading fees management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-fees">
      <div className="fees-container">
        {/* Header */}
        <div className="fees-header">
          <div className="header-left">
            <h1>Manage Additional Fees</h1>
            <p>Configure additional fees, shipping zones, and weight breaks</p>
          </div>
          
          <div className="header-actions">
            <button 
              className="btn-primary"
              onClick={() => {
                if (activeTab === 'fees') setShowFeeForm(true);
                else if (activeTab === 'zones') setShowZoneForm(true);
                else if (activeTab === 'weight-breaks') setShowWeightForm(true);
              }}
            >
              Add {activeTab === 'fees' ? 'Fee' : activeTab === 'zones' ? 'Zone' : 'Weight Break'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'fees' ? 'active' : ''}`}
            onClick={() => setActiveTab('fees')}
          >
            Additional Fees
          </button>
          <button 
            className={`tab ${activeTab === 'zones' ? 'active' : ''}`}
            onClick={() => setActiveTab('zones')}
          >
            Shipping Zones
          </button>
          <button 
            className={`tab ${activeTab === 'weight-breaks' ? 'active' : ''}`}
            onClick={() => setActiveTab('weight-breaks')}
          >
            Weight Breaks
          </button>
          <button 
            className={`tab ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            Fee Calculator
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Tab Content */}
        <div className="tab-content">
          {/* Additional Fees Tab */}
          {activeTab === 'fees' && (
            <div className="fees-tab">
              {Object.entries(feesByCategory).map(([category, categoryFees]) => (
                <div key={category} className="fee-category">
                  <h3 className="category-title">
                    {categories.find(c => c.value === category)?.label || category.toUpperCase()}
                    <span className="fee-count">({categoryFees.length})</span>
                  </h3>
                  <div className="fees-grid">
                    {categoryFees.map(fee => (
                      <div key={fee.fee_id} className={`fee-card ${!fee.is_active ? 'inactive' : ''}`}>
                        <div className="fee-header">
                          <h4>{fee.fee_name}</h4>
                          <div className="fee-badges">
                            {fee.is_required && <span className="badge required">Required</span>}
                            <span className={`badge ${fee.fee_type}`}>{fee.fee_type}</span>
                          </div>
                        </div>
                        <div className="fee-details">
                          <div className="fee-amount">
                            {fee.fee_type === 'fixed' && `$${fee.base_amount}`}
                            {fee.fee_type === 'percentage' && `${fee.percentage_rate}%`}
                            {fee.fee_type === 'per_unit' && `$${fee.base_amount} per unit`}
                          </div>
                          <p className="fee-description">{fee.description}</p>
                        </div>
                        <div className="fee-actions">
                          <button 
                            className="btn-small btn-outline"
                            onClick={() => {
                              setSelectedFee(fee);
                              setFeeForm({...fee});
                              setShowFeeForm(true);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Shipping Zones Tab */}
          {activeTab === 'zones' && (
            <div className="zones-tab">
              <div className="table-controls">
                <button className="btn-secondary" onClick={addZoneRow}>
                  Add Row
                </button>
              </div>
              <div className="zones-table">
                <table>
                  <thead>
                    <tr>
                      <th>Zone Code</th>
                      <th>Zone Name</th>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th>Zone Number</th>
                      <th>Rate Multiplier</th>
                      <th>Fuel Surcharge</th>
                      <th>Transit Days</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map(zone => (
                      <tr key={zone.zone_id}>
                        <td>{zone.zone_code}</td>
                        <td>{zone.zone_name}</td>
                        <td>{zone.origin_country}</td>
                        <td>{zone.destination_country}</td>
                        <td>{zone.zone_number}</td>
                        <td>{zone.rate_multiplier}x</td>
                        <td>{zone.fuel_surcharge_rate}%</td>
                        <td>{zone.transit_days_min}-{zone.transit_days_max} days</td>
                        <td>
                          <button 
                            className="btn-small btn-outline"
                            onClick={() => {
                              setSelectedZone(zone);
                              setZoneForm({...zone});
                              setShowZoneForm(true);
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Weight Breaks Tab */}
          {activeTab === 'weight-breaks' && (
            <div className="weight-breaks-tab">
              <div className="table-controls">
                <button className="btn-secondary" onClick={addWeightBreakRow}>
                  Add Row
                </button>
              </div>
              {Object.entries(weightsByService).map(([serviceType, weights]) => (
                <div key={serviceType} className="weight-service-group">
                  <h3 className="service-title">
                    {serviceTypes.find(s => s.value === serviceType)?.label || serviceType.toUpperCase()} Service
                    <span className="weight-count">({weights.length})</span>
                  </h3>
                  <div className="weight-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Break Name</th>
                          <th>Weight Range (kg)</th>
                          <th>Rate per KG</th>
                          <th>Minimum Charge</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weights.map(weight => (
                          <tr key={weight.break_id}>
                            <td>{weight.break_name}</td>
                            <td>{weight.weight_min_kg} - {weight.weight_max_kg === 999999 ? '∞' : weight.weight_max_kg}</td>
                            <td>${weight.rate_per_kg}</td>
                            <td>${weight.minimum_charge}</td>
                            <td>
                              <button 
                                className="btn-small btn-outline"
                                onClick={() => {
                                  setSelectedWeight(weight);
                                  setWeightForm({...weight});
                                  setShowWeightForm(true);
                                }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fee Calculator Tab */}
          {activeTab === 'calculator' && (
            <div className="calculator-tab">
              <div className="calculator-form">
                <h3>Shipping Fee Calculator</h3>
                <div className="calc-inputs">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Commodity Value ($)</label>
                      <input
                        type="number"
                        value={calculator.commodity_value}
                        onChange={(e) => setCalculator({...calculator, commodity_value: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Base Rate ($)</label>
                      <input
                        type="number"
                        value={calculator.base_rate}
                        onChange={(e) => setCalculator({...calculator, base_rate: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Weight (kg)</label>
                      <input
                        type="number"
                        value={calculator.weight_kg}
                        onChange={(e) => setCalculator({...calculator, weight_kg: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Service Type</label>
                      <select
                        value={calculator.service_type}
                        onChange={(e) => setCalculator({...calculator, service_type: e.target.value})}
                      >
                        {serviceTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Destination Country</label>
                    <input
                      type="text"
                      value={calculator.destination_country}
                      onChange={(e) => setCalculator({...calculator, destination_country: e.target.value})}
                    />
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={calculateFees}
                    disabled={calculator.loading}
                  >
                    {calculator.loading ? 'Calculating...' : 'Calculate Fees'}
                  </button>
                </div>

                {calculator.results && (
                  <div className="calc-results">
                    <h4>Calculation Results</h4>
                    <div className="results-summary">
                      <div className="result-item">
                        <label>Base Rate:</label>
                        <span>${calculator.results.base_rate}</span>
                      </div>
                      <div className="result-item">
                        <label>Zone Multiplier:</label>
                        <span>{calculator.results.zone_multiplier}x</span>
                      </div>
                      <div className="result-item">
                        <label>Additional Fees:</label>
                        <span>${calculator.results.total_additional_fees}</span>
                      </div>
                      <div className="result-item total">
                        <label>Total Cost:</label>
                        <span>${calculator.results.total_cost}</span>
                      </div>
                    </div>
                    <div className="fees-breakdown">
                      <h5>Fees Breakdown:</h5>
                      {calculator.results.additional_fees.map((fee, index) => (
                        <div key={index} className="fee-breakdown-item">
                          <span className="fee-name">{fee.fee_name}</span>
                          <span className="fee-amount">${fee.amount}</span>
                          {fee.is_required && <span className="required-badge">Required</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fee Form Modal */}
      {showFeeForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedFee ? 'Edit Fee' : 'Add New Fee'}</h2>
              <button onClick={() => setShowFeeForm(false)}>×</button>
            </div>
            <form onSubmit={handleFeeSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Category*</label>
                  <select
                    value={feeForm.category}
                    onChange={(e) => setFeeForm({...feeForm, category: e.target.value})}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fee Type*</label>
                  <select
                    value={feeForm.fee_type}
                    onChange={(e) => setFeeForm({...feeForm, fee_type: e.target.value})}
                    required
                  >
                    {feeTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fee Code*</label>
                  <input
                    type="text"
                    value={feeForm.fee_code}
                    onChange={(e) => setFeeForm({...feeForm, fee_code: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fee Name*</label>
                  <input
                    type="text"
                    value={feeForm.fee_name}
                    onChange={(e) => setFeeForm({...feeForm, fee_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              {feeForm.fee_type === 'fixed' && (
                <div className="form-group">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={feeForm.base_amount}
                    onChange={(e) => setFeeForm({...feeForm, base_amount: parseFloat(e.target.value)})}
                  />
                </div>
              )}
              {feeForm.fee_type === 'percentage' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Percentage Rate (%)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={feeForm.percentage_rate}
                      onChange={(e) => setFeeForm({...feeForm, percentage_rate: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Calculation Base</label>
                    <select
                      value={feeForm.calculation_base}
                      onChange={(e) => setFeeForm({...feeForm, calculation_base: e.target.value})}
                    >
                      <option value="">Select base</option>
                      <option value="commodity_value">Commodity Value</option>
                      <option value="base_rate">Base Rate</option>
                      <option value="weight">Weight</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={feeForm.description}
                  onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={feeForm.is_required}
                    onChange={(e) => setFeeForm({...feeForm, is_required: e.target.checked})}
                  />
                  Required Fee
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowFeeForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedFee ? 'Update' : 'Create'} Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zone Form Modal */}
      {showZoneForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedZone ? 'Edit Zone' : 'Add New Zone'}</h2>
              <button onClick={() => setShowZoneForm(false)}>×</button>
            </div>
            <form onSubmit={handleZoneSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Zone Code*</label>
                  <input
                    type="text"
                    value={zoneForm.zone_code}
                    onChange={(e) => setZoneForm({...zoneForm, zone_code: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Zone Name*</label>
                  <input
                    type="text"
                    value={zoneForm.zone_name}
                    onChange={(e) => setZoneForm({...zoneForm, zone_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Origin Country*</label>
                  <input
                    type="text"
                    value={zoneForm.origin_country}
                    onChange={(e) => setZoneForm({...zoneForm, origin_country: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Destination Country*</label>
                  <input
                    type="text"
                    value={zoneForm.destination_country}
                    onChange={(e) => setZoneForm({...zoneForm, destination_country: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Zone Number</label>
                  <input
                    type="number"
                    value={zoneForm.zone_number}
                    onChange={(e) => setZoneForm({...zoneForm, zone_number: parseInt(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Rate Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={zoneForm.rate_multiplier}
                    onChange={(e) => setZoneForm({...zoneForm, rate_multiplier: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowZoneForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedZone ? 'Update' : 'Create'} Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weight Break Form Modal */}
      {showWeightForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedWeight ? 'Edit Weight Break' : 'Add New Weight Break'}</h2>
              <button onClick={() => setShowWeightForm(false)}>×</button>
            </div>
            <form onSubmit={handleWeightSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Break Name*</label>
                  <input
                    type="text"
                    value={weightForm.break_name}
                    onChange={(e) => setWeightForm({...weightForm, break_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Service Type</label>
                  <select
                    value={weightForm.service_type}
                    onChange={(e) => setWeightForm({...weightForm, service_type: e.target.value})}
                  >
                    {serviceTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Weight (kg)*</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightForm.weight_min_kg}
                    onChange={(e) => setWeightForm({...weightForm, weight_min_kg: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Weight (kg)*</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightForm.weight_max_kg}
                    onChange={(e) => setWeightForm({...weightForm, weight_max_kg: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rate per KG ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weightForm.rate_per_kg}
                    onChange={(e) => setWeightForm({...weightForm, rate_per_kg: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Charge ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weightForm.minimum_charge}
                    onChange={(e) => setWeightForm({...weightForm, minimum_charge: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowWeightForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedWeight ? 'Update' : 'Create'} Weight Break
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageFees;