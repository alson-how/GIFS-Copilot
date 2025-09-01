/**
 * Quote Generation Modal Component
 * Modal for generating quotes with carrier rate comparison
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button } from '../../atoms/Button/Button';
import { LoadingSpinner } from '../../atoms/LoadingSpinner/LoadingSpinner';
import { ErrorMessage } from '../../atoms/ErrorMessage/ErrorMessage';
import { FormField } from '../../molecules/FormField/FormField';
import { FormSection } from '../../molecules/FormSection/FormSection';
import './QuoteGenerationModal.scss';

const QuoteGenerationModal = ({ 
  shipment, 
  onQuoteGenerated, 
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [carrierRates, setCarrierRates] = useState([]);
  const [quoteOptions, setQuoteOptions] = useState({
    marginPercentage: 15,
    validityHours: 72,
    currency: 'USD',
    handlingFee: 25,
    documentationFee: 15,
    insuranceRate: 0.5,
    notes: ''
  });

  // Load carrier rates on mount
  useEffect(() => {
    loadCarrierRates();
  }, [shipment]);

  const loadCarrierRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/quotes/carriers/rates?' + new URLSearchParams({
        origin: shipment.origin || 'Malaysia',
        destination: shipment.destination || 'Singapore',
        weight: shipment.package_weight_kg || '1'
      }), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load carrier rates');
      }

      const data = await response.json();
      setCarrierRates(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load carrier rates:', err);
    } finally {
      setLoading(false);
    }
  }, [shipment]);

  const handleOptionChange = useCallback((field, value) => {
    setQuoteOptions(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const calculateTotalCost = useCallback(() => {
    if (carrierRates.length === 0) return 0;
    
    const baseRate = Math.min(...carrierRates.map(rate => rate.total_cost));
    const additionalFees = quoteOptions.handlingFee + quoteOptions.documentationFee;
    const insuranceFee = shipment.estimated_value ? 
      (shipment.estimated_value * quoteOptions.insuranceRate / 100) : 0;
    
    const totalBeforeMargin = baseRate + additionalFees + insuranceFee;
    const totalCost = totalBeforeMargin * (1 + quoteOptions.marginPercentage / 100);
    
    return Math.round(totalCost * 100) / 100;
  }, [carrierRates, quoteOptions, shipment.estimated_value]);

  const handleGenerateQuote = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/quotes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          shipmentId: shipment.shipment_id,
          options: quoteOptions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate quote');
      }

      const data = await response.json();
      onQuoteGenerated(data.data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to generate quote:', err);
    } finally {
      setLoading(false);
    }
  }, [shipment.shipment_id, quoteOptions, onQuoteGenerated]);

  const totalCost = calculateTotalCost();

  return (
    <div className="quote-generation-modal">
      {/* Shipment Info Header */}
      <div className="quote-generation-modal__header">
        <h3>Generate Quote for {shipment.reference || `Shipment #${shipment.shipment_id}`}</h3>
        <div className="quote-generation-modal__shipment-info">
          <p><strong>Customer:</strong> {shipment.customer_name}</p>
          <p><strong>Route:</strong> {shipment.origin} → {shipment.destination}</p>
          <p><strong>Weight:</strong> {shipment.package_weight_kg || 'N/A'} kg</p>
          {shipment.estimated_value && (
            <p><strong>Value:</strong> ${shipment.estimated_value.toLocaleString()}</p>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="quote-generation-modal__loading">
          <LoadingSpinner size="large" />
          <p>Loading carrier rates...</p>
        </div>
      ) : (
        <div className="quote-generation-modal__content">
          {/* Carrier Rate Comparison */}
          <FormSection 
            title="📊 Carrier Rate Comparison"
            description="Compare rates from different carriers"
          >
            <div className="quote-generation-modal__rates-table">
              <div className="quote-generation-modal__rates-header">
                <div>Carrier</div>
                <div>Service</div>
                <div>Transit Days</div>
                <div>Rate/kg</div>
                <div>Total Cost</div>
              </div>
              
              {carrierRates.map((rate, index) => (
                <div key={index} className="quote-generation-modal__rates-row">
                  <div className="quote-generation-modal__carrier">
                    {rate.carrier_name}
                  </div>
                  <div className="quote-generation-modal__service">
                    {rate.service_type}
                  </div>
                  <div className="quote-generation-modal__transit">
                    {rate.transit_days} days
                  </div>
                  <div className="quote-generation-modal__rate">
                    ${rate.rate_per_kg}
                  </div>
                  <div className="quote-generation-modal__cost">
                    ${rate.total_cost}
                  </div>
                </div>
              ))}
            </div>
            
            {carrierRates.length > 0 && (
              <div className="quote-generation-modal__best-rate">
                <strong>Best Rate: ${Math.min(...carrierRates.map(rate => rate.total_cost))}</strong>
              </div>
            )}
          </FormSection>

          {/* Quote Options */}
          <FormSection 
            title="⚙️ Quote Configuration"
            description="Configure margin, fees, and quote validity"
          >
            <div className="quote-generation-modal__options">
              <div className="quote-generation-modal__options-row">
                <FormField
                  label="Margin Percentage (%)"
                  type="number"
                  value={quoteOptions.marginPercentage}
                  onChange={(e) => handleOptionChange('marginPercentage', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                />
                
                <FormField
                  label="Quote Validity (hours)"
                  type="number"
                  value={quoteOptions.validityHours}
                  onChange={(e) => handleOptionChange('validityHours', parseInt(e.target.value))}
                  min="1"
                  max="720"
                />
              </div>

              <div className="quote-generation-modal__options-row">
                <FormField
                  label="Handling Fee ($)"
                  type="number"
                  value={quoteOptions.handlingFee}
                  onChange={(e) => handleOptionChange('handlingFee', parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                />
                
                <FormField
                  label="Documentation Fee ($)"
                  type="number"
                  value={quoteOptions.documentationFee}
                  onChange={(e) => handleOptionChange('documentationFee', parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>

              {shipment.estimated_value && (
                <div className="quote-generation-modal__options-row">
                  <FormField
                    label="Insurance Rate (%)"
                    type="number"
                    value={quoteOptions.insuranceRate}
                    onChange={(e) => handleOptionChange('insuranceRate', parseFloat(e.target.value))}
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>
              )}

              <FormField
                label="Notes"
                type="textarea"
                value={quoteOptions.notes}
                onChange={(e) => handleOptionChange('notes', e.target.value)}
                placeholder="Additional notes for the quote..."
                rows="3"
              />
            </div>
          </FormSection>

          {/* Quote Summary */}
          <FormSection 
            title="💰 Quote Summary"
            description="Final quote calculation"
          >
            <div className="quote-generation-modal__summary">
              <div className="quote-generation-modal__summary-row">
                <span>Base Rate (Best Carrier):</span>
                <span>${carrierRates.length > 0 ? Math.min(...carrierRates.map(rate => rate.total_cost)) : 0}</span>
              </div>
              
              <div className="quote-generation-modal__summary-row">
                <span>Handling Fee:</span>
                <span>${quoteOptions.handlingFee}</span>
              </div>
              
              <div className="quote-generation-modal__summary-row">
                <span>Documentation Fee:</span>
                <span>${quoteOptions.documentationFee}</span>
              </div>
              
              {shipment.estimated_value && (
                <div className="quote-generation-modal__summary-row">
                  <span>Insurance ({quoteOptions.insuranceRate}%):</span>
                  <span>${Math.round(shipment.estimated_value * quoteOptions.insuranceRate / 100 * 100) / 100}</span>
                </div>
              )}
              
              <div className="quote-generation-modal__summary-row">
                <span>Margin ({quoteOptions.marginPercentage}%):</span>
                <span>${Math.round((totalCost - (totalCost / (1 + quoteOptions.marginPercentage / 100))) * 100) / 100}</span>
              </div>
              
              <div className="quote-generation-modal__summary-row quote-generation-modal__summary-total">
                <span><strong>Total Customer Price:</strong></span>
                <span><strong>${totalCost.toLocaleString()}</strong></span>
              </div>
            </div>
          </FormSection>
        </div>
      )}

      {/* Actions */}
      <div className="quote-generation-modal__actions">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        
        <Button
          variant="primary"
          onClick={handleGenerateQuote}
          disabled={loading || carrierRates.length === 0}
        >
          {loading ? <LoadingSpinner size="small" /> : 'Generate & Send Quote'}
        </Button>
      </div>
    </div>
  );
};

QuoteGenerationModal.propTypes = {
  shipment: PropTypes.object.isRequired,
  onQuoteGenerated: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default QuoteGenerationModal;