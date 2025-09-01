/**
 * Customer Sidebar Navigation
 * Navigation sidebar for customer portal
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CustomerSidebar.scss';

const CustomerSidebar = ({ isCollapsed, onToggleCollapse, customer, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'ai-query',
      label: 'AI Query',
      icon: '🤖',
      path: '/dashboard/ai-query',
      description: 'Ask questions about your shipments'
    },
    {
      id: 'traditional-workflow',
      label: 'Traditional Workflow',
      icon: '📋',
      path: '/dashboard/traditional-workflow',
      description: 'Step-by-step shipment processing'
    },
    {
      id: 'shipping-list',
      label: 'Shipping List',
      icon: '🚚',
      path: '/dashboard/shipping-list',
      description: 'View and manage shipments'
    },
    {
      id: 'permit-documents',
      label: 'Permit Documents',
      icon: '📄',
      path: '/dashboard/permit-documents',
      description: 'Manage permits and documentation'
    }
  ];

  const isActive = (path) => {
    if (path === '/dashboard/ai-query') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/ai-query';
    }
    return location.pathname === path;
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className={`customer-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo Section */}
      <div className="sidebar-logo">
        {!isCollapsed ? (
          <div className="logo-content">
            <div className="logo-icon">🏢</div>
            <div className="logo-text">
              <h3>3PL Portal</h3>
              <span>Customer</span>
            </div>
          </div>
        ) : (
          <div className="logo-collapsed">🏢</div>
        )}
      </div>

      {/* User Info */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {customer?.first_name?.charAt(0)}{customer?.last_name?.charAt(0)}
        </div>
        {!isCollapsed && (
          <div className="user-details">
            <div className="user-name">
              {customer?.first_name} {customer?.last_name}
            </div>
            <div className="user-company">{customer?.company_name}</div>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                onClick={() => handleNavigation(item.path)}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && (
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-description">{item.description}</span>
                  </div>
                )}
                {isActive(item.path) && <div className="active-indicator" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="sidebar-bottom">
        {/* Collapse Toggle */}
        <button 
          className="collapse-toggle"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="toggle-icon">
            {isCollapsed ? '→' : '←'}
          </span>
          {!isCollapsed && <span>Collapse</span>}
        </button>

        {/* Logout Button */}
        <button 
          className="logout-btn"
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : ''}
        >
          <span className="logout-icon">🚪</span>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default CustomerSidebar;