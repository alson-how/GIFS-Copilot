/**
 * ProgressIndicator Atom
 * Reusable progress indicators for multi-step workflows and loading states
 */

import React from 'react';
import PropTypes from 'prop-types';
import './ProgressIndicator.scss';

const ProgressIndicator = ({
  variant = 'linear',
  size = 'medium',
  value = 0,
  max = 100,
  showLabel = true,
  label = null,
  steps = null,
  currentStep = 0,
  className = '',
  animated = true,
  color = 'primary',
  ...props
}) => {
  const progressClasses = [
    'progress-indicator',
    `progress-indicator--${variant}`,
    `progress-indicator--${size}`,
    `progress-indicator--${color}`,
    !animated && 'progress-indicator--static',
    className
  ].filter(Boolean).join(' ');

  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // For step-based progress
  const stepPercentage = steps ? (currentStep / (steps.length - 1)) * 100 : percentage;

  const renderLinearProgress = () => (
    <div className="progress-indicator__track">
      <div 
        className="progress-indicator__fill"
        style={{ 
          width: `${steps ? stepPercentage : percentage}%`,
          transition: animated ? 'width 0.3s ease-in-out' : 'none'
        }}
        role="progressbar"
        aria-valuenow={steps ? currentStep : value}
        aria-valuemin="0"
        aria-valuemax={steps ? steps.length - 1 : max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      />
    </div>
  );

  const renderCircularProgress = () => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <svg 
        className="progress-indicator__circle" 
        viewBox="0 0 100 100"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        <circle
          className="progress-indicator__circle-bg"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          opacity="0.2"
        />
        <circle
          className="progress-indicator__circle-progress"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          style={{
            transition: animated ? 'stroke-dashoffset 0.3s ease-in-out' : 'none'
          }}
        />
        {showLabel && (
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            className="progress-indicator__circle-text"
          >
            {Math.round(percentage)}%
          </text>
        )}
      </svg>
    );
  };

  const renderStepProgress = () => (
    <div className="progress-indicator__steps">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`progress-indicator__step ${
            index < currentStep ? 'progress-indicator__step--completed' :
            index === currentStep ? 'progress-indicator__step--current' :
            'progress-indicator__step--pending'
          }`}
        >
          <div className="progress-indicator__step-circle">
            {index < currentStep ? '✓' : index + 1}
          </div>
          <div className="progress-indicator__step-label">
            {step.label || step}
          </div>
          {index < steps.length - 1 && (
            <div className="progress-indicator__step-connector" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className={progressClasses} {...props}>
      {variant === 'linear' && renderLinearProgress()}
      {variant === 'circular' && renderCircularProgress()}
      {variant === 'steps' && renderStepProgress()}
      
      {showLabel && variant !== 'circular' && variant !== 'steps' && (
        <div className="progress-indicator__label">
          {label || `${Math.round(percentage)}%`}
        </div>
      )}
    </div>
  );
};

ProgressIndicator.propTypes = {
  /** Progress indicator variant */
  variant: PropTypes.oneOf(['linear', 'circular', 'steps']),
  /** Size of the indicator */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /** Current progress value */
  value: PropTypes.number,
  /** Maximum progress value */
  max: PropTypes.number,
  /** Whether to show progress label */
  showLabel: PropTypes.bool,
  /** Custom label text */
  label: PropTypes.string,
  /** Array of steps for step-based progress */
  steps: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      label: PropTypes.string,
      description: PropTypes.string
    })
  ])),
  /** Current step index (for step-based progress) */
  currentStep: PropTypes.number,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Whether to animate progress changes */
  animated: PropTypes.bool,
  /** Color theme */
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error'])
};

export default ProgressIndicator;