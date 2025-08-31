import React from 'react';
import PropTypes from 'prop-types';
import { Label, Input, Select } from '../../atoms';
import './FormField.scss';

const FormField = ({
  label,
  type = 'text',
  required = false,
  error = false,
  errorMessage,
  helpText,
  id,
  className = '',
  labelProps = {},
  inputProps = {},
  selectProps = {},
  options = [],
  ...props
}) => {
  const baseClass = 'form-field';
  const classes = [
    baseClass,
    error && `${baseClass}--error`,
    className
  ].filter(Boolean).join(' ');

  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  const isSelect = type === 'select';
  const InputComponent = isSelect ? Select : Input;
  const componentProps = isSelect ? selectProps : inputProps;

  return (
    <div className={classes}>
      {label && (
        <Label 
          htmlFor={fieldId}
          required={required}
          {...labelProps}
        >
          {label}
        </Label>
      )}
      
      <InputComponent
        id={fieldId}
        type={isSelect ? undefined : type}
        error={error}
        errorMessage={errorMessage}
        options={isSelect ? options : undefined}
        aria-describedby={[
          error && errorMessage ? errorId : null,
          helpText ? helpId : null
        ].filter(Boolean).join(' ') || undefined}
        {...componentProps}
        {...props}
      />
      
      {helpText && (
        <span 
          id={helpId}
          className={`${baseClass}__help-text`}
        >
          {helpText}
        </span>
      )}
    </div>
  );
};

FormField.propTypes = {
  label: PropTypes.string,
  type: PropTypes.oneOf([
    'text', 'email', 'password', 'number', 'tel', 'url', 'search', 
    'date', 'time', 'select'
  ]),
  required: PropTypes.bool,
  error: PropTypes.bool,
  errorMessage: PropTypes.string,
  helpText: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.string,
  labelProps: PropTypes.object,
  inputProps: PropTypes.object,
  selectProps: PropTypes.object,
  options: PropTypes.array
};

export default FormField;