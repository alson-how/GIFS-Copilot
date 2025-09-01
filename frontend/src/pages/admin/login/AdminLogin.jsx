/**
 * Admin Login Page
 * Authentication page for admin portal access
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { Input, Button } from '../../../components/atoms';
import { ErrorMessage, LoadingSpinner } from '../../../components/atoms';
import './AdminLogin.scss';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await login(
        formData.username, 
        formData.password, 
        formData.rememberMe
      );

      if (result.success) {
        // Redirect will happen via useEffect
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setFormData({
      username: 'admin',
      password: 'admin123',
      rememberMe: false
    });
    
    // Trigger login with demo credentials
    setTimeout(() => {
      document.getElementById('login-form').requestSubmit();
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="admin-login__loading">
        <LoadingSpinner size="large" message="Checking authentication..." />
      </div>
    );
  }

  return (
    <div className="admin-login">
      <div className="admin-login__container">
        <div className="admin-login__header">
          <div className="admin-login__logo">
            <h1>🏢 GIFS Logistics</h1>
            <p>Admin Portal</p>
          </div>
        </div>

        <div className="admin-login__card">
          <div className="admin-login__card-header">
            <h2>Admin Login</h2>
            <p>Enter your credentials to access the admin portal</p>
          </div>

          <form 
            id="login-form"
            className="admin-login__form" 
            onSubmit={handleSubmit}
          >
            {error && (
              <ErrorMessage className="admin-login__error">
                {error}
              </ErrorMessage>
            )}

            <div className="admin-login__field">
              <label htmlFor="username">Username</label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="admin-login__field">
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="admin-login__options">
              <label className="admin-login__checkbox">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <span>Remember me for 7 days</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={isSubmitting}
              className="admin-login__submit"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" variant="white" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="admin-login__demo">
              <p>Demo Access:</p>
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={handleDemoLogin}
                disabled={isSubmitting}
              >
                Login as Demo Admin
              </Button>
            </div>
          </form>
        </div>

        <div className="admin-login__footer">
          <p>
            Having trouble? Contact system administrator at{' '}
            <a href="mailto:admin@company.com">admin@company.com</a>
          </p>
          <p className="admin-login__security">
            🔒 Secure admin access • All activities are logged
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;