/**
 * Pickup Method Form Component
 * Handles pickup method selection and related form fields with address book integration
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormField } from '../FormField/FormField';
import { FormSection } from '../FormSection/FormSection';
import { AddressSelector } from '../AddressSelector/AddressSelector';
import './PickupMethodForm.scss';

const PickupMethodForm = ({ 
  pickupMethod, 
  pickupDetails = {}, 
  warehouses = [],
  onPickupMethodChange, 
  onPickupDetailsChange,
  errors = {},
  className = '',
  enableAddressBook = true
}) => {
  const [selectedMethod, setSelectedMethod] = useState(pickupMethod || 'PICKUP_FROM_LOCATION');
  const [selectedAddress, setSelectedAddress] = useState(null);

  const handleMethodChange = useCallback((method) => {
    setSelectedMethod(method);
    onPickupMethodChange(method);
    
    // Clear pickup details when method changes
    onPickupDetailsChange({});
    setSelectedAddress(null);
  }, [onPickupMethodChange, onPickupDetailsChange]);

  const handleDetailChange = useCallback((field, value) => {
    onPickupDetailsChange({
      ...pickupDetails,
      [field]: value
    });
  }, [pickupDetails, onPickupDetailsChange]);

  const handleAddressSelect = useCallback((address) => {
    setSelectedAddress(address);
    
    if (address) {
      // Convert address to pickup details format
      const addressDetails = {
        address: `${address.line1}${address.line2 ? '\n' + address.line2 : ''}\n${address.city}, ${address.state} ${address.postcode}\n${address.country}`,
        contactPerson: address.contact_name || '',
        phone: address.contact_phone || '',
        instructions: address.notes || '',
        addressId: address.id // Store reference to saved address
      };
      
      onPickupDetailsChange(addressDetails);
    } else {
      // Clear pickup details when no address selected
      onPickupDetailsChange({});
    }
  }, [onPickupDetailsChange]);

  const warehouseOptions = warehouses.map(warehouse => ({
    value: warehouse.id,
    label: `${warehouse.name} - ${warehouse.city}`
  }));

  return (
    <FormSection 
      title="Pickup Method"
      description="Choose how you'll get your goods to us"
      className={`pickup-method-form ${className}`}
    >
      <div className="pickup-method-form__options">
        {/* Pickup Method Selection */}
        <div className="pickup-method-form__radio-group">
          <div className="pickup-method-form__option">
            <label className="pickup-method-form__radio-label">
              <input
                type="radio"
                name="pickupMethod"
                value="PICKUP_FROM_LOCATION"
                checked={selectedMethod === 'PICKUP_FROM_LOCATION'}
                onChange={() => handleMethodChange('PICKUP_FROM_LOCATION')}
                className="pickup-method-form__radio"
              />
              <div className="pickup-method-form__radio-content">
                <div className="pickup-method-form__radio-title">
                  📍 Pickup from my location
                </div>
                <div className="pickup-method-form__radio-description">
                  We'll send a courier to collect from your address
                </div>
              </div>
            </label>
          </div>

          <div className="pickup-method-form__option">
            <label className="pickup-method-form__radio-label">
              <input
                type="radio"
                name="pickupMethod"
                value="DROP_OFF_AT_WAREHOUSE"
                checked={selectedMethod === 'DROP_OFF_AT_WAREHOUSE'}
                onChange={() => handleMethodChange('DROP_OFF_AT_WAREHOUSE')}
                className="pickup-method-form__radio"
              />
              <div className="pickup-method-form__radio-content">
                <div className="pickup-method-form__radio-title">
                  🏢 Drop off at warehouse
                </div>
                <div className="pickup-method-form__radio-description">
                  You'll deliver goods to one of our warehouses
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Conditional Fields Based on Method */}
        {selectedMethod === 'PICKUP_FROM_LOCATION' && (
          <div className="pickup-method-form__pickup-details">
            {/* Address Book Integration */}
            {enableAddressBook && (
              <div className="pickup-method-form__row">
                <AddressSelector
                  value={selectedAddress}
                  onChange={handleAddressSelect}
                  type="shipping"
                  label="Pickup Address"
                  required={true}
                  placeholder="Choose a saved address or enter a new one"
                  error={errors.address}
                  className="pickup-method-form__address-selector"
                />
              </div>
            )}

            {/* Manual Address Entry (fallback or when no address selected) */}
            {(!enableAddressBook || !selectedAddress) && (
              <div className="pickup-method-form__row">
                <FormField
                  label={enableAddressBook ? "Or Enter Address Manually" : "Pickup Address"}
                  type="textarea"
                  value={pickupDetails.address || ''}
                  onChange={(e) => handleDetailChange('address', e.target.value)}
                  placeholder="Enter complete pickup address including postal code"
                  required={!enableAddressBook || !selectedAddress}
                  error={errors.address}
                  rows={3}
                />
              </div>
            )}

            <div className="pickup-method-form__row">
              <FormField
                label="Contact Person"
                value={pickupDetails.contactPerson || ''}
                onChange={(e) => handleDetailChange('contactPerson', e.target.value)}
                placeholder="Full name of contact person"
                required
                error={errors.contactPerson}
              />
              
              <FormField
                label="Contact Phone"
                value={pickupDetails.phone || ''}
                onChange={(e) => handleDetailChange('phone', e.target.value)}
                placeholder="+60123456789"
                required
                error={errors.phone}
              />
            </div>

            <div className="pickup-method-form__row">
              <FormField
                label="Pickup Instructions"
                type="textarea"
                value={pickupDetails.instructions || ''}
                onChange={(e) => handleDetailChange('instructions', e.target.value)}
                placeholder="Special instructions for pickup (e.g., security requirements, access codes, best time to pickup)"
                rows={3}
              />
            </div>
          </div>
        )}

        {selectedMethod === 'DROP_OFF_AT_WAREHOUSE' && (
          <div className="pickup-method-form__warehouse-details">
            <FormField
              label="Select Warehouse"
              type="select"
              value={pickupDetails.warehouseId || ''}
              onChange={(e) => handleDetailChange('warehouseId', e.target.value)}
              options={warehouseOptions}
              placeholder="Choose a warehouse location"
              required
              error={errors.warehouseId}
            />

            {pickupDetails.warehouseId && (
              <div className="pickup-method-form__warehouse-info">
                {(() => {
                  const selectedWarehouse = warehouses.find(w => w.id == pickupDetails.warehouseId);
                  return selectedWarehouse ? (
                    <div className="pickup-method-form__warehouse-details-card">
                      <h4>{selectedWarehouse.name}</h4>
                      <p><strong>Address:</strong> {selectedWarehouse.address}</p>
                      <p><strong>Phone:</strong> {selectedWarehouse.phone}</p>
                      {selectedWarehouse.operating_hours && (
                        <div>
                          <strong>Operating Hours:</strong>
                          <ul>
                            {Object.entries(selectedWarehouse.operating_hours).map(([day, hours]) => (
                              <li key={day}>{day}: {hours}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </FormSection>
  );
};

PickupMethodForm.propTypes = {
  pickupMethod: PropTypes.string,
  pickupDetails: PropTypes.object,
  warehouses: PropTypes.array,
  onPickupMethodChange: PropTypes.func.isRequired,
  onPickupDetailsChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  className: PropTypes.string,
  enableAddressBook: PropTypes.bool
};

export default PickupMethodForm;