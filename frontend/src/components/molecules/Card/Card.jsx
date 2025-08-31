import React from 'react';
import PropTypes from 'prop-types';
import './Card.scss';

const Card = ({
  children,
  variant = 'default',
  padding = 'default',
  elevated = false,
  interactive = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseClass = 'card';
  const classes = [
    baseClass,
    `${baseClass}--${variant}`,
    `${baseClass}--padding-${padding}`,
    elevated && `${baseClass}--elevated`,
    interactive && `${baseClass}--interactive`,
    className
  ].filter(Boolean).join(' ');

  const Component = interactive || onClick ? 'button' : 'div';
  
  const cardProps = {
    className: classes,
    onClick: interactive || onClick ? onClick : undefined,
    type: (interactive || onClick) && Component === 'button' ? 'button' : undefined,
    role: interactive && !onClick ? 'button' : undefined,
    tabIndex: interactive && !onClick ? 0 : undefined,
    ...props
  };

  return (
    <Component {...cardProps}>
      {children}
    </Component>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'outlined', 'filled']),
  padding: PropTypes.oneOf(['none', 'small', 'default', 'large']),
  elevated: PropTypes.bool,
  interactive: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func
};

export default Card;