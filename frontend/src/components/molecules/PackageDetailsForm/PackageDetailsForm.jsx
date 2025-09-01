/**
 * Package Details Form Component
 * Handles package dimensions, weight, and special requirements
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormField } from '../FormField/FormField';
import { FormSection } from '../FormSection/FormSection';
import './PackageDetailsForm.scss';

const SPECIAL_HANDLING_OPTIONS = [
  { value: 'FRAGILE', label: '📦 Fragile', description: 'Handle with extra care' },
  { value: 'TEMPERATURE_CONTROLLED', label: '🌡️ Temperature Controlled', description: 'Requires specific temperature' },
  { value: 'HAZARDOUS', label: '⚠️ Hazardous Materials', description: 'Contains dangerous goods' },
  { value: 'HIGH_VALUE', label: '💎 High Value', description: 'Requires special security' },
  { value: 'PERISHABLE', label: '🕐 Perishable', description: 'Time-sensitive goods' }
];

const PackageDetailsForm = ({ 
  packageDetails = {},
  onPackageDetailsChange,
  errors = {},
  className = '' 
}) => {
  const handleDetailChange = useCallback((field, value) => {
    onPackageDetailsChange({
      ...packageDetails,
      [field]: value
    });
  }, [packageDetails, onPackageDetailsChange]);

  const handleSpecialHandlingChange = useCallback((handling, checked) => {
    const currentHandling = packageDetails.specialHandling || [];
    const newHandling = checked
      ? [...currentHandling, handling]
      : currentHandling.filter(h => h !== handling);
    
    handleDetailChange('specialHandling', newHandling);
  }, [packageDetails.specialHandling, handleDetailChange]);

  const isSpecialHandlingSelected = useCallback((handling) => {
    return (packageDetails.specialHandling || []).includes(handling);
  }, [packageDetails.specialHandling]);

  // Calculate volume and estimated weight
  const calculateVolume = () => {
    const { length, width, height } = packageDetails;
    if (length && width && height) {
      return ((parseFloat(length) * parseFloat(width) * parseFloat(height)) / 1000000).toFixed(3);
    }
    return null;
  };

  const volume = calculateVolume();

  return (
    <FormSection 
      title="Package Details"
      description="Provide dimensions, weight, and special handling requirements"
      className={`package-details-form ${className}`}
    >
      <div className="package-details-form__content">
        {/* Pickup Date Range */}
        <div className="package-details-form__section">
          <h4 className="package-details-form__section-title">Preferred Pickup Date</h4>
          <div className="package-details-form__row">
            <FormField
              label="From Date"
              type="date"
              value={packageDetails.pickupDateFrom || ''}
              onChange={(e) => handleDetailChange('pickupDateFrom', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              error={errors.pickupDateFrom}
            />
            
            <FormField
              label="To Date"
              type="date"
              value={packageDetails.pickupDateTo || ''}
              onChange={(e) => handleDetailChange('pickupDateTo', e.target.value)}
              min={packageDetails.pickupDateFrom || new Date().toISOString().split('T')[0]}
              required
              error={errors.pickupDateTo}
            />
          </div>
        </div>

        {/* Package Dimensions */}
        <div className="package-details-form__section">
          <h4 className="package-details-form__section-title">Package Dimensions (cm)</h4>
          <div className="package-details-form__dimensions">
            <FormField
              label="Length (L)"
              type="number"
              value={packageDetails.length || ''}
              onChange={(e) => handleDetailChange('length', e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
              required
              error={errors.length}
            />
            
            <div className="package-details-form__dimension-separator">×</div>
            
            <FormField
              label="Width (W)"
              type="number"
              value={packageDetails.width || ''}
              onChange={(e) => handleDetailChange('width', e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
              required
              error={errors.width}
            />
            
            <div className="package-details-form__dimension-separator">×</div>
            
            <FormField
              label="Height (H)"
              type="number"
              value={packageDetails.height || ''}
              onChange={(e) => handleDetailChange('height', e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
              required
              error={errors.height}
            />
          </div>
          
          {volume && (
            <div className="package-details-form__calculated">
              <span className="package-details-form__calculated-label">Volume:</span>
              <span className="package-details-form__calculated-value">{volume} m³</span>
            </div>
          )}
        </div>

        {/* Weight and Quantity */}
        <div className="package-details-form__section">
          <h4 className="package-details-form__section-title">Weight & Quantity</h4>
          <div className="package-details-form__row">
            <FormField
              label="Total Weight (kg)"
              type="number"
              value={packageDetails.weight || ''}
              onChange={(e) => handleDetailChange('weight', e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.1"
              required
              error={errors.weight}
            />
            
            <FormField
              label="Number of Packages"
              type="number"
              value={packageDetails.numberOfPackages || '1'}
              onChange={(e) => handleDetailChange('numberOfPackages', e.target.value)}
              min="1"
              required
              error={errors.numberOfPackages}
            />
          </div>
        </div>

        {/* Estimated Value */}
        <div className="package-details-form__section">
          <h4 className="package-details-form__section-title">Value Information</h4>
          <div className="package-details-form__row">
            <FormField
              label="Estimated Value (USD)"
              type="number"
              value={packageDetails.estimatedValue || ''}
              onChange={(e) => handleDetailChange('estimatedValue', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              error={errors.estimatedValue}
            />
          </div>
        </div>

        {/* Special Handling Requirements */}
        <div className="package-details-form__section">
          <h4 className="package-details-form__section-title">Special Handling Requirements</h4>
          <div className="package-details-form__special-handling">
            {SPECIAL_HANDLING_OPTIONS.map((option) => (
              <label 
                key={option.value} 
                className={`package-details-form__checkbox-card ${
                  isSpecialHandlingSelected(option.value) ? 'package-details-form__checkbox-card--selected' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSpecialHandlingSelected(option.value)}
                  onChange={(e) => handleSpecialHandlingChange(option.value, e.target.checked)}
                  className="package-details-form__checkbox"
                />
                <div className="package-details-form__checkbox-content">
                  <div className="package-details-form__checkbox-title">
                    {option.label}
                  </div>
                  <div className="package-details-form__checkbox-description">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="package-details-form__section">
          <FormField
            label="Additional Notes"
            type="textarea"
            value={packageDetails.notes || ''}
            onChange={(e) => handleDetailChange('notes', e.target.value)}
            placeholder="Any additional information about your package"
            rows={3}
          />
        </div>
      </div>
    </FormSection>
  );
};

PackageDetailsForm.propTypes = {
  packageDetails: PropTypes.object,
  onPackageDetailsChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  className: PropTypes.string
};

export default PackageDetailsForm;