/**
 * Admin Dashboard Home
 * Main dashboard view for administrators
 */

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import './AdminDashboardHome.scss';

const AdminDashboardHome = () => {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState({
    totalShipments: 0,
    activeCustomers: 0,
    pendingReviews: 0,
    systemAlerts: 0
  });

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setStats({
      totalShipments: 1247,
      activeCustomers: 89,
      pendingReviews: 23,
      systemAlerts: 3
    });
  }, []);

  return (
    <div className="admin-dashboard-home">
      <div className="dashboard-container">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1>Welcome back, {admin?.first_name}!</h1>
          <p>Here's what's happening in your 3PL system today.</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalShipments}</div>
              <div className="stat-label">Total Shipments</div>
              <div className="stat-trend positive">+12% from last month</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeCustomers}</div>
              <div className="stat-label">Active Customers</div>
              <div className="stat-trend positive">+5 new this week</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats.pendingReviews}</div>
              <div className="stat-label">Pending Reviews</div>
              <div className="stat-trend neutral">Requires attention</div>
            </div>
          </div>

          <div className="stat-card alert">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{stats.systemAlerts}</div>
              <div className="stat-label">System Alerts</div>
              <div className="stat-trend negative">Action needed</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">✅</div>
              <div className="activity-content">
                <div className="activity-title">Shipment SH-2024-001 approved</div>
                <div className="activity-meta">By Tech Corp Solutions • 2 hours ago</div>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon">👤</div>
              <div className="activity-content">
                <div className="activity-title">New customer registration</div>
                <div className="activity-meta">Fashion House International • 4 hours ago</div>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon">📋</div>
              <div className="activity-content">
                <div className="activity-title">Compliance review completed</div>
                <div className="activity-meta">Global Imports Ltd • 6 hours ago</div>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon">🚨</div>
              <div className="activity-content">
                <div className="activity-title">System maintenance scheduled</div>
                <div className="activity-meta">Tomorrow at 02:00 AM • System</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="actions-section">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-card">
              <div className="action-icon">🔍</div>
              <div className="action-label">Review Shipments</div>
            </button>

            <button className="action-card">
              <div className="action-icon">👥</div>
              <div className="action-label">Manage Customers</div>
            </button>

            <button className="action-card">
              <div className="action-icon">📊</div>
              <div className="action-label">Generate Reports</div>
            </button>

            <button className="action-card">
              <div className="action-icon">⚙️</div>
              <div className="action-label">System Settings</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;