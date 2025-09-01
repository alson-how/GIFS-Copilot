/**
 * TradeTermsForm Molecule
 * Form for commercial terms and trade conditions
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Input, Select, Label } from '../../atoms';
import { FormSection } from '../FormSection';
import './TradeTermsForm.scss';

const TradeTermsForm = ({
  currency,
  setCurrency,
  incoterms,
  setIncoterms,
  insuranceRequired,
  setInsuranceRequired,
  shipmentPriority,
  setShipmentPriority,
  getTotalValue,
  disabled = false,
  className = '',
  ...props
}) => {
  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'JPY', label: 'Japanese Yen (JPY)' },
    { value: 'SGD', label: 'Singapore Dollar (SGD)' },
    { value: 'MYR', label: 'Malaysian Ringgit (MYR)' }
  ];

  const incotermsOptions = [
    { value: 'FOB', label: 'FOB - Free On Board' },
    { value: 'CIF', label: 'CIF - Cost Insurance and Freight' },
    { value: 'CFR', label: 'CFR - Cost and Freight' },
    { value: 'EXW', label: 'EXW - Ex Works' },
    { value: 'DAP', label: 'DAP - Delivered At Place' },
    { value: 'DDP', label: 'DDP - Delivered Duty Paid' }
  ];

  const priorityOptions = [
    { value: 'Standard', label: 'Standard' },
    { value: 'Express', label: 'Express' },
    { value: 'Urgent', label: 'Urgent' }
  ];

  const totalValue = getTotalValue ? getTotalValue() : 0;
  const isHighValue = totalValue > 100000;

  return (
    <FormSection
      title="Trade Terms & Commercial"
      icon="💰"
      required={false}
      className={`trade-terms-form ${className}`}
      {...props}
    >
      <div className="trade-terms-form__content">
        <div className="trade-terms-form__row">
          <div className="trade-terms-form__field">
            <Label htmlFor="currency" required>
              Currency
            </Label>
            <Select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={currencies}
              disabled={disabled}
              required
            />
          </div>

          <div className="trade-terms-form__field">
            <Label htmlFor="incoterms" required>
              Incoterms
            </Label>
            <Select
              id="incoterms"
              value={incoterms}
              onChange={(e) => setIncoterms(e.target.value)}
              options={incotermsOptions}
              disabled={disabled}
              required
            />
          </div>
        </div>

        <div className="trade-terms-form__row">
          <div className="trade-terms-form__field">
            <Label htmlFor="shipment-priority">
              Shipment Priority
            </Label>
            <Select
              id="shipment-priority"
              value={shipmentPriority}
              onChange={(e) => setShipmentPriority(e.target.value)}
              options={priorityOptions}
              disabled={disabled}
            />
          </div>

          <div className="trade-terms-form__field">
            <div className="trade-terms-form__checkbox-group">
              <label className="trade-terms-form__checkbox-label">
                <input
                  type="checkbox"
                  checked={insuranceRequired}
                  onChange={(e) => setInsuranceRequired(e.target.checked)}
                  disabled={disabled}
                  className="trade-terms-form__checkbox"
                />
                <span className="trade-terms-form__checkbox-text">
                  Insurance Required
                </span>
              </label>
              {isHighValue && (
                <div className="trade-terms-form__insurance-note">
                  📊 High-value shipment (${(totalValue / 1000).toFixed(0)}K) - insurance recommended
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FormSection>
  );
};

TradeTermsForm.propTypes = {
  /** Currency value */
  currency: PropTypes.string.isRequired,
  /** Function to update currency */
  setCurrency: PropTypes.func.isRequired,
  /** Incoterms value */
  incoterms: PropTypes.string.isRequired,
  /** Function to update incoterms */
  setIncoterms: PropTypes.func.isRequired,
  /** Insurance required boolean */
  insuranceRequired: PropTypes.bool.isRequired,
  /** Function to update insurance requirement */
  setInsuranceRequired: PropTypes.func.isRequired,
  /** Shipment priority value */
  shipmentPriority: PropTypes.string.isRequired,
  /** Function to update shipment priority */
  setShipmentPriority: PropTypes.func.isRequired,
  /** Function to calculate total shipment value */
  getTotalValue: PropTypes.func,
  /** Whether the form is disabled */
  disabled: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string
};

export default TradeTermsForm;