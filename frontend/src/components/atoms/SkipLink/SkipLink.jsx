import React from 'react';
import PropTypes from 'prop-types';
import './SkipLink.scss';

const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => {
  return (
    <a 
      href={href} 
      className="skip-link"
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    >
      {children}
    </a>
  );
};

SkipLink.propTypes = {
  href: PropTypes.string,
  children: PropTypes.node
};

export default SkipLink;