import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import './Select.scss';

const Select = forwardRef(({
  options = [],
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  error = false,
  errorMessage,
  placeholder,
  size = 'medium',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseClass = 'select';
  const classes = [
    baseClass,
    `${baseClass}--${size}`,
    error && `${baseClass}--error`,
    disabled && `${baseClass}--disabled`,
    fullWidth && `${baseClass}--full-width`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={`${baseClass}-wrapper`}>
      <select
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        className={classes}
        aria-invalid={error}
        aria-describedby={error && errorMessage ? `${baseClass}-error` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          const disabled = typeof option === 'object' ? option.disabled : false;
          
          return (
            <option 
              key={`${optionValue}-${index}`} 
              value={optionValue}
              disabled={disabled}
            >
              {optionLabel}
            </option>
          );
        })}
      </select>
      <div className={`${baseClass}__icon`} aria-hidden="true">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path 
            d="M1 1.5L6 6.5L11 1.5" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error && errorMessage && (
        <span 
          id={`${baseClass}-error`}
          className={`${baseClass}__error-message`}
          role="alert"
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

Select.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.string.isRequired,
        disabled: PropTypes.bool
      })
    ])
  ).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  errorMessage: PropTypes.string,
  placeholder: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string
};

export default Select;