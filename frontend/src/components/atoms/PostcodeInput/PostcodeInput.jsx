import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './PostcodeInput.scss';

// Postcode formats by country
const POSTCODE_FORMATS = {
  MY: { 
    pattern: /^\d{5}$/,
    example: '50000',
    hint: '5 digits (e.g., 50000)'
  },
  SG: { 
    pattern: /^\d{6}$/,
    example: '238863',
    hint: '6 digits (e.g., 238863)'
  },
  US: { 
    pattern: /^\d{5}(-\d{4})?$/,
    example: '12345 or 12345-6789',
    hint: '5 digits or 5+4 format (e.g., 12345-6789)'
  },
  GB: { 
    pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
    example: 'SW1A 1AA',
    hint: 'UK format (e.g., SW1A 1AA)'
  },
  CA: { 
    pattern: /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i,
    example: 'K1A 0A6',
    hint: 'Canadian format (e.g., K1A 0A6)'
  },
  AU: { 
    pattern: /^\d{4}$/,
    example: '2000',
    hint: '4 digits (e.g., 2000)'
  },
  DE: { 
    pattern: /^\d{5}$/,
    example: '10115',
    hint: '5 digits (e.g., 10115)'
  },
  FR: { 
    pattern: /^\d{5}$/,
    example: '75001',
    hint: '5 digits (e.g., 75001)'
  },
  JP: { 
    pattern: /^\d{3}-\d{4}$/,
    example: '100-0001',
    hint: 'Format: 123-4567'
  },
  KR: { 
    pattern: /^\d{5}$/,
    example: '06292',
    hint: '5 digits (e.g., 06292)'
  },
  CN: { 
    pattern: /^\d{6}$/,
    example: '100000',
    hint: '6 digits (e.g., 100000)'
  },
  IN: { 
    pattern: /^\d{6}$/,
    example: '110001',
    hint: '6 digits (e.g., 110001)'
  },
  NL: { 
    pattern: /^\d{4}\s*[A-Z]{2}$/i,
    example: '1012 AB',
    hint: '4 digits + 2 letters (e.g., 1012 AB)'
  }
};

const PostcodeInput = ({ 
  country = '', 
  value = '', 
  onChange, 
  error = null,
  placeholder,
  disabled = false,
  className = '',
  required = false,
  showHint = true,
  onValidationChange
}) => {
  const [isValid, setIsValid] = useState(null);
  const [hint, setHint] = useState('');
  
  const formatInfo = POSTCODE_FORMATS[country];
  const defaultPlaceholder = formatInfo ? formatInfo.example : 'Enter postcode';
  
  useEffect(() => {
    if (formatInfo) {
      setHint(formatInfo.hint);
    } else {
      setHint('Enter postcode/ZIP code');
    }
  }, [country, formatInfo]);

  useEffect(() => {
    if (!value || !formatInfo) {
      setIsValid(null);
      onValidationChange?.(null);
      return;
    }
    
    const valid = formatInfo.pattern.test(value.trim());
    setIsValid(valid);
    onValidationChange?.(valid);
  }, [value, formatInfo, onValidationChange]);

  const baseClass = 'postcode-input';
  const classes = [
    baseClass,
    error && `${baseClass}--error`,
    disabled && `${baseClass}--disabled`,
    isValid === true && `${baseClass}--valid`,
    isValid === false && `${baseClass}--invalid`,
    className
  ].filter(Boolean).join(' ');

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Auto-format for specific countries
    let formattedValue = newValue;
    
    if (formatInfo && country === 'US' && newValue.length === 5 && /^\d{5}$/.test(newValue)) {
      // Don't auto-add hyphen for US ZIP codes, let user decide
    } else if (formatInfo && country === 'GB') {
      // Auto-format UK postcodes
      formattedValue = newValue.toUpperCase();
    } else if (formatInfo && country === 'CA') {
      // Auto-format Canadian postal codes
      formattedValue = newValue.toUpperCase().replace(/(.{3})(.{3})/, '$1 $2');
    } else if (formatInfo && country === 'NL') {
      // Auto-format Dutch postal codes
      const digits = newValue.replace(/\D/g, '');
      const letters = newValue.replace(/\d/g, '').toUpperCase();
      if (digits.length <= 4 && letters.length <= 2) {
        formattedValue = digits + (letters ? ' ' + letters : '');
      }
    }
    
    onChange(formattedValue);
  };

  const getValidationIcon = () => {
    if (isValid === true) {
      return (
        <svg className={`${baseClass}__icon ${baseClass}__icon--valid`} width="16" height="16" viewBox="0 0 16 16">
          <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    } else if (isValid === false) {
      return (
        <svg className={`${baseClass}__icon ${baseClass}__icon--invalid`} width="16" height="16" viewBox="0 0 16 16">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className={classes}>
      <div className={`${baseClass}__input-wrapper`}>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder || defaultPlaceholder}
          disabled={disabled}
          className={`${baseClass}__input`}
          required={required}
          aria-invalid={!!error || isValid === false}
          aria-describedby={showHint ? `${baseClass}__hint` : undefined}
        />
        {getValidationIcon()}
      </div>
      
      {showHint && hint && (
        <div 
          id={`${baseClass}__hint`}
          className={`${baseClass}__hint`}
        >
          {hint}
        </div>
      )}
      
      {error && (
        <div className={`${baseClass}__error`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

PostcodeInput.propTypes = {
  country: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  required: PropTypes.bool,
  showHint: PropTypes.bool,
  onValidationChange: PropTypes.func
};

export default PostcodeInput;