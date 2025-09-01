/**
 * ErrorMessage Atom
 * Consistent error display component with accessibility and severity levels
 */

import React from 'react';
import PropTypes from 'prop-types';
import './ErrorMessage.scss';

const ErrorMessage = ({
  children,
  variant = 'error',
  size = 'medium',
  icon = null,
  dismissible = false,
  onDismiss = null,
  className = '',
  role = 'alert',
  ...props
}) => {
  const errorClasses = [
    'error-message',
    `error-message--${variant}`,
    `error-message--${size}`,
    dismissible && 'error-message--dismissible',
    className
  ].filter(Boolean).join(' ');

  const handleDismiss = () => {
    if (onDismiss && typeof onDismiss === 'function') {
      onDismiss();
    }
  };

  const defaultIcons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    validation: '⚠️'
  };

  const displayIcon = icon !== null ? icon : defaultIcons[variant];

  return (
    <div
      className={errorClasses}
      role={role}
      aria-live="assertive"
      {...props}
    >
      {displayIcon && (
        <span className="error-message__icon" aria-hidden="true">
          {displayIcon}
        </span>
      )}
      
      <div className="error-message__content">
        {children}
      </div>

      {dismissible && (
        <button
          type="button"
          className="error-message__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss error message"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
};

ErrorMessage.propTypes = {
  /** Error message content */
  children: PropTypes.node.isRequired,
  /** Visual style variant */
  variant: PropTypes.oneOf(['error', 'warning', 'info', 'validation']),
  /** Size of the error message */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /** Custom icon to display */
  icon: PropTypes.node,
  /** Whether the message can be dismissed */
  dismissible: PropTypes.bool,
  /** Function called when message is dismissed */
  onDismiss: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** ARIA role for the message */
  role: PropTypes.string
};

export default ErrorMessage;