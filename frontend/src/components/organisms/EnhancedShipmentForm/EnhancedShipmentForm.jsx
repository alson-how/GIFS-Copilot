/**
 * Enhanced Shipment Form Component
 * Complete shipment form with pickup method, package details, and status tracking
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormSection } from '../../molecules/FormSection/FormSection';
import { PickupMethodForm } from '../../molecules/PickupMethodForm/PickupMethodForm';
import { PackageDetailsForm } from '../../molecules/PackageDetailsForm/PackageDetailsForm';
import { StatusTimeline } from '../../molecules/StatusTimeline/StatusTimeline';
import { FileUpload } from '../../molecules/FileUpload/FileUpload';
import { Button } from '../../atoms/Button/Button';
import { LoadingSpinner } from '../../atoms/LoadingSpinner/LoadingSpinner';
import { ErrorMessage } from '../../atoms/ErrorMessage/ErrorMessage';
import { WarningAlert } from '../../molecules/WarningAlert/WarningAlert';
import './EnhancedShipmentForm.scss';

const EnhancedShipmentForm = ({
  initialData = {},
  warehouses = [],
  onSubmit,
  onSave,
  loading = false,
  error = null,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    // Basic shipment data
    origin: '',
    destination: '',
    mode: 'air',
    currency: 'USD',
    incoterms: 'FOB',
    
    // Pickup method
    pickupMethod: 'PICKUP_FROM_LOCATION',
    pickupDetails: {},
    
    // Package details
    packageDetails: {
      numberOfPackages: 1,
      specialHandling: []
    },
    
    // Documents
    documents: [],
    
    ...initialData
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [currentStep, setCurrentStep] = useState('basic');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Update form data when initialData changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...initialData
    }));
  }, [initialData]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    // Basic validation
    if (!formData.destination) errors.destination = 'Destination is required';
    if (!formData.origin) errors.origin = 'Origin is required';

    // Pickup method validation
    if (formData.pickupMethod === 'PICKUP_FROM_LOCATION') {
      if (!formData.pickupDetails.address) errors.address = 'Pickup address is required';
      if (!formData.pickupDetails.contactPerson) errors.contactPerson = 'Contact person is required';
      if (!formData.pickupDetails.phone) errors.phone = 'Contact phone is required';
    } else if (formData.pickupMethod === 'DROP_OFF_AT_WAREHOUSE') {
      if (!formData.pickupDetails.warehouseId) errors.warehouseId = 'Please select a warehouse';
    }

    // Package details validation
    if (!formData.packageDetails.pickupDateFrom) errors.pickupDateFrom = 'From date is required';
    if (!formData.packageDetails.pickupDateTo) errors.pickupDateTo = 'To date is required';
    if (!formData.packageDetails.length) errors.length = 'Length is required';
    if (!formData.packageDetails.width) errors.width = 'Width is required';
    if (!formData.packageDetails.height) errors.height = 'Height is required';
    if (!formData.packageDetails.weight) errors.weight = 'Weight is required';

    // Date validation
    if (formData.packageDetails.pickupDateFrom && formData.packageDetails.pickupDateTo) {
      const fromDate = new Date(formData.packageDetails.pickupDateFrom);
      const toDate = new Date(formData.packageDetails.pickupDateTo);
      
      if (fromDate >= toDate) {
        errors.pickupDateTo = 'To date must be after from date';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle form field updates
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear specific validation error
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const handlePickupMethodChange = useCallback((method) => {
    setFormData(prev => ({
      ...prev,
      pickupMethod: method,
      pickupDetails: {} // Reset pickup details
    }));
  }, []);

  const handlePickupDetailsChange = useCallback((details) => {
    setFormData(prev => ({
      ...prev,
      pickupDetails: details
    }));
  }, []);

  const handlePackageDetailsChange = useCallback((details) => {
    setFormData(prev => ({
      ...prev,
      packageDetails: details
    }));
  }, []);

  const handleDocumentUpload = useCallback((files) => {
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...files]
    }));
  }, []);

  const handleDocumentRemove = useCallback((fileId) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== fileId)
    }));
  }, []);

  // Handle save draft
  const handleSave = useCallback(async () => {
    if (onSave) {
      try {
        await onSave(formData);
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }
  }, [formData, onSave]);

  // Handle final submit
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm()) {
      setCurrentStep('basic'); // Go back to first step with errors
      return;
    }

    if (onSubmit) {
      try {
        // Add status transition to PENDING_QUOTE
        const submitData = {
          ...formData,
          status: 'PENDING_QUOTE'
        };
        
        await onSubmit(submitData);
      } catch (error) {
        console.error('Failed to submit shipment:', error);
      }
    }
  }, [formData, validateForm, onSubmit]);

  // Step navigation
  const steps = [
    { id: 'basic', title: 'Basic Details', icon: '📋' },
    { id: 'pickup', title: 'Pickup Method', icon: '📍' },
    { id: 'package', title: 'Package Details', icon: '📦' },
    { id: 'documents', title: 'Documents', icon: '📄' },
    { id: 'review', title: 'Review', icon: '✅' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const nextStep = () => {
    const nextIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    setCurrentStep(steps[nextIndex].id);
  };

  const prevStep = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStep(steps[prevIndex].id);
  };

  return (
    <div className={`enhanced-shipment-form ${className}`}>
      {/* Status Timeline - Show if shipment exists */}
      {initialData.status && (
        <div className="enhanced-shipment-form__status">
          <StatusTimeline
            currentStatus={initialData.status}
            showTabView={true}
          />
        </div>
      )}

      {/* Step Navigation */}
      <div className="enhanced-shipment-form__steps">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`enhanced-shipment-form__step ${
              index <= currentStepIndex ? 'enhanced-shipment-form__step--active' : ''
            } ${
              index === currentStepIndex ? 'enhanced-shipment-form__step--current' : ''
            }`}
            onClick={() => setCurrentStep(step.id)}
          >
            <div className="enhanced-shipment-form__step-icon">
              {step.icon}
            </div>
            <div className="enhanced-shipment-form__step-title">
              {step.title}
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <ErrorMessage message={error} />
      )}

      {/* Validation Warnings */}
      {submitAttempted && Object.keys(validationErrors).length > 0 && (
        <WarningAlert
          title="Please fix the following issues:"
          items={Object.values(validationErrors)}
        />
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="enhanced-shipment-form__form">
        {/* Basic Details Step */}
        {currentStep === 'basic' && (
          <FormSection
            title="Basic Shipment Details"
            description="Enter origin, destination and shipment preferences"
          >
            <div className="enhanced-shipment-form__row">
              <div className="enhanced-shipment-form__field">
                <label>Origin Country</label>
                <select
                  value={formData.origin}
                  onChange={(e) => handleFieldChange('origin', e.target.value)}
                  required
                >
                  <option value="">Select origin...</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Thailand">Thailand</option>
                </select>
                {validationErrors.origin && (
                  <span className="enhanced-shipment-form__error">{validationErrors.origin}</span>
                )}
              </div>

              <div className="enhanced-shipment-form__field">
                <label>Destination Country</label>
                <select
                  value={formData.destination}
                  onChange={(e) => handleFieldChange('destination', e.target.value)}
                  required
                >
                  <option value="">Select destination...</option>
                  <option value="China">China</option>
                  <option value="USA">United States</option>
                  <option value="Germany">Germany</option>
                  <option value="Japan">Japan</option>
                  <option value="South Korea">South Korea</option>
                </select>
                {validationErrors.destination && (
                  <span className="enhanced-shipment-form__error">{validationErrors.destination}</span>
                )}
              </div>
            </div>

            <div className="enhanced-shipment-form__row">
              <div className="enhanced-shipment-form__field">
                <label>Transportation Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => handleFieldChange('mode', e.target.value)}
                >
                  <option value="air">Air Freight</option>
                  <option value="sea">Sea Freight</option>
                  <option value="land">Land Transport</option>
                  <option value="express">Express Courier</option>
                </select>
              </div>

              <div className="enhanced-shipment-form__field">
                <label>Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleFieldChange('currency', e.target.value)}
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="MYR">MYR - Malaysian Ringgit</option>
                </select>
              </div>
            </div>
          </FormSection>
        )}

        {/* Pickup Method Step */}
        {currentStep === 'pickup' && (
          <PickupMethodForm
            pickupMethod={formData.pickupMethod}
            pickupDetails={formData.pickupDetails}
            warehouses={warehouses}
            onPickupMethodChange={handlePickupMethodChange}
            onPickupDetailsChange={handlePickupDetailsChange}
            errors={validationErrors}
          />
        )}

        {/* Package Details Step */}
        {currentStep === 'package' && (
          <PackageDetailsForm
            packageDetails={formData.packageDetails}
            onPackageDetailsChange={handlePackageDetailsChange}
            errors={validationErrors}
          />
        )}

        {/* Documents Step */}
        {currentStep === 'documents' && (
          <FormSection
            title="Required Documents"
            description="Upload commercial invoice and other relevant documents"
          >
            <FileUpload
              onFilesUploaded={handleDocumentUpload}
              acceptedTypes={['.pdf', '.jpg', '.png', '.xlsx']}
              maxFiles={10}
              existingFiles={formData.documents}
              onFileRemove={handleDocumentRemove}
            />
          </FormSection>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <FormSection
            title="Review & Submit"
            description="Review all details before submitting for quote"
          >
            <div className="enhanced-shipment-form__review">
              <div className="enhanced-shipment-form__review-section">
                <h4>Basic Details</h4>
                <p><strong>Route:</strong> {formData.origin} → {formData.destination}</p>
                <p><strong>Mode:</strong> {formData.mode}</p>
                <p><strong>Currency:</strong> {formData.currency}</p>
              </div>

              <div className="enhanced-shipment-form__review-section">
                <h4>Pickup Method</h4>
                <p><strong>Method:</strong> {formData.pickupMethod === 'PICKUP_FROM_LOCATION' ? 'Pickup from location' : 'Drop off at warehouse'}</p>
                {formData.pickupMethod === 'PICKUP_FROM_LOCATION' && formData.pickupDetails.address && (
                  <p><strong>Address:</strong> {formData.pickupDetails.address}</p>
                )}
              </div>

              <div className="enhanced-shipment-form__review-section">
                <h4>Package Details</h4>
                <p><strong>Dimensions:</strong> {formData.packageDetails.length} × {formData.packageDetails.width} × {formData.packageDetails.height} cm</p>
                <p><strong>Weight:</strong> {formData.packageDetails.weight} kg</p>
                <p><strong>Packages:</strong> {formData.packageDetails.numberOfPackages}</p>
                {formData.packageDetails.specialHandling?.length > 0 && (
                  <p><strong>Special Handling:</strong> {formData.packageDetails.specialHandling.join(', ')}</p>
                )}
              </div>

              <div className="enhanced-shipment-form__review-section">
                <h4>Documents</h4>
                <p>{formData.documents.length} file(s) uploaded</p>
              </div>
            </div>
          </FormSection>
        )}

        {/* Form Actions */}
        <div className="enhanced-shipment-form__actions">
          <div className="enhanced-shipment-form__nav-buttons">
            {currentStepIndex > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={prevStep}
                disabled={loading}
              >
                Previous
              </Button>
            )}

            {currentStepIndex < steps.length - 1 && (
              <Button
                type="button"
                variant="primary"
                onClick={nextStep}
                disabled={loading}
              >
                Next
              </Button>
            )}
          </div>

          <div className="enhanced-shipment-form__submit-buttons">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="small" /> : 'Save Draft'}
            </Button>

            {currentStep === 'review' && (
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="small" /> : 'Submit for Quote'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

EnhancedShipmentForm.propTypes = {
  initialData: PropTypes.object,
  warehouses: PropTypes.array,
  onSubmit: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string
};

export default EnhancedShipmentForm;