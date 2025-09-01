/**
 * Admin Login Page
 * Handles admin authentication and redirects to admin dashboard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import './AdminLogin.scss';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, admin, isLoading, error } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (admin) {
      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [admin, navigate, location]);

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
        // Redirect to admin dashboard or intended page
        const from = location.state?.from?.pathname || '/admin/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Admin login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestLogin = () => {
    setFormData(prev => ({
      ...prev,
      email: 'admin@3plcompany.com',
      password: 'Admin@123456'
    }));
  };

  if (isLoading) {
    return (
      <div className="admin-login">
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
    <div className="admin-login">
      <div className="login-container">
        <div className="login-header">
          <div className="admin-badge">Admin</div>
          <h1>Admin Portal</h1>
          <p>Sign in to access the administrative dashboard</p>
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
              placeholder="Enter your admin email"
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
              Keep me signed in for 7 days
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
            {isSubmitting ? 'Signing In...' : 'Sign In to Admin Portal'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <a href="/admin/forgot-password">Forgot your password?</a>
          </p>
        </div>

        {/* Test Credentials Helper */}
        <div className="test-credentials">
          <h3>Test Admin Account</h3>
          <div className="test-account">
            <div className="credentials-info">
              <strong>John Administrator</strong>
              <span>admin@3plcompany.com</span>
            </div>
            <button
              type="button"
              onClick={handleTestLogin}
              className="test-login-btn"
            >
              Use Test Account
            </button>
          </div>
        </div>

        <div className="customer-link">
          <p><a href="/login">← Back to Customer Portal</a></p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;