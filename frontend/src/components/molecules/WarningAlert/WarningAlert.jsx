/**
 * WarningAlert Molecule
 * Reusable alert component for warnings, info, and notifications
 */

import React from 'react';
import PropTypes from 'prop-types';
import './WarningAlert.scss';

const WarningAlert = ({
  variant = 'warning',
  icon = null,
  title,
  message = null,
  children,
  className = '',
  ...props
}) => {
  const defaultIcons = {
    warning: '⚠️',
    info: '💡',
    success: '✅',
    error: '❌',
    strategic: '🛡️'
  };

  const alertIcon = icon || defaultIcons[variant] || defaultIcons.warning;

  const alertClasses = [
    'warning-alert',
    `warning-alert--${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={alertClasses} {...props}>
      <div className="warning-alert__header">
        <span className="warning-alert__icon" aria-hidden="true">
          {alertIcon}
        </span>
        <strong className="warning-alert__title">{title}</strong>
      </div>
      {message && (
        <div className="warning-alert__message">
          {message}
        </div>
      )}
      {children && (
        <div className="warning-alert__content">
          {children}
        </div>
      )}
    </div>
  );
};

WarningAlert.propTypes = {
  /** Alert variant determining styling */
  variant: PropTypes.oneOf(['warning', 'info', 'success', 'error', 'strategic']),
  /** Custom icon (overrides default variant icon) */
  icon: PropTypes.node,
  /** Alert title */
  title: PropTypes.string.isRequired,
  /** Optional message text */
  message: PropTypes.string,
  /** Additional content */
  children: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string
};

export default WarningAlert;