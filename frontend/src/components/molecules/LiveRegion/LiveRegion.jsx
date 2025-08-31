import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './LiveRegion.scss';

const LiveRegion = ({ 
  message, 
  politeness = 'polite', 
  atomic = true,
  clearDelay = 5000,
  className = '' 
}) => {
  const regionRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (message && regionRef.current) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Clear previous message first to ensure screen readers pick up the new one
      regionRef.current.textContent = '';
      
      // Set new message with a slight delay
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
      
      // Clear message after specified delay
      if (clearDelay > 0) {
        timeoutRef.current = setTimeout(() => {
          if (regionRef.current) {
            regionRef.current.textContent = '';
          }
        }, clearDelay);
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearDelay]);

  return (
    <div
      ref={regionRef}
      className={`live-region ${className}`}
      aria-live={politeness}
      aria-atomic={atomic}
      role="status"
    />
  );
};

LiveRegion.propTypes = {
  message: PropTypes.string,
  politeness: PropTypes.oneOf(['off', 'polite', 'assertive']),
  atomic: PropTypes.bool,
  clearDelay: PropTypes.number,
  className: PropTypes.string
};

export default LiveRegion;