/**
 * LoadingSpinner Atom
 * Reusable loading indicator with accessibility and animation options
 */

import React from 'react';
import PropTypes from 'prop-types';
import './LoadingSpinner.scss';

const LoadingSpinner = ({
  size = 'medium',
  variant = 'primary',
  message = 'Loading...',
  showMessage = false,
  centered = false,
  overlay = false,
  className = '',
  ariaLabel = null,
  ...props
}) => {
  const spinnerClasses = [
    'loading-spinner',
    `loading-spinner--${size}`,
    `loading-spinner--${variant}`,
    centered && 'loading-spinner--centered',
    overlay && 'loading-spinner--overlay',
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'loading-spinner-container',
    overlay && 'loading-spinner-container--overlay'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} {...props}>
      <div 
        className={spinnerClasses}
        role="status"
        aria-label={ariaLabel || message}
        aria-live="polite"
      >
        <div className="loading-spinner__circle">
          <div className="loading-spinner__path"></div>
        </div>
        {showMessage && (
          <span className="loading-spinner__message" aria-hidden="true">
            {message}
          </span>
        )}
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
};

LoadingSpinner.propTypes = {
  /** Size of the spinner */
  size: PropTypes.oneOf(['small', 'medium', 'large', 'extra-large']),
  /** Visual style variant */
  variant: PropTypes.oneOf(['primary', 'secondary', 'white', 'gray']),
  /** Loading message for accessibility */
  message: PropTypes.string,
  /** Whether to show the loading message visually */
  showMessage: PropTypes.bool,
  /** Whether to center the spinner */
  centered: PropTypes.bool,
  /** Whether to show as overlay */
  overlay: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Custom accessibility label */
  ariaLabel: PropTypes.string
};

export default LoadingSpinner;