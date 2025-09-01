/**
 * Address Selector Component
 * Allows users to select from saved addresses or enter new address
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AddressService } from '../../../services/addressService.js';
import Button from '../../atoms/Button/Button.jsx';
import LoadingSpinner from '../../atoms/LoadingSpinner/LoadingSpinner.jsx';
import ErrorMessage from '../../atoms/ErrorMessage/ErrorMessage.jsx';
import AddressIcon from '../../atoms/AddressIcon/AddressIcon.jsx';
import DefaultAddressBadge from '../DefaultAddressBadge/DefaultAddressBadge.jsx';
import './AddressSelector.scss';

const AddressSelector = ({
  value = null,
  onChange,
  type = 'shipping', // 'shipping' or 'billing'
  label = 'Select Address',
  required = false,
  allowNewAddress = true,
  placeholder = 'Choose a saved address or enter a new one',
  error = null,
  className = ''
}) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Malaysia',
    type: type
  });

  // Load addresses on mount
  useEffect(() => {
    console.log('AddressSelector: Component mounted, loading addresses...');
    loadAddresses();
  }, [type]);

  // Set initial selection if value is provided
  useEffect(() => {
    if (value) {
      if (typeof value === 'object' && value.id) {
        setSelectedAddressId(value.id);
      } else if (typeof value === 'string') {
        setSelectedAddressId(value);
      } else {
        // New address object
        setShowNewAddressForm(true);
        setNewAddress(prev => ({ ...prev, ...value }));
      }
    }
  }, [value]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      console.log('AddressSelector: Loading addresses for type:', type);
      const response = await AddressService.getAddresses({ 
        type: type,
        limit: 50
      });
      
      console.log('AddressSelector: API response:', response);
      
      // Handle multiple response formats
      let addressList = [];
      if (response.success) {
        addressList = response.addresses || response.data?.addresses || response.data || [];
      } else if (response.addresses) {
        addressList = response.addresses;
      } else if (Array.isArray(response)) {
        addressList = response;
      }
      
      console.log('AddressSelector: Processed addresses:', addressList);
      setAddresses(addressList);
      
      if (!response.success && !Array.isArray(response) && !response.addresses) {
        setLoadError(response.error || 'Failed to load addresses');
      }
    } catch (error) {
      console.error('AddressSelector: Failed to load addresses:', error);
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = useCallback((addressId) => {
    console.log('AddressSelector: Selected address ID:', addressId);
    
    if (addressId === '__new__') {
      handleNewAddressToggle();
      return;
    }
    
    const selectedAddress = addresses.find(addr => addr.id === addressId);
    console.log('AddressSelector: Found address:', selectedAddress);
    
    setSelectedAddressId(addressId);
    setShowNewAddressForm(false);
    
    if (selectedAddress && onChange) {
      console.log('AddressSelector: Calling onChange with address:', selectedAddress);
      onChange(selectedAddress);
    } else if (onChange) {
      console.log('AddressSelector: Calling onChange with null (address not found)');
      onChange(null);
    }
  }, [addresses, onChange]);

  const handleNewAddressToggle = useCallback(() => {
    setShowNewAddressForm(!showNewAddressForm);
    setSelectedAddressId(null);
    
    if (!showNewAddressForm) {
      // Opening new address form
      setNewAddress({
        label: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'Malaysia',
        type: type
      });
    }
    
    if (onChange) {
      onChange(null);
    }
  }, [showNewAddressForm, type, onChange]);

  const handleNewAddressChange = useCallback((field, value) => {
    const updatedAddress = { ...newAddress, [field]: value };
    setNewAddress(updatedAddress);
    
    if (onChange) {
      onChange(updatedAddress);
    }
  }, [newAddress, onChange]);

  const formatAddressDisplay = (address) => {
    // Handle both API response format (address_line_1) and component format (line1)
    const line1 = address.address_line_1 || address.line1;
    const line2 = address.address_line_2 || address.line2;
    const parts = [line1, line2, address.city, address.state, address.postcode, address.country];
    return parts.filter(Boolean).join(', ');
  };

  const getDisplayValue = () => {
    if (selectedAddressId) {
      const address = addresses.find(addr => addr.id === selectedAddressId);
      return address ? `${address.label} - ${formatAddressDisplay(address)}` : '';
    }
    
    if (showNewAddressForm && (newAddress.line1 || newAddress.address_line_1)) {
      return `New: ${formatAddressDisplay(newAddress)}`;
    }
    
    return '';
  };

  return (
    <div className={`address-selector ${className}`}>
      <label className="address-selector__label">
        {label}
        {required && <span className="address-selector__required">*</span>}
      </label>

      {/* Address Selection Dropdown */}
      <div className="address-selector__dropdown">
        <select
          value={selectedAddressId || ''}
          onChange={(e) => handleAddressSelect(e.target.value)}
          className="address-selector__select"
          disabled={loading}
        >
          <option value="" disabled>
            {loading ? 'Loading addresses...' : 
             addresses.length === 0 ? 'No addresses found' : 
             placeholder}
          </option>
          {addresses.map(address => (
            <option key={address.id} value={address.id}>
              {address.label} - {formatAddressDisplay(address)}
              {address.is_default && ' (Default)'}
            </option>
          ))}
          {allowNewAddress && (
            <option value="__new__">
              + Add New Address
            </option>
          )}
        </select>

        {/* Toggle New Address Button */}
        {allowNewAddress && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={handleNewAddressToggle}
            className="address-selector__new-btn"
          >
            {showNewAddressForm ? 'Cancel' : '+ New Address'}
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="address-selector__loading">
          <LoadingSpinner size="small" />
          <span>Loading addresses...</span>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <ErrorMessage 
          message={loadError}
          onRetry={loadAddresses}
        />
      )}

      {/* Selected Address Preview */}
      {selectedAddressId && !showNewAddressForm && (
        <div className="address-selector__preview">
          {(() => {
            const address = addresses.find(addr => addr.id === selectedAddressId);
            return address ? (
              <div className="address-selector__address-card">
                <div className="address-selector__address-header">
                  <AddressIcon type={address.type} />
                  <span className="address-selector__address-label">
                    {address.label}
                  </span>
                  {address.is_default && <DefaultAddressBadge />}
                </div>
                <div className="address-selector__address-details">
                  <div>{address.address_line_1 || address.line1}</div>
                  {(address.address_line_2 || address.line2) && <div>{address.address_line_2 || address.line2}</div>}
                  <div>{address.city}, {address.state} {address.postcode}</div>
                  <div>{address.country}</div>
                  {address.contact_name && (
                    <div className="address-selector__contact">
                      Contact: {address.contact_name}
                      {address.contact_phone && ` • ${address.contact_phone}`}
                    </div>
                  )}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* New Address Form */}
      {showNewAddressForm && (
        <div className="address-selector__new-form">
          <div className="address-selector__form-header">
            <h4>Enter New Address</h4>
          </div>
          
          <div className="address-selector__form-row">
            <div className="address-selector__form-field">
              <label>Address Label *</label>
              <input
                type="text"
                value={newAddress.label}
                onChange={(e) => handleNewAddressChange('label', e.target.value)}
                placeholder="e.g., Home, Office, Warehouse"
                required
              />
            </div>
          </div>

          <div className="address-selector__form-row">
            <div className="address-selector__form-field">
              <label>Address Line 1 *</label>
              <input
                type="text"
                value={newAddress.line1}
                onChange={(e) => handleNewAddressChange('line1', e.target.value)}
                placeholder="Street address, building name"
                required
              />
            </div>
          </div>

          <div className="address-selector__form-row">
            <div className="address-selector__form-field">
              <label>Address Line 2</label>
              <input
                type="text"
                value={newAddress.line2}
                onChange={(e) => handleNewAddressChange('line2', e.target.value)}
                placeholder="Unit, floor, apartment (optional)"
              />
            </div>
          </div>

          <div className="address-selector__form-row">
            <div className="address-selector__form-field">
              <label>City *</label>
              <input
                type="text"
                value={newAddress.city}
                onChange={(e) => handleNewAddressChange('city', e.target.value)}
                placeholder="City name"
                required
              />
            </div>
            
            <div className="address-selector__form-field">
              <label>State *</label>
              <select
                value={newAddress.state}
                onChange={(e) => handleNewAddressChange('state', e.target.value)}
                required
              >
                <option value="">Select State</option>
                <option value="Johor">Johor</option>
                <option value="Kedah">Kedah</option>
                <option value="Kelantan">Kelantan</option>
                <option value="Melaka">Melaka</option>
                <option value="Negeri Sembilan">Negeri Sembilan</option>
                <option value="Pahang">Pahang</option>
                <option value="Penang">Penang</option>
                <option value="Perak">Perak</option>
                <option value="Perlis">Perlis</option>
                <option value="Sabah">Sabah</option>
                <option value="Sarawak">Sarawak</option>
                <option value="Selangor">Selangor</option>
                <option value="Terengganu">Terengganu</option>
                <option value="Kuala Lumpur">Kuala Lumpur</option>
                <option value="Labuan">Labuan</option>
                <option value="Putrajaya">Putrajaya</option>
              </select>
            </div>
          </div>

          <div className="address-selector__form-row">
            <div className="address-selector__form-field">
              <label>Postcode *</label>
              <input
                type="text"
                value={newAddress.postcode}
                onChange={(e) => handleNewAddressChange('postcode', e.target.value)}
                placeholder="12345"
                required
              />
            </div>
            
            <div className="address-selector__form-field">
              <label>Country *</label>
              <select
                value={newAddress.country}
                onChange={(e) => handleNewAddressChange('country', e.target.value)}
                required
              >
                <option value="Malaysia">Malaysia</option>
                <option value="Singapore">Singapore</option>
                <option value="Thailand">Thailand</option>
                <option value="Indonesia">Indonesia</option>
              </select>
            </div>
          </div>

          <div className="address-selector__form-note">
            <small>This address will be saved to your address book for future use.</small>
          </div>
        </div>
      )}

      {/* Validation Error */}
      {error && (
        <div className="address-selector__error">
          {error}
        </div>
      )}
    </div>
  );
};

AddressSelector.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  onChange: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['shipping', 'billing']),
  label: PropTypes.string,
  required: PropTypes.bool,
  allowNewAddress: PropTypes.bool,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  className: PropTypes.string
};

export default AddressSelector;