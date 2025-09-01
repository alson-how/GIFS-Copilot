import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '../../atoms';
import './AddressFormField.scss';

const AddressFormField = ({
  label,
  required = false,
  error = null,
  helpText,
  id,
  className = '',
  children,
  ...props
}) => {
  const baseClass = 'address-form-field';
  const classes = [
    baseClass,
    error && `${baseClass}--error`,
    className
  ].filter(Boolean).join(' ');

  const fieldId = id || `address-field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  const enhancedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        id: fieldId,
        error,
        'aria-describedby': [
          error ? errorId : null,
          helpText ? helpId : null
        ].filter(Boolean).join(' ') || undefined,
        ...props
      });
    }
    return child;
  });

  return (
    <div className={classes}>
      {label && (
        <Label 
          htmlFor={fieldId}
          required={required}
          className={`${baseClass}__label`}
        >
          {label}
        </Label>
      )}
      
      <div className={`${baseClass}__input-wrapper`}>
        {enhancedChildren}
      </div>
      
      {helpText && (
        <div 
          id={helpId}
          className={`${baseClass}__help-text`}
        >
          {helpText}
        </div>
      )}
      
      {error && (
        <div 
          id={errorId}
          className={`${baseClass}__error`}
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
};

AddressFormField.propTypes = {
  label: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  helpText: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired
};

export default AddressFormField;