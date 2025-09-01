/**
 * Admin Dashboard Page
 * Main dashboard for admin portal with analytics and overview
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { StatusBadge, LoadingSpinner } from '../../../components/atoms';
import { WarningAlert } from '../../../components/molecules';
import { AIQuery } from '../../../components/shared/AIQuery';
import './AdminDashboard.scss';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  const { admin, makeAuthenticatedRequest, canAccess } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Load dashboard stats
      const [statsResponse, notificationsResponse] = await Promise.all([
        makeAuthenticatedRequest(`/api/admin/dashboard/stats?timeframe=${selectedTimeframe}`),
        makeAuthenticatedRequest('/api/admin/dashboard/notifications?unreadOnly=true&limit=5')
      ]);

      if (statsResponse.ok && notificationsResponse.ok) {
        const statsResult = await statsResponse.json();
        const notificationsResult = await notificationsResponse.json();

        if (statsResult.success) {
          setStats(statsResult.data);
        }

        if (notificationsResult.success) {
          setNotifications(notificationsResult.data.notifications);
        }
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <div className="admin-dashboard__loading">
        <LoadingSpinner size="large" message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__header">
        <div className="admin-dashboard__welcome">
          <h1>Welcome back, {admin?.firstName || admin?.username}! 👋</h1>
          <p>Here's what's happening with your logistics operations today.</p>
        </div>

        <div className="admin-dashboard__controls">
          <select 
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="admin-dashboard__timeframe"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {error && (
        <WarningAlert
          variant="error"
          title="Dashboard Error"
          message={error}
          className="admin-dashboard__error"
        />
      )}

      {stats && (
        <>
          {/* Key Metrics Overview */}
          <div className="admin-dashboard__metrics">
            <div className="admin-dashboard__metric">
              <div className="admin-dashboard__metric-icon">📦</div>
              <div className="admin-dashboard__metric-content">
                <div className="admin-dashboard__metric-value">
                  {formatNumber(stats.overview.totalShipments)}
                </div>
                <div className="admin-dashboard__metric-label">Total Shipments</div>
              </div>
            </div>

            <div className="admin-dashboard__metric">
              <div className="admin-dashboard__metric-icon">📋</div>
              <div className="admin-dashboard__metric-content">
                <div className="admin-dashboard__metric-value">
                  {formatNumber(stats.overview.activeOrders)}
                </div>
                <div className="admin-dashboard__metric-label">Active Orders</div>
              </div>
            </div>

            <div className="admin-dashboard__metric">
              <div className="admin-dashboard__metric-icon">💰</div>
              <div className="admin-dashboard__metric-content">
                <div className="admin-dashboard__metric-value">
                  {formatCurrency(stats.overview.totalRevenue)}
                </div>
                <div className="admin-dashboard__metric-label">Total Revenue</div>
              </div>
            </div>

            <div className="admin-dashboard__metric">
              <div className="admin-dashboard__metric-icon">📈</div>
              <div className="admin-dashboard__metric-content">
                <div className="admin-dashboard__metric-value">
                  {formatCurrency(stats.overview.averageOrderValue)}
                </div>
                <div className="admin-dashboard__metric-label">Avg Order Value</div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="admin-dashboard__grid">
            {/* Alerts & Notifications */}
            <div className="admin-dashboard__card">
              <div className="admin-dashboard__card-header">
                <h3>🚨 Priority Alerts</h3>
                <StatusBadge variant="error" size="small">
                  {stats.alerts.length}
                </StatusBadge>
              </div>
              <div className="admin-dashboard__card-content">
                {stats.alerts.map((alert) => (
                  <div key={alert.id} className="admin-dashboard__alert">
                    <div className="admin-dashboard__alert-content">
                      <strong>{alert.message}</strong>
                      <span className="admin-dashboard__alert-count">
                        {alert.count} items
                      </span>
                    </div>
                    <StatusBadge 
                      variant={alert.priority === 'high' ? 'error' : 'warning'}
                      size="small"
                    >
                      {alert.priority}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="admin-dashboard__card">
              <div className="admin-dashboard__card-header">
                <h3>📊 Recent Activity</h3>
              </div>
              <div className="admin-dashboard__card-content">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="admin-dashboard__activity">
                    <div className="admin-dashboard__activity-content">
                      <div className="admin-dashboard__activity-description">
                        {activity.description}
                      </div>
                      <div className="admin-dashboard__activity-time">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <StatusBadge 
                      variant={
                        activity.priority === 'urgent' ? 'error' :
                        activity.priority === 'high' ? 'warning' : 'info'
                      }
                      size="small"
                    >
                      {activity.priority}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="admin-dashboard__card">
              <div className="admin-dashboard__card-header">
                <h3>📈 Quick Stats</h3>
              </div>
              <div className="admin-dashboard__card-content">
                <div className="admin-dashboard__stats-grid">
                  <div className="admin-dashboard__stat">
                    <div className="admin-dashboard__stat-label">In Transit</div>
                    <div className="admin-dashboard__stat-value">
                      {stats.shipments.inTransit}
                    </div>
                  </div>
                  <div className="admin-dashboard__stat">
                    <div className="admin-dashboard__stat-label">Pending Quotes</div>
                    <div className="admin-dashboard__stat-value">
                      {stats.quotes.pending}
                    </div>
                  </div>
                  <div className="admin-dashboard__stat">
                    <div className="admin-dashboard__stat-label">Active Customers</div>
                    <div className="admin-dashboard__stat-value">
                      {stats.customers.totalActive}
                    </div>
                  </div>
                  <div className="admin-dashboard__stat">
                    <div className="admin-dashboard__stat-label">Delivered</div>
                    <div className="admin-dashboard__stat-value">
                      {stats.shipments.delivered}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Customers */}
            <div className="admin-dashboard__card admin-dashboard__card--wide">
              <div className="admin-dashboard__card-header">
                <h3>🏆 Top Customers</h3>
              </div>
              <div className="admin-dashboard__card-content">
                <div className="admin-dashboard__customers">
                  {stats.customers.topCustomers.map((customer) => (
                    <div key={customer.id} className="admin-dashboard__customer">
                      <div className="admin-dashboard__customer-info">
                        <div className="admin-dashboard__customer-name">
                          {customer.name}
                        </div>
                        <div className="admin-dashboard__customer-stats">
                          {customer.orderCount} orders • {formatCurrency(customer.revenue)}
                        </div>
                      </div>
                      <div className="admin-dashboard__customer-actions">
                        <button 
                          className="admin-dashboard__customer-btn"
                          onClick={() => navigate(`/admin/customers/${customer.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Query Section - Shared Component */}
          {canAccess('ai_query') && (
            <div className="admin-dashboard__ai-section">
              <div className="admin-dashboard__card">
                <div className="admin-dashboard__card-header">
                  <h3>🤖 AI Assistant</h3>
                  <p>Ask questions about operations, compliance, or get insights</p>
                </div>
                <div className="admin-dashboard__card-content">
                  <AIQuery 
                    context="admin"
                    placeholder="Ask about shipments, compliance, customers..."
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;