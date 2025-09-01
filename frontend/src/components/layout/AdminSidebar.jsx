/**
 * Admin Sidebar Navigation
 * Navigation sidebar for admin portal
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AdminSidebar.scss';

const AdminSidebar = ({ isCollapsed, onToggleCollapse, admin, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      path: '/admin/dashboard',
      description: 'System overview and analytics'
    },
    {
      id: 'ai-query',
      label: 'AI Query',
      icon: '🤖',
      path: '/admin/ai-query',
      description: 'AI-powered query interface'
    },
    {
      id: 'manage-shipments',
      label: 'Manage Shipments',
      icon: '📦',
      path: '/admin/manage-shipments',
      description: 'View and manage all shipments'
    }
  ];

  const isActive = (path) => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname === path;
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo Section */}
      <div className="sidebar-logo">
        {!isCollapsed ? (
          <div className="logo-content">
            <div className="logo-icon admin">🛡️</div>
            <div className="logo-text">
              <h3>3PL Admin</h3>
              <span>Management Portal</span>
            </div>
          </div>
        ) : (
          <div className="logo-collapsed admin">🛡️</div>
        )}
      </div>

      {/* User Info */}
      <div className="sidebar-user">
        <div className="user-avatar admin">
          {admin?.first_name?.charAt(0)}{admin?.last_name?.charAt(0)}
        </div>
        {!isCollapsed && (
          <div className="user-details">
            <div className="user-name">
              {admin?.first_name} {admin?.last_name}
            </div>
            <div className="user-role">System Administrator</div>
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
        {/* System Status */}
        {!isCollapsed && (
          <div className="system-status">
            <div className="status-item">
              <span className="status-dot online"></span>
              <span className="status-text">System Online</span>
            </div>
          </div>
        )}

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

export default AdminSidebar;