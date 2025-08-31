import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import './Input.scss';

const Input = forwardRef(({
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  error = false,
  errorMessage,
  size = 'medium',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseClass = 'input';
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
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
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
      />
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

Input.displayName = 'Input';

Input.propTypes = {
  type: PropTypes.oneOf([
    'text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time'
  ]),
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  errorMessage: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string
};

export default Input;