import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../../atoms';
import Button from '../../atoms/Button/Button';
import CountrySelector from '../../atoms/CountrySelector/CountrySelector';
import StateSelector from '../../atoms/StateSelector/StateSelector';
import PostcodeInput from '../../atoms/PostcodeInput/PostcodeInput';
import AddressFormField from '../../molecules/AddressFormField/AddressFormField';
import AddressTypeToggle from '../../molecules/AddressTypeToggle/AddressTypeToggle';
import AddressValidationStatus from '../../molecules/AddressValidationStatus/AddressValidationStatus';
import './AddressForm.scss';

const AddressForm = ({
  address = null,
  onSubmit,
  onCancel,
  isLoading = false,
  errors = {},
  showValidation = true,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    label: '',
    addressLine1: '',
    addressLine2: '',
    postcode: '',
    city: '',
    state: '',
    country: '',
    isDefault: false,
    isBillingAddress: false,
    isShippingAddress: true,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    latitude: null,
    longitude: null
  });

  const [validationState, setValidationState] = useState({
    isValidated: null,
    isValidating: false,
    message: ''
  });

  const [touchedFields, setTouchedFields] = useState({});

  // Initialize form data when address prop changes
  useEffect(() => {
    if (address) {
      setFormData({
        label: address.label || '',
        addressLine1: address.address_line_1 || '',
        addressLine2: address.address_line_2 || '',
        postcode: address.postcode || '',
        city: address.city || '',
        state: address.state || '',
        country: address.country || '',
        isDefault: address.is_default || false,
        isBillingAddress: address.is_billing_address || false,
        isShippingAddress: address.is_shipping_address || true,
        contactName: address.contact_name || '',
        contactPhone: address.contact_phone || '',
        contactEmail: address.contact_email || '',
        latitude: address.latitude || null,
        longitude: address.longitude || null
      });
    }
  }, [address]);

  const baseClass = 'address-form';
  const classes = [
    baseClass,
    isLoading && `${baseClass}--loading`,
    className
  ].filter(Boolean).join(' ');

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Mark field as touched
    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));

    // Reset validation when address changes
    if (['addressLine1', 'city', 'state', 'postcode', 'country'].includes(field)) {
      setValidationState({
        isValidated: null,
        isValidating: false,
        message: ''
      });
    }
  };

  const handleAddressTypeChange = (isShipping, isBilling) => {
    setFormData(prev => ({
      ...prev,
      isShippingAddress: isShipping,
      isBillingAddress: isBilling
    }));
  };

  const handleValidateAddress = async () => {
    if (!formData.postcode || !formData.city || !formData.state || !formData.country) {
      setValidationState({
        isValidated: false,
        isValidating: false,
        message: 'Please fill in all required address fields before validation'
      });
      return;
    }

    setValidationState({
      isValidated: null,
      isValidating: true,
      message: 'Validating address...'
    });

    try {
      // Mock validation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful validation
      setValidationState({
        isValidated: true,
        isValidating: false,
        message: 'Address verified successfully'
      });
    } catch (error) {
      setValidationState({
        isValidated: false,
        isValidating: false,
        message: 'Address validation failed. Please check your address details.'
      });
    }
  };

  const validateForm = () => {
    const formErrors = {};

    if (!formData.label.trim()) {
      formErrors.label = 'Address label is required';
    }

    if (!formData.addressLine1.trim()) {
      formErrors.addressLine1 = 'Address line 1 is required';
    }

    if (!formData.postcode.trim()) {
      formErrors.postcode = 'Postcode is required';
    }

    if (!formData.city.trim()) {
      formErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      formErrors.state = 'State/Province is required';
    }

    if (!formData.country) {
      formErrors.country = 'Country is required';
    }

    if (!formData.isShippingAddress && !formData.isBillingAddress) {
      formErrors.addressType = 'Please select at least one address type';
    }

    if (formData.contactEmail && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.contactEmail)) {
      formErrors.contactEmail = 'Please enter a valid email address';
    }

    return formErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    const hasErrors = Object.keys(formErrors).length > 0;

    if (hasErrors) {
      // Mark all fields as touched to show errors
      const allFieldsTouched = {};
      Object.keys(formData).forEach(key => {
        allFieldsTouched[key] = true;
      });
      setTouchedFields(allFieldsTouched);
      return;
    }

    onSubmit(formData);
  };

  const getFieldError = (field) => {
    return (touchedFields[field] || errors[field]) ? (errors[field] || '') : null;
  };

  return (
    <form className={classes} onSubmit={handleSubmit} noValidate>
      <div className={`${baseClass}__header`}>
        <h2 className={`${baseClass}__title`}>
          {address ? 'Edit Address' : 'Add New Address'}
        </h2>
        <p className={`${baseClass}__subtitle`}>
          {address ? 'Update your address information' : 'Enter your address details below'}
        </p>
      </div>

      <div className={`${baseClass}__sections`}>
        {/* Basic Information */}
        <section className={`${baseClass}__section`}>
          <h3 className={`${baseClass}__section-title`}>Basic Information</h3>
          
          <div className={`${baseClass}__fields`}>
            <AddressFormField
              label="Address Label"
              required
              error={getFieldError('label')}
              helpText="e.g., Home, Office, Warehouse"
            >
              <Input
                value={formData.label}
                onChange={(e) => handleFieldChange('label', e.target.value)}
                placeholder="Enter address label"
                disabled={isLoading}
              />
            </AddressFormField>

            <AddressFormField
              label="Address Line 1"
              required
              error={getFieldError('addressLine1')}
              helpText="Street number and name"
            >
              <Input
                value={formData.addressLine1}
                onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                placeholder="123 Main Street"
                disabled={isLoading}
              />
            </AddressFormField>

            <AddressFormField
              label="Address Line 2"
              error={getFieldError('addressLine2')}
              helpText="Apartment, suite, unit, etc. (optional)"
            >
              <Input
                value={formData.addressLine2}
                onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
                placeholder="Apartment, suite, etc."
                disabled={isLoading}
              />
            </AddressFormField>
          </div>
        </section>

        {/* Location Information */}
        <section className={`${baseClass}__section`}>
          <h3 className={`${baseClass}__section-title`}>Location</h3>
          
          <div className={`${baseClass}__fields ${baseClass}__fields--location`}>
            <AddressFormField
              label="Country"
              required
              error={getFieldError('country')}
            >
              <CountrySelector
                value={formData.country}
                onChange={(value) => handleFieldChange('country', value)}
                disabled={isLoading}
              />
            </AddressFormField>

            <AddressFormField
              label="State/Province"
              required
              error={getFieldError('state')}
            >
              <StateSelector
                country={formData.country}
                value={formData.state}
                onChange={(value) => handleFieldChange('state', value)}
                disabled={isLoading}
              />
            </AddressFormField>

            <AddressFormField
              label="City"
              required
              error={getFieldError('city')}
            >
              <Input
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder="Enter city"
                disabled={isLoading}
              />
            </AddressFormField>

            <AddressFormField
              label="Postcode"
              required
              error={getFieldError('postcode')}
            >
              <PostcodeInput
                country={formData.country}
                value={formData.postcode}
                onChange={(value) => handleFieldChange('postcode', value)}
                disabled={isLoading}
              />
            </AddressFormField>
          </div>

          {showValidation && (
            <div className={`${baseClass}__validation`}>
              <AddressValidationStatus
                isValidated={validationState.isValidated}
                isValidating={validationState.isValidating}
                validationMessage={validationState.message}
                onValidate={handleValidateAddress}
                variant="card"
              />
            </div>
          )}
        </section>

        {/* Contact Information */}
        <section className={`${baseClass}__section`}>
          <h3 className={`${baseClass}__section-title`}>Contact Information (Optional)</h3>
          
          <div className={`${baseClass}__fields`}>
            <AddressFormField
              label="Contact Name"
              error={getFieldError('contactName')}
            >
              <Input
                value={formData.contactName}
                onChange={(e) => handleFieldChange('contactName', e.target.value)}
                placeholder="Contact person name"
                disabled={isLoading}
              />
            </AddressFormField>

            <AddressFormField
              label="Contact Phone"
              error={getFieldError('contactPhone')}
            >
              <Input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
                placeholder="+60123456789"
                disabled={isLoading}
              />
            </AddressFormField>

            <AddressFormField
              label="Contact Email"
              error={getFieldError('contactEmail')}
            >
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                placeholder="contact@example.com"
                disabled={isLoading}
              />
            </AddressFormField>
          </div>
        </section>

        {/* Address Type */}
        <section className={`${baseClass}__section`}>
          <div className={`${baseClass}__address-type`}>
            <AddressTypeToggle
              isShippingAddress={formData.isShippingAddress}
              isBillingAddress={formData.isBillingAddress}
              onChange={handleAddressTypeChange}
              disabled={isLoading}
            />
            {getFieldError('addressType') && (
              <div className={`${baseClass}__error`} role="alert">
                {getFieldError('addressType')}
              </div>
            )}
          </div>
        </section>

        {/* Default Address Toggle */}
        <section className={`${baseClass}__section`}>
          <label className={`${baseClass}__checkbox-field`}>
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
              disabled={isLoading}
              className={`${baseClass}__checkbox`}
            />
            <span className={`${baseClass}__checkbox-label`}>
              Set as default address
            </span>
            <small className={`${baseClass}__checkbox-help`}>
              This will be used as your primary address for new shipments
            </small>
          </label>
        </section>
      </div>

      {/* Form Actions */}
      <div className={`${baseClass}__actions`}>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className={`${baseClass}__cancel-button`}
          >
            Cancel
          </Button>
        )}
        
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          className={`${baseClass}__submit-button`}
        >
          {address ? 'Update Address' : 'Save Address'}
        </Button>
      </div>
    </form>
  );
};

AddressForm.propTypes = {
  address: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  isLoading: PropTypes.bool,
  errors: PropTypes.object,
  showValidation: PropTypes.bool,
  className: PropTypes.string
};

export default AddressForm;