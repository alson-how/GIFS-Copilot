import React from 'react';
import PropTypes from 'prop-types';
import './AddressLabel.scss';

const AddressLabel = ({ 
  label, 
  isDefault = false, 
  color = 'primary',
  size = 'medium',
  className = '' 
}) => {
  const baseClass = 'address-label';
  const classes = [
    baseClass,
    `${baseClass}--${color}`,
    `${baseClass}--${size}`,
    isDefault && `${baseClass}--default`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <span className={`${baseClass}__text`}>
        {label}
      </span>
      {isDefault && (
        <span className={`${baseClass}__badge`} aria-label="Default address">
          ★
        </span>
      )}
    </div>
  );
};

AddressLabel.propTypes = {
  label: PropTypes.string.isRequired,
  isDefault: PropTypes.bool,
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string
};

export default AddressLabel;