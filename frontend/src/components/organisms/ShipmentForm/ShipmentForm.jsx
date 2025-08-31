import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useShipmentContext, shipmentActions } from '../../../context';
import { useAsyncOperation, useFormValidation, validators } from '../../../hooks';
import { Card } from '../../molecules';
import { FormField } from '../../molecules';
import { Button } from '../../atoms';
import { postBasics } from '../../../services/api';
import './ShipmentForm.scss';

// Validation schema for shipment form
const validationSchema = {
  exportDate: [
    { validator: validators.required, message: 'Export date is required' }
  ],
  destination: [
    { validator: validators.required, message: 'Destination is required' }
  ],
  endUser: [
    { validator: validators.required, message: 'End user is required' }
  ],
  consigneeRegistration: [
    { validator: validators.required, message: 'Consignee registration is required' }
  ]
};

const ShipmentForm = memo(({ onSaved, className = '' }) => {
  const { state, dispatch } = useShipmentContext();
  const { shipment, productItems } = state;
  const { execute: submitForm, loading: submitting } = useAsyncOperation();
  const {
    errors,
    validateForm,
    getFieldProps,
    resetValidation
  } = useFormValidation(validationSchema);

  const handleFieldChange = useCallback((field, value) => {
    dispatch(shipmentActions.updateShipmentField(field, value));
  }, [dispatch]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const isValid = validateForm(shipment);
    if (!isValid) return;

    try {
      await submitForm(
        () => postBasics({
          ...shipment,
          productItems
        }),
        {
          successMessage: 'Shipment saved successfully',
          onSuccess: (result) => {
            resetValidation();
            onSaved?.(result);
          }
        }
      );
    } catch (error) {
      console.error('Failed to save shipment:', error);
    }
  }, [shipment, productItems, validateForm, submitForm, resetValidation, onSaved]);

  const resetForm = useCallback(() => {
    dispatch(shipmentActions.resetForm());
    resetValidation();
  }, [dispatch, resetValidation]);

  return (
    <Card className={`shipment-form ${className}`}>
      <form onSubmit={handleSubmit} className="shipment-form__form">
        <div className="shipment-form__header">
          <h2>Shipment Details</h2>
          <p>Enter the basic shipment information</p>
        </div>

        <div className="shipment-form__fields">
          <div className="shipment-form__row">
            <FormField
              label="Shipment ID"
              value={shipment.shipmentId}
              disabled
              className="shipment-form__field--readonly"
            />
            
            <FormField
              label="Export Date"
              type="date"
              value={shipment.exportDate}
              onChange={(e) => handleFieldChange('exportDate', e.target.value)}
              required
              {...getFieldProps('exportDate')}
            />
          </div>

          <div className="shipment-form__row">
            <FormField
              label="Transportation Mode"
              type="select"
              value={shipment.mode}
              onChange={(e) => handleFieldChange('mode', e.target.value)}
              options={[
                { value: 'air', label: 'Air Freight' },
                { value: 'sea', label: 'Sea Freight' },
                { value: 'land', label: 'Land Transport' },
                { value: 'express', label: 'Express Courier' }
              ]}
            />
            
            <FormField
              label="Destination Country"
              type="select"
              value={shipment.destination}
              onChange={(e) => handleFieldChange('destination', e.target.value)}
              required
              options={[
                { value: 'China', label: 'China' },
                { value: 'USA', label: 'United States' },
                { value: 'Germany', label: 'Germany' },
                { value: 'Japan', label: 'Japan' },
                { value: 'South Korea', label: 'South Korea' },
                { value: 'Taiwan', label: 'Taiwan' },
                { value: 'Singapore', label: 'Singapore' }
              ]}
              {...getFieldProps('destination')}
            />
          </div>

          <div className="shipment-form__row">
            <FormField
              label="End User"
              value={shipment.endUser}
              onChange={(e) => handleFieldChange('endUser', e.target.value)}
              placeholder="Company or organization name"
              required
              {...getFieldProps('endUser')}
            />
            
            <FormField
              label="Consignee Registration"
              value={shipment.consigneeRegistration}
              onChange={(e) => handleFieldChange('consigneeRegistration', e.target.value)}
              placeholder="Registration number or ID"
              required
              {...getFieldProps('consigneeRegistration')}
            />
          </div>

          <div className="shipment-form__row">
            <FormField
              label="Currency"
              type="select"
              value={shipment.currency}
              onChange={(e) => handleFieldChange('currency', e.target.value)}
              options={[
                { value: 'USD', label: 'USD - US Dollar' },
                { value: 'EUR', label: 'EUR - Euro' },
                { value: 'GBP', label: 'GBP - British Pound' },
                { value: 'JPY', label: 'JPY - Japanese Yen' },
                { value: 'CNY', label: 'CNY - Chinese Yuan' },
                { value: 'SGD', label: 'SGD - Singapore Dollar' }
              ]}
            />
            
            <FormField
              label="Incoterms"
              type="select"
              value={shipment.incoterms}
              onChange={(e) => handleFieldChange('incoterms', e.target.value)}
              options={[
                { value: 'FOB', label: 'FOB - Free On Board' },
                { value: 'CIF', label: 'CIF - Cost, Insurance & Freight' },
                { value: 'EXW', label: 'EXW - Ex Works' },
                { value: 'DDP', label: 'DDP - Delivered Duty Paid' },
                { value: 'CPT', label: 'CPT - Carriage Paid To' },
                { value: 'DAP', label: 'DAP - Delivered At Place' }
              ]}
            />
          </div>

          <div className="shipment-form__row">
            <FormField
              label="Shipment Priority"
              type="select"
              value={shipment.shipmentPriority}
              onChange={(e) => handleFieldChange('shipmentPriority', e.target.value)}
              options={[
                { value: 'Standard', label: 'Standard' },
                { value: 'Urgent', label: 'Urgent' },
                { value: 'Critical', label: 'Critical' }
              ]}
            />
          </div>
        </div>

        <div className="shipment-form__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={resetForm}
            disabled={submitting}
          >
            Reset Form
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting}
          >
            Save Shipment
          </Button>
        </div>
      </form>
    </Card>
  );
});

ShipmentForm.displayName = 'ShipmentForm';

ShipmentForm.propTypes = {
  onSaved: PropTypes.func,
  className: PropTypes.string
};

export default ShipmentForm;