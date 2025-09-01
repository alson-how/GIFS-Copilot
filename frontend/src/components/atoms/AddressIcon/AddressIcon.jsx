import React from 'react';
import PropTypes from 'prop-types';
import './AddressIcon.scss';

const AddressIcon = ({ 
  type = 'default', 
  size = 'medium',
  color = 'primary',
  className = '' 
}) => {
  const baseClass = 'address-icon';
  const classes = [
    baseClass,
    `${baseClass}--${type}`,
    `${baseClass}--${size}`,
    `${baseClass}--${color}`,
    className
  ].filter(Boolean).join(' ');

  const getIcon = () => {
    switch (type) {
      case 'home':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        );
      case 'office':
      case 'work':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zM3 3v2h18V3H3z"/>
          </svg>
        );
      case 'warehouse':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 21V7L12 3 2 7v14h5v-9h10v9h5zm-11-2H9v-2h2v2zm0-3H9v-2h2v2zm4 3h-2v-2h2v2zm0-3h-2v-2h2v2z"/>
          </svg>
        );
      case 'store':
      case 'shop':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 7V4H5v3H2v13h8v-4h4v4h8V7h-3zM7 6h10v1H7V6zm0 10H4v-6h3v6zm6-4H9v-2h4v2zm6 4h-3v-6h3v6z"/>
          </svg>
        );
      case 'hotel':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/>
          </svg>
        );
      case 'shipping':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        );
      case 'billing':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
          </svg>
        );
      case 'map':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        );
    }
  };

  const getAriaLabel = () => {
    switch (type) {
      case 'home': return 'Home address';
      case 'office':
      case 'work': return 'Office address';
      case 'warehouse': return 'Warehouse address';
      case 'store':
      case 'shop': return 'Store address';
      case 'hotel': return 'Hotel address';
      case 'shipping': return 'Shipping address';
      case 'billing': return 'Billing address';
      case 'map': return 'Address location';
      default: return 'Address';
    }
  };

  return (
    <span 
      className={classes}
      aria-label={getAriaLabel()}
      role="img"
    >
      {getIcon()}
    </span>
  );
};

AddressIcon.propTypes = {
  type: PropTypes.oneOf([
    'default', 'home', 'office', 'work', 'warehouse', 'store', 'shop',
    'hotel', 'shipping', 'billing', 'map'
  ]),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error', 'muted']),
  className: PropTypes.string
};

export default AddressIcon;