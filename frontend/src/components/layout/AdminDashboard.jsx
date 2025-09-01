/**
 * Admin Dashboard Layout
 * Main layout component with sidebar navigation for authenticated admins
 */

import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import AdminSidebar from './AdminSidebar';

// Import page components
import AIQuery from '../AIQuery';
import AdminDashboardHome from '../admin/AdminDashboardHome';
import ManageShipments from '../admin/ManageShipments';
import ShipmentDetails from '../ShipmentDetails';

import './AdminDashboard.scss';

const AdminDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <AdminSidebar 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        admin={admin}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`dashboard-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <button 
              className="sidebar-toggle"
              onClick={handleToggleSidebar}
            >
              ☰
            </button>
            <h1>3PL Admin Portal</h1>
            <div className="admin-badge">Administrator</div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">
                {admin?.first_name} {admin?.last_name}
              </span>
              <span className="user-role">System Administrator</span>
            </div>
            <div className="user-avatar admin">
              {admin?.first_name?.charAt(0)}{admin?.last_name?.charAt(0)}
            </div>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          <Routes>
            {/* Default route - Dashboard */}
            <Route path="/" element={<AdminDashboardHome />} />
            
            {/* Navigation routes */}
            <Route path="/dashboard" element={<AdminDashboardHome />} />
            <Route path="/ai-query" element={<AIQuery />} />
            <Route path="/manage-shipments" element={<ManageShipments />} />
            <Route path="/shipment/:shipmentId" element={<ShipmentDetails />} />
            
            {/* Catch-all redirect to Dashboard */}
            <Route path="*" element={<AdminDashboardHome />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;