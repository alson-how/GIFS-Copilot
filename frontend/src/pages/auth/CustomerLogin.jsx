/**
 * Customer Login Page
 * Handles customer authentication and redirects to Traditional Workflow
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import './CustomerLogin.scss';

const CustomerLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, customer, isLoading, error } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (customer) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [customer, navigate, location]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(
        formData.email.trim(),
        formData.password,
        formData.rememberMe
      );

      if (result.success) {
        // Redirect to dashboard or intended page
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestLogin = (email, password) => {
    setFormData(prev => ({
      ...prev,
      email,
      password
    }));
  };

  if (isLoading) {
    return (
      <div className="customer-login">
        <div className="login-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-login">
      <div className="login-container">
        <div className="login-header">
          <h1>Customer Portal</h1>
          <p>Sign in to access your logistics dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              className={errors.email ? 'error' : ''}
              disabled={isSubmitting}
              autoComplete="email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              className={errors.password ? 'error' : ''}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <span className="checkmark"></span>
              Remember me for 30 days
            </label>
          </div>

          {error && (
            <div className="error-banner">
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <a href="/forgot-password">Forgot your password?</a>
          </p>
          <p>
            Don't have an account? <a href="/register">Sign up here</a>
          </p>
        </div>

        {/* Test Credentials Helper */}
        <div className="test-credentials">
          <h3>Test Accounts</h3>
          <div className="test-accounts">
            <div className="test-account">
              <strong>Tech Corp Solutions</strong>
              <button
                type="button"
                onClick={() => handleTestLogin('customer1@techcorp.com', 'Customer@123')}
                className="test-login-btn"
              >
                Use Test Account
              </button>
            </div>
            <div className="test-account">
              <strong>Global Imports Ltd</strong>
              <button
                type="button"
                onClick={() => handleTestLogin('customer2@globalimports.com', 'Customer@123')}
                className="test-login-btn"
              >
                Use Test Account
              </button>
            </div>
            <div className="test-account">
              <strong>Fashion House International</strong>
              <button
                type="button"
                onClick={() => handleTestLogin('customer3@fashionhouse.com', 'Customer@123')}
                className="test-login-btn"
              >
                Use Test Account
              </button>
            </div>
          </div>
        </div>

        <div className="admin-link">
          <p><a href="/admin/login">Admin Portal →</a></p>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;