import { useState, useCallback } from 'react';

/**
 * Custom hook for managing async operations with loading states
 */
export const useAsyncOperation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  
  const execute = useCallback(async (asyncFunction, options = {}) => {
    const {
      onSuccess,
      onError,
      successMessage = 'Operation completed successfully',
      errorMessage = 'Operation failed'
    } = options;
    
    try {
      setLoading(true);
      setError(null);
      setStatus('');
      
      const result = await asyncFunction();
      
      setStatus(successMessage);
      onSuccess?.(result);
      
      return result;
    } catch (err) {
      const errorMsg = err.message || errorMessage;
      setError(errorMsg);
      setStatus(errorMsg);
      onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setStatus('');
  }, []);
  
  return {
    loading,
    error,
    status,
    execute,
    reset
  };
};