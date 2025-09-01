/**
 * Address Integration Hook
 * Provides reusable address management functionality for shipment forms
 */

import { useState, useCallback } from 'react';
import { AddressService } from '../services/addressService';

export const useAddressIntegration = () => {
  const [selectedOriginAddress, setSelectedOriginAddress] = useState(null);
  const [selectedDestinationAddress, setSelectedDestinationAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load addresses from API
  const loadAddresses = useCallback(async (type = null) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AddressService.getAddresses({ 
        type,
        limit: 100 
      });

      if (response.success) {
        setAddresses(response.addresses || []);
        return response.addresses || [];
      } else {
        setError(response.error || 'Failed to load addresses');
        return [];
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle origin address selection
  const handleOriginAddressChange = useCallback((address) => {
    setSelectedOriginAddress(address);
    return address;
  }, []);

  // Handle destination address selection
  const handleDestinationAddressChange = useCallback((address) => {
    setSelectedDestinationAddress(address);
    return address;
  }, []);

  // Convert address object to form fields
  const addressToFormFields = useCallback((address, prefix = '') => {
    if (!address) return {};

    const fields = {};
    const fieldPrefix = prefix ? `${prefix}_` : '';

    // Basic address fields
    fields[`${fieldPrefix}address_line_1`] = address.line1 || '';
    fields[`${fieldPrefix}address_line_2`] = address.line2 || '';
    fields[`${fieldPrefix}city`] = address.city || '';
    fields[`${fieldPrefix}state`] = address.state || '';
    fields[`${fieldPrefix}postcode`] = address.postcode || '';
    fields[`${fieldPrefix}country`] = address.country || '';

    // Contact fields
    fields[`${fieldPrefix}contact_name`] = address.contact_name || '';
    fields[`${fieldPrefix}contact_phone`] = address.contact_phone || '';
    fields[`${fieldPrefix}contact_email`] = address.contact_email || '';

    // Company fields
    fields[`${fieldPrefix}company_name`] = address.company_name || '';
    fields[`${fieldPrefix}company_registration`] = address.company_registration || '';

    // Formatted address string for simple text fields
    fields[`${fieldPrefix}full_address`] = formatAddress(address);
    
    return fields;
  }, []);

  // Format address for display
  const formatAddress = useCallback((address) => {
    if (!address) return '';

    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postcode,
      address.country
    ].filter(Boolean);

    return parts.join(', ');
  }, []);

  // Create new address from form data
  const createAddressFromForm = useCallback(async (formData, type = 'shipping') => {
    try {
      const addressData = {
        label: formData.label || `${type} Address`,
        line1: formData.line1 || formData.address_line_1,
        line2: formData.line2 || formData.address_line_2,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        company_name: formData.company_name,
        company_registration: formData.company_registration,
        type,
        notes: formData.notes || formData.instructions
      };

      const response = await AddressService.createAddress(addressData);
      
      if (response.success) {
        // Reload addresses to include the new one
        await loadAddresses();
        return response.address;
      } else {
        throw new Error(response.error || 'Failed to create address');
      }
    } catch (err) {
      console.error('Failed to create address:', err);
      throw err;
    }
  }, [loadAddresses]);

  // Get suggested addresses based on form data
  const getSuggestedAddresses = useCallback((formData, type = null) => {
    return addresses.filter(address => {
      // Filter by type if specified
      if (type && address.type !== type) return false;

      // Match against form data
      const matchFields = [
        'city', 'state', 'country', 'company_name', 'contact_name'
      ];

      return matchFields.some(field => {
        const addressValue = address[field]?.toLowerCase() || '';
        const formValue = formData[field]?.toLowerCase() || '';
        return addressValue && formValue && addressValue.includes(formValue);
      });
    });
  }, [addresses]);

  // Validation for address completeness
  const validateAddress = useCallback((address) => {
    const errors = {};

    if (!address.line1) errors.line1 = 'Address line 1 is required';
    if (!address.city) errors.city = 'City is required';
    if (!address.state) errors.state = 'State is required';
    if (!address.postcode) errors.postcode = 'Postcode is required';
    if (!address.country) errors.country = 'Country is required';

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setSelectedOriginAddress(null);
    setSelectedDestinationAddress(null);
    setAddresses([]);
    setError(null);
  }, []);

  return {
    // State
    selectedOriginAddress,
    selectedDestinationAddress,
    addresses,
    loading,
    error,

    // Actions
    loadAddresses,
    handleOriginAddressChange,
    handleDestinationAddressChange,
    createAddressFromForm,
    reset,

    // Utilities
    addressToFormFields,
    formatAddress,
    getSuggestedAddresses,
    validateAddress,

    // Setters for direct control
    setSelectedOriginAddress,
    setSelectedDestinationAddress,
    setAddresses,
    setError
  };
};

export default useAddressIntegration;