/**
 * FormSection Molecule
 * Reusable form section with collapsible header and content area
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './FormSection.scss';

const FormSection = ({
  title,
  subtitle = null,
  icon = null,
  children,
  collapsible = false,
  defaultExpanded = true,
  required = false,
  completed = false,
  disabled = false,
  error = null,
  className = '',
  headerActions = null,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible && !disabled) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && collapsible && !disabled) {
      event.preventDefault();
      toggleExpanded();
    }
  };

  const sectionClasses = [
    'form-section',
    collapsible && 'form-section--collapsible',
    !isExpanded && 'form-section--collapsed',
    completed && 'form-section--completed',
    disabled && 'form-section--disabled',
    error && 'form-section--error',
    className
  ].filter(Boolean).join(' ');

  const completionIcon = completed ? '✅' : required ? '⚠️' : null;

  return (
    <section className={sectionClasses} {...props}>
      {/* Section Header */}
      <div 
        className="form-section__header"
        onClick={collapsible ? toggleExpanded : undefined}
        onKeyDown={collapsible ? handleKeyDown : undefined}
        tabIndex={collapsible && !disabled ? 0 : -1}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-label={collapsible ? `${isExpanded ? 'Collapse' : 'Expand'} ${title} section` : undefined}
      >
        <div className="form-section__header-content">
          {/* Icon and Status */}
          <div className="form-section__header-icons">
            {icon && (
              <span className="form-section__icon" aria-hidden="true">
                {icon}
              </span>
            )}
            {completionIcon && (
              <span 
                className="form-section__status-icon" 
                aria-label={completed ? 'Section completed' : 'Section required'}
              >
                {completionIcon}
              </span>
            )}
          </div>

          {/* Title and Subtitle */}
          <div className="form-section__header-text">
            <h3 className="form-section__title">
              {title}
              {required && !completed && (
                <span className="form-section__required" aria-label="required">
                  *
                </span>
              )}
            </h3>
            {subtitle && (
              <p className="form-section__subtitle">
                {subtitle}
              </p>
            )}
          </div>

          {/* Header Actions */}
          {headerActions && (
            <div className="form-section__header-actions">
              {headerActions}
            </div>
          )}

          {/* Collapse Toggle */}
          {collapsible && (
            <div className="form-section__toggle">
              <span 
                className="form-section__toggle-icon"
                aria-hidden="true"
              >
                {isExpanded ? '▼' : '▶'}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="form-section__error" role="alert">
            <span className="form-section__error-icon" aria-hidden="true">❌</span>
            <span className="form-section__error-text">{error}</span>
          </div>
        )}
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="form-section__content">
          {children}
        </div>
      )}
    </section>
  );
};

FormSection.propTypes = {
  /** Section title */
  title: PropTypes.string.isRequired,
  /** Optional subtitle or description */
  subtitle: PropTypes.string,
  /** Optional icon to display in header */
  icon: PropTypes.node,
  /** Section content */
  children: PropTypes.node,
  /** Whether the section can be collapsed */
  collapsible: PropTypes.bool,
  /** Whether the section is expanded by default */
  defaultExpanded: PropTypes.bool,
  /** Whether the section is required */
  required: PropTypes.bool,
  /** Whether the section is completed */
  completed: PropTypes.bool,
  /** Whether the section is disabled */
  disabled: PropTypes.bool,
  /** Error message to display */
  error: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Action buttons or controls for the header */
  headerActions: PropTypes.node
};

export default FormSection;