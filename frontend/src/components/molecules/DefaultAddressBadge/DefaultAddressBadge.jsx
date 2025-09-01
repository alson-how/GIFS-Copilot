import React from 'react';
import PropTypes from 'prop-types';
import './DefaultAddressBadge.scss';

const DefaultAddressBadge = ({
  isDefault = false,
  onClick,
  disabled = false,
  size = 'medium',
  variant = 'default',
  className = '',
  showText = true,
  interactive = true
}) => {
  const baseClass = 'default-address-badge';
  const classes = [
    baseClass,
    `${baseClass}--${size}`,
    `${baseClass}--${variant}`,
    isDefault && `${baseClass}--active`,
    interactive && onClick && `${baseClass}--interactive`,
    disabled && `${baseClass}--disabled`,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (disabled || !onClick) return;
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  const handleKeyDown = (e) => {
    if (disabled || !onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const content = (
    <>
      <span className={`${baseClass}__icon`} aria-hidden="true">
        ★
      </span>
      {showText && (
        <span className={`${baseClass}__text`}>
          {isDefault ? 'Default' : 'Set as Default'}
        </span>
      )}
    </>
  );

  if (interactive && onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={isDefault ? 'Default address' : 'Set as default address'}
        title={isDefault ? 'This is your default address' : 'Click to set as default address'}
      >
        {content}
      </button>
    );
  }

  return (
    <div 
      className={classes}
      role={isDefault ? 'status' : undefined}
      aria-label={isDefault ? 'Default address' : undefined}
    >
      {content}
    </div>
  );
};

DefaultAddressBadge.propTypes = {
  isDefault: PropTypes.bool,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['default', 'primary', 'secondary']),
  className: PropTypes.string,
  showText: PropTypes.bool,
  interactive: PropTypes.bool
};

export default DefaultAddressBadge;