import { useState, useCallback } from 'react';

/**
 * Custom hook for form validation
 */
export const useFormValidation = (validationSchema) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const validateField = useCallback((fieldName, value, schema = validationSchema) => {
    const fieldSchema = schema[fieldName];
    if (!fieldSchema) return null;
    
    for (const rule of fieldSchema) {
      const error = rule.validator(value);
      if (error) {
        return rule.message || error;
      }
    }
    return null;
  }, [validationSchema]);
  
  const validateForm = useCallback((data, schema = validationSchema) => {
    const newErrors = {};
    
    Object.keys(schema).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName], schema);
      if (error) {
        newErrors[fieldName] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateField, validationSchema]);
  
  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, []);
  
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);
  
  const setFieldTouched = useCallback((fieldName, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: isTouched
    }));
  }, []);
  
  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);
  
  const getFieldProps = useCallback((fieldName) => ({
    error: touched[fieldName] && !!errors[fieldName],
    errorMessage: touched[fieldName] ? errors[fieldName] : '',
    onBlur: () => setFieldTouched(fieldName, true)
  }), [errors, touched, setFieldTouched]);
  
  return {
    errors,
    touched,
    validateField,
    validateForm,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    resetValidation,
    getFieldProps,
    isValid: Object.keys(errors).length === 0
  };
};

// Common validation rules
export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required';
    }
    return null;
  },
  
  email: (value) => {
    if (value && !/\S+@\S+\.\S+/.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  minLength: (min) => (value) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },
  
  maxLength: (max) => (value) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },
  
  numeric: (value) => {
    if (value && isNaN(Number(value))) {
      return 'Must be a valid number';
    }
    return null;
  },
  
  positiveNumber: (value) => {
    const num = Number(value);
    if (value && (isNaN(num) || num <= 0)) {
      return 'Must be a positive number';
    }
    return null;
  },
  
  hsCode: (value) => {
    if (value && !/^\d{4,10}$/.test(value)) {
      return 'HS Code must be 4-10 digits';
    }
    return null;
  }
};