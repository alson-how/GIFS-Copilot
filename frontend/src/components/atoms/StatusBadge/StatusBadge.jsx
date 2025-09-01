/**
 * StatusBadge Atom
 * Reusable status indicator with consistent styling and accessibility
 */

import React from 'react';
import PropTypes from 'prop-types';
import './StatusBadge.scss';

const StatusBadge = ({
  variant = 'default',
  size = 'medium',
  children,
  icon = null,
  className = '',
  ariaLabel = null,
  ...props
}) => {
  const badgeClasses = [
    'status-badge',
    `status-badge--${variant}`,
    `status-badge--${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span
      className={badgeClasses}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      role="status"
      {...props}
    >
      {icon && <span className="status-badge__icon" aria-hidden="true">{icon}</span>}
      <span className="status-badge__content">{children}</span>
    </span>
  );
};

StatusBadge.propTypes = {
  /** Visual style variant */
  variant: PropTypes.oneOf([
    'default',
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'info',
    'pending',
    'approved',
    'rejected',
    'blocked',
    'strategic'
  ]),
  /** Size of the badge */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /** Badge content */
  children: PropTypes.node.isRequired,
  /** Optional icon to display */
  icon: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Accessibility label for screen readers */
  ariaLabel: PropTypes.string
};

export default StatusBadge;