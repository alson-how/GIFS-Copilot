import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../../atoms/Button/Button';
import './AddressActions.scss';

const AddressActions = ({
  onEdit,
  onDelete,
  onSetDefault,
  onCopy,
  isDefault = false,
  disabled = false,
  showLabels = false,
  variant = 'minimal',
  size = 'medium',
  className = '',
  deleteConfirmation = true
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const baseClass = 'address-actions';
  const classes = [
    baseClass,
    `${baseClass}--${variant}`,
    `${baseClass}--${size}`,
    disabled && `${baseClass}--disabled`,
    className
  ].filter(Boolean).join(' ');

  const handleDelete = () => {
    if (deleteConfirmation && !showDeleteConfirm) {
      setShowDeleteConfirm(true);
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => setShowDeleteConfirm(false), 5000);
      return;
    }
    setShowDeleteConfirm(false);
    onDelete?.();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const actionButtons = [
    {
      key: 'edit',
      onClick: onEdit,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25a1.75 1.75 0 0 1 .445-.758l8.61-8.61Z"/>
        </svg>
      ),
      label: 'Edit',
      variant: 'ghost',
      disabled: disabled
    },
    {
      key: 'copy',
      onClick: onCopy,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
          <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
        </svg>
      ),
      label: 'Copy',
      variant: 'ghost',
      disabled: disabled || !onCopy,
      show: !!onCopy
    },
    {
      key: 'default',
      onClick: onSetDefault,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
        </svg>
      ),
      label: isDefault ? 'Default' : 'Set Default',
      variant: isDefault ? 'primary' : 'ghost',
      disabled: disabled || isDefault,
      show: !!onSetDefault
    },
    {
      key: 'delete',
      onClick: handleDelete,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.75 1.75 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/>
        </svg>
      ),
      label: 'Delete',
      variant: 'error',
      disabled: disabled || !onDelete,
      show: !!onDelete
    }
  ];

  const visibleActions = actionButtons.filter(action => action.show !== false);

  if (showDeleteConfirm) {
    return (
      <div className={`${classes} ${baseClass}--confirming`}>
        <div className={`${baseClass}__confirm-message`}>
          Delete this address?
        </div>
        <div className={`${baseClass}__confirm-actions`}>
          <Button
            variant="error"
            size={size}
            onClick={handleDelete}
            className={`${baseClass}__confirm-button`}
          >
            {showLabels ? 'Delete' : '✓'}
          </Button>
          <Button
            variant="ghost"
            size={size}
            onClick={handleCancelDelete}
            className={`${baseClass}__cancel-button`}
          >
            {showLabels ? 'Cancel' : '✕'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={classes}>
      {visibleActions.map(action => (
        <Button
          key={action.key}
          variant={action.variant}
          size={size}
          onClick={action.onClick}
          disabled={action.disabled}
          className={`${baseClass}__action ${baseClass}__action--${action.key}`}
          title={action.label}
          aria-label={action.label}
        >
          {showLabels ? (
            <>
              {action.icon}
              <span className={`${baseClass}__action-label`}>
                {action.label}
              </span>
            </>
          ) : (
            action.icon
          )}
        </Button>
      ))}
    </div>
  );
};

AddressActions.propTypes = {
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSetDefault: PropTypes.func,
  onCopy: PropTypes.func,
  isDefault: PropTypes.bool,
  disabled: PropTypes.bool,
  showLabels: PropTypes.bool,
  variant: PropTypes.oneOf(['minimal', 'contained', 'outlined']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
  deleteConfirmation: PropTypes.bool
};

export default AddressActions;