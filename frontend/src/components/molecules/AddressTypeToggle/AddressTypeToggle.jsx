import React from 'react';
import PropTypes from 'prop-types';
import AddressIcon from '../../atoms/AddressIcon/AddressIcon';
import './AddressTypeToggle.scss';

const AddressTypeToggle = ({
  isShippingAddress = true,
  isBillingAddress = false,
  onChange,
  disabled = false,
  className = '',
  showIcons = true,
  size = 'medium'
}) => {
  const baseClass = 'address-type-toggle';
  const classes = [
    baseClass,
    `${baseClass}--${size}`,
    disabled && `${baseClass}--disabled`,
    className
  ].filter(Boolean).join(' ');

  const handleShippingChange = (checked) => {
    // Ensure at least one type is always selected
    if (!checked && !isBillingAddress) return;
    onChange(checked, isBillingAddress);
  };

  const handleBillingChange = (checked) => {
    // Ensure at least one type is always selected
    if (!checked && !isShippingAddress) return;
    onChange(isShippingAddress, checked);
  };

  return (
    <div className={classes}>
      <div className={`${baseClass}__header`}>
        <span className={`${baseClass}__title`}>Address Type</span>
        <span className={`${baseClass}__subtitle`}>Select address usage</span>
      </div>
      
      <div className={`${baseClass}__options`}>
        <label 
          className={`${baseClass}__option ${
            isShippingAddress ? `${baseClass}__option--selected` : ''
          }`}
        >
          <input
            type="checkbox"
            checked={isShippingAddress}
            onChange={(e) => handleShippingChange(e.target.checked)}
            disabled={disabled}
            className={`${baseClass}__checkbox`}
            aria-describedby={`${baseClass}__shipping-description`}
          />
          
          <div className={`${baseClass}__option-content`}>
            <div className={`${baseClass}__option-header`}>
              {showIcons && <AddressIcon type="shipping" size="small" />}
              <span className={`${baseClass}__option-title`}>
                Shipping Address
              </span>
            </div>
            <div 
              id={`${baseClass}__shipping-description`}
              className={`${baseClass}__option-description`}
            >
              Use this address to receive shipments
            </div>
          </div>
          
          <div className={`${baseClass}__checkmark`}>
            {isShippingAddress && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </label>
        
        <label 
          className={`${baseClass}__option ${
            isBillingAddress ? `${baseClass}__option--selected` : ''
          }`}
        >
          <input
            type="checkbox"
            checked={isBillingAddress}
            onChange={(e) => handleBillingChange(e.target.checked)}
            disabled={disabled}
            className={`${baseClass}__checkbox`}
            aria-describedby={`${baseClass}__billing-description`}
          />
          
          <div className={`${baseClass}__option-content`}>
            <div className={`${baseClass}__option-header`}>
              {showIcons && <AddressIcon type="billing" size="small" />}
              <span className={`${baseClass}__option-title`}>
                Billing Address
              </span>
            </div>
            <div 
              id={`${baseClass}__billing-description`}
              className={`${baseClass}__option-description`}
            >
              Use this address for invoices and payments
            </div>
          </div>
          
          <div className={`${baseClass}__checkmark`}>
            {isBillingAddress && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </label>
      </div>
      
      {(!isShippingAddress && !isBillingAddress) && (
        <div className={`${baseClass}__warning`} role="alert">
          Please select at least one address type
        </div>
      )}
    </div>
  );
};

AddressTypeToggle.propTypes = {
  isShippingAddress: PropTypes.bool,
  isBillingAddress: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  showIcons: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default AddressTypeToggle;