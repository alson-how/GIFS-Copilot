import React from 'react';
import PropTypes from 'prop-types';
import './Label.scss';

const Label = ({
  children,
  htmlFor,
  required = false,
  size = 'medium',
  className = '',
  ...props
}) => {
  const baseClass = 'label';
  const classes = [
    baseClass,
    `${baseClass}--${size}`,
    required && `${baseClass}--required`,
    className
  ].filter(Boolean).join(' ');

  return (
    <label
      htmlFor={htmlFor}
      className={classes}
      {...props}
    >
      {children}
      {required && (
        <span 
          className={`${baseClass}__required`}
          aria-label="required"
        >
          *
        </span>
      )}
    </label>
  );
};

Label.propTypes = {
  children: PropTypes.node.isRequired,
  htmlFor: PropTypes.string,
  required: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string
};

export default Label;