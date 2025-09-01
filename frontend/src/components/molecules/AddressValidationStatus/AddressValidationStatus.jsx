import React from 'react';
import PropTypes from 'prop-types';
import './AddressValidationStatus.scss';

const AddressValidationStatus = ({
  isValidated = null,
  isValidating = false,
  validationMessage = '',
  onValidate,
  size = 'medium',
  variant = 'inline',
  className = ''
}) => {
  const baseClass = 'address-validation-status';
  const classes = [
    baseClass,
    `${baseClass}--${size}`,
    `${baseClass}--${variant}`,
    isValidated === true && `${baseClass}--valid`,
    isValidated === false && `${baseClass}--invalid`,
    isValidating && `${baseClass}--validating`,
    className
  ].filter(Boolean).join(' ');

  const getStatusIcon = () => {
    if (isValidating) {
      return (
        <div className={`${baseClass}__spinner`} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      );
    }

    if (isValidated === true) {
      return (
        <svg className={`${baseClass}__icon ${baseClass}__icon--valid`} width="16" height="16" viewBox="0 0 16 16">
          <path d="M13.5 4.5L6 12l-3.5-3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        </svg>
      );
    }

    if (isValidated === false) {
      return (
        <svg className={`${baseClass}__icon ${baseClass}__icon--invalid`} width="16" height="16" viewBox="0 0 16 16">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        </svg>
      );
    }

    return (
      <svg className={`${baseClass}__icon ${baseClass}__icon--neutral`} width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="2" fill="currentColor" />
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (isValidating) {
      return 'Validating address...';
    }

    if (isValidated === true) {
      return validationMessage || 'Address validated successfully';
    }

    if (isValidated === false) {
      return validationMessage || 'Address validation failed';
    }

    return validationMessage || 'Address not validated';
  };

  const getStatusLevel = () => {
    if (isValidating) return 'info';
    if (isValidated === true) return 'success';
    if (isValidated === false) return 'error';
    return 'warning';
  };

  return (
    <div className={classes} role="status" aria-live="polite">
      <div className={`${baseClass}__content`}>
        <div className={`${baseClass}__status-indicator`}>
          {getStatusIcon()}
        </div>
        
        <div className={`${baseClass}__message-container`}>
          <span className={`${baseClass}__message`}>
            {getStatusText()}
          </span>
          
          {isValidated === false && validationMessage && (
            <div className={`${baseClass}__details`}>
              <small className={`${baseClass}__error-details`}>
                {validationMessage}
              </small>
            </div>
          )}
        </div>
        
        {onValidate && !isValidating && (
          <button
            type="button"
            onClick={onValidate}
            className={`${baseClass}__validate-button`}
            aria-label="Validate address"
            title="Click to validate this address"
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" fill="currentColor"/>
            </svg>
            <span>Validate</span>
          </button>
        )}
      </div>
      
      {variant === 'card' && (
        <div className={`${baseClass}__progress-bar`}>
          <div 
            className={`${baseClass}__progress-fill`}
            data-status={getStatusLevel()}
          />
        </div>
      )}
    </div>
  );
};

AddressValidationStatus.propTypes = {
  isValidated: PropTypes.bool,
  isValidating: PropTypes.bool,
  validationMessage: PropTypes.string,
  onValidate: PropTypes.func,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['inline', 'card', 'compact']),
  className: PropTypes.string
};

export default AddressValidationStatus;