/**
 * Shipment Address Form Component
 * Integrated address form for shipment origin and destination with address book support
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AddressSelector } from '../../molecules/AddressSelector/AddressSelector';
import { FormSection } from '../../molecules/FormSection/FormSection';
import { Button } from '../../atoms/Button/Button';
import { useAddressIntegration } from '../../../hooks/useAddressIntegration';
import './ShipmentAddressForm.scss';

const ShipmentAddressForm = ({
  originAddress = null,
  destinationAddress = null,
  onOriginChange,
  onDestinationChange,
  errors = {},
  showOrigin = true,
  showDestination = true,
  className = ''
}) => {
  const {
    selectedOriginAddress,
    selectedDestinationAddress,
    handleOriginAddressChange,
    handleDestinationAddressChange,
    loadAddresses,
    formatAddress
  } = useAddressIntegration();

  const [enableAddressBook, setEnableAddressBook] = useState(true);

  // Load addresses on mount
  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Handle origin address selection
  const handleOriginSelect = (address) => {
    const updatedAddress = handleOriginAddressChange(address);
    
    // Convert address to shipment form format and notify parent
    if (onOriginChange) {
      if (address) {
        onOriginChange({
          country: address.country,
          city: address.city,
          state: address.state,
          full_address: formatAddress(address),
          contact_name: address.contact_name,
          contact_phone: address.contact_phone,
          company_name: address.company_name,
          address_id: address.id
        });
      } else {
        onOriginChange(null);
      }
    }
  };

  // Handle destination address selection
  const handleDestinationSelect = (address) => {
    const updatedAddress = handleDestinationAddressChange(address);
    
    // Convert address to shipment form format and notify parent
    if (onDestinationChange) {
      if (address) {
        onDestinationChange({
          country: address.country,
          city: address.city,
          state: address.state,
          full_address: formatAddress(address),
          contact_name: address.contact_name,
          contact_phone: address.contact_phone,
          company_name: address.company_name,
          end_user: address.company_name || address.contact_name || address.label,
          address_id: address.id
        });
      } else {
        onDestinationChange(null);
      }
    }
  };

  return (
    <div className={`shipment-address-form ${className}`}>
      {/* Origin Address Section */}
      {showOrigin && (
        <FormSection 
          title="Origin Address"
          description="Where will we pick up the goods?"
          className="shipment-address-form__section"
        >
          <div className="shipment-address-form__controls">
            {enableAddressBook ? (
              <>
                <AddressSelector
                  value={selectedOriginAddress || originAddress}
                  onChange={handleOriginSelect}
                  type="shipping"
                  label="Pickup Address"
                  required={true}
                  placeholder="Choose a saved pickup address or enter a new one"
                  error={errors.origin}
                  className="shipment-address-form__selector"
                />
                
                <div className="shipment-address-form__toggle">
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => setEnableAddressBook(false)}
                  >
                    Manual Entry
                  </Button>
                </div>
              </>
            ) : (
              <div className="shipment-address-form__manual">
                <p>Manual address entry would go here in integration with existing form fields.</p>
                
                <div className="shipment-address-form__toggle">
                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    onClick={() => setEnableAddressBook(true)}
                  >
                    📍 Use Address Book
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Origin Address Preview */}
          {selectedOriginAddress && (
            <div className="shipment-address-form__preview">
              <h4>Selected Pickup Address:</h4>
              <div className="shipment-address-form__address-card">
                <div className="shipment-address-form__address-label">
                  {selectedOriginAddress.label}
                </div>
                <div className="shipment-address-form__address-details">
                  {formatAddress(selectedOriginAddress)}
                </div>
                {selectedOriginAddress.contact_name && (
                  <div className="shipment-address-form__contact-info">
                    Contact: {selectedOriginAddress.contact_name}
                    {selectedOriginAddress.contact_phone && ` • ${selectedOriginAddress.contact_phone}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* Destination Address Section */}
      {showDestination && (
        <FormSection 
          title="Destination Address"
          description="Where should the goods be delivered?"
          className="shipment-address-form__section"
        >
          <div className="shipment-address-form__controls">
            {enableAddressBook ? (
              <>
                <AddressSelector
                  value={selectedDestinationAddress || destinationAddress}
                  onChange={handleDestinationSelect}
                  type="shipping"
                  label="Delivery Address"
                  required={true}
                  placeholder="Choose a saved delivery address or enter a new one"
                  error={errors.destination}
                  className="shipment-address-form__selector"
                />
              </>
            ) : (
              <div className="shipment-address-form__manual">
                <p>Manual address entry integration goes here.</p>
                
                <div className="shipment-address-form__toggle">
                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    onClick={() => setEnableAddressBook(true)}
                  >
                    📍 Use Address Book
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Destination Address Preview */}
          {selectedDestinationAddress && (
            <div className="shipment-address-form__preview">
              <h4>Selected Delivery Address:</h4>
              <div className="shipment-address-form__address-card">
                <div className="shipment-address-form__address-label">
                  {selectedDestinationAddress.label}
                </div>
                <div className="shipment-address-form__address-details">
                  {formatAddress(selectedDestinationAddress)}
                </div>
                {selectedDestinationAddress.contact_name && (
                  <div className="shipment-address-form__contact-info">
                    Contact: {selectedDestinationAddress.contact_name}
                    {selectedDestinationAddress.contact_phone && ` • ${selectedDestinationAddress.contact_phone}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* Quick Links */}
      <div className="shipment-address-form__quick-links">
        <p>💡 <strong>Tip:</strong> Save frequently used addresses in your <a href="/dashboard/addresses" target="_blank">Address Book</a> for faster shipment creation.</p>
      </div>
    </div>
  );
};

ShipmentAddressForm.propTypes = {
  originAddress: PropTypes.object,
  destinationAddress: PropTypes.object,
  onOriginChange: PropTypes.func,
  onDestinationChange: PropTypes.func,
  errors: PropTypes.object,
  showOrigin: PropTypes.bool,
  showDestination: PropTypes.bool,
  className: PropTypes.string
};

export default ShipmentAddressForm;