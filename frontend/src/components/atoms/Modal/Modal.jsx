/**
 * Modal Atom
 * Accessible modal dialog component with portal rendering and focus management
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import './Modal.scss';

const Modal = ({
  isOpen = false,
  onClose,
  children,
  title = null,
  size = 'medium',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  overlayClassName = '',
  preventBodyScroll = true,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus();
      }
      
      // Prevent body scroll if enabled
      if (preventBodyScroll) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      // Restore focus to the previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      
      // Restore body scroll
      if (preventBodyScroll) {
        document.body.style.overflow = '';
      }
    }

    return () => {
      // Cleanup on unmount
      if (preventBodyScroll) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, preventBodyScroll]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape && onClose) {
        event.preventDefault();
        onClose();
      }

      // Trap focus within modal
      if (event.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && closeOnBackdropClick && onClose) {
      onClose();
    }
  };

  const handleCloseClick = () => {
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const modalClasses = [
    'modal',
    `modal--${size}`,
    className
  ].filter(Boolean).join(' ');

  const overlayClasses = [
    'modal-overlay',
    overlayClassName
  ].filter(Boolean).join(' ');

  const modalContent = (
    <div 
      className={overlayClasses}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        ref={modalRef}
        className={modalClasses}
        tabIndex={-1}
        {...props}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="modal__header">
            {title && (
              <h2 id="modal-title" className="modal__title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                className="modal__close"
                onClick={handleCloseClick}
                aria-label="Close modal"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Content */}
        <div className="modal__content">
          {children}
        </div>
      </div>
    </div>
  );

  // Render modal in portal to avoid z-index issues
  return createPortal(modalContent, document.body);
};

Modal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool,
  /** Function called when modal should be closed */
  onClose: PropTypes.func,
  /** Modal content */
  children: PropTypes.node.isRequired,
  /** Modal title */
  title: PropTypes.string,
  /** Size of the modal */
  size: PropTypes.oneOf(['small', 'medium', 'large', 'extra-large', 'full-screen']),
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdropClick: PropTypes.bool,
  /** Whether pressing Escape closes the modal */
  closeOnEscape: PropTypes.bool,
  /** Whether to show the close button */
  showCloseButton: PropTypes.bool,
  /** Additional CSS classes for modal */
  className: PropTypes.string,
  /** Additional CSS classes for overlay */
  overlayClassName: PropTypes.string,
  /** Whether to prevent body scrolling when modal is open */
  preventBodyScroll: PropTypes.bool
};

export default Modal;