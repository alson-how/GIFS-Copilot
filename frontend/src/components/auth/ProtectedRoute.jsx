/**
 * Protected Route Component
 * Handles authentication checks and redirects for protected routes
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const ProtectedRoute = ({ 
  children, 
  userType = 'customer', 
  fallbackPath = null,
  requireAuth = true 
}) => {
  const location = useLocation();
  
  // Get auth context based on user type
  const customerAuth = useCustomerAuth();
  const adminAuth = useAdminAuth();
  
  const auth = userType === 'admin' ? adminAuth : customerAuth;
  const { 
    customer, 
    admin, 
    isLoading, 
    isAuthenticated: customerAuthenticated 
  } = customerAuth;
  
  const { 
    admin: adminUser, 
    isLoading: adminLoading, 
    isAuthenticated: adminAuthenticated 
  } = adminAuth;

  const isLoading_auth = userType === 'admin' ? adminLoading : isLoading;
  const user = userType === 'admin' ? adminUser : customer;
  const isAuthenticated = userType === 'admin' ? adminAuthenticated : customerAuthenticated;

  // Show loading spinner while checking authentication
  if (isLoading_auth) {
    return (
      <div className="protected-route-loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Checking authentication...</p>
        </div>
        <style jsx>{`
          .protected-route-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f7fafc;
          }
          
          .loading-container {
            text-align: center;
            padding: 40px;
          }
          
          .spinner {
            width: 40px;
            height: 40px;
            margin: 0 auto 20px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loading-container p {
            color: #718096;
            margin: 0;
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    const loginPath = userType === 'admin' ? '/admin/login' : '/login';
    const redirectPath = fallbackPath || loginPath;
    
    return (
      <Navigate 
        to={redirectPath} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If user is authenticated but accessing wrong portal
  if (isAuthenticated && userType === 'admin' && !adminUser) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && userType === 'customer' && !customer) {
    return <Navigate to="/admin/login" replace />;
  }

  // User is properly authenticated, render children
  return <>{children}</>;
};

export default ProtectedRoute;