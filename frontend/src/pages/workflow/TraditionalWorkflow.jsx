/**
 * Traditional Workflow Page
 * Main workflow interface for authenticated customers
 */

import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { customerAxios } from '../../utils/axiosConfig';
import './TraditionalWorkflow.scss';

const TraditionalWorkflow = () => {
  const { customer, logout } = useCustomerAuth();
  const [loading, setLoading] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Load workflow data when component mounts
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);
      
      // Example API call using authenticated axios instance
      const response = await customerAxios.get('/workflows');
      
      if (response.data.success) {
        setWorkflows(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load workflow data:', error);
      // Handle error (show notification, etc.)
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    // Navigation will be handled by the auth context
  };

  const TabButton = ({ tabId, label, isActive, onClick }) => (
    <button
      className={`tab-button ${isActive ? 'active' : ''}`}
      onClick={() => onClick(tabId)}
    >
      {label}
    </button>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="tab-content">
            <h3>Workflow Overview</h3>
            <div className="overview-grid">
              <div className="stat-card">
                <div className="stat-value">12</div>
                <div className="stat-label">Active Workflows</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">8</div>
                <div className="stat-label">Pending Reviews</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">24</div>
                <div className="stat-label">Completed This Month</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">3</div>
                <div className="stat-label">Urgent Items</div>
              </div>
            </div>
            
            <div className="recent-activity">
              <h4>Recent Activity</h4>
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon">📋</div>
                  <div className="activity-details">
                    <div className="activity-title">New shipment created</div>
                    <div className="activity-time">2 hours ago</div>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">✅</div>
                  <div className="activity-details">
                    <div className="activity-title">Documentation approved</div>
                    <div className="activity-time">4 hours ago</div>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">🚚</div>
                  <div className="activity-details">
                    <div className="activity-title">Shipment in transit</div>
                    <div className="activity-time">1 day ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'workflows':
        return (
          <div className="tab-content">
            <div className="section-header">
              <h3>My Workflows</h3>
              <button className="btn-primary">+ New Workflow</button>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading workflows...</p>
              </div>
            ) : (
              <div className="workflows-grid">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="workflow-card">
                    <div className="workflow-header">
                      <h4>Shipment WF-2024-{item.toString().padStart(3, '0')}</h4>
                      <span className="status-badge in-progress">In Progress</span>
                    </div>
                    <div className="workflow-details">
                      <p><strong>Origin:</strong> Singapore</p>
                      <p><strong>Destination:</strong> Los Angeles</p>
                      <p><strong>Items:</strong> 150 units</p>
                      <p><strong>Created:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="workflow-actions">
                      <button className="btn-secondary">View Details</button>
                      <button className="btn-primary">Continue</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'documents':
        return (
          <div className="tab-content">
            <h3>Documents</h3>
            <div className="documents-section">
              <div className="document-categories">
                <div className="category-card">
                  <h4>Shipping Documents</h4>
                  <div className="document-count">12 files</div>
                  <button className="btn-outline">View All</button>
                </div>
                <div className="category-card">
                  <h4>Customs Documentation</h4>
                  <div className="document-count">8 files</div>
                  <button className="btn-outline">View All</button>
                </div>
                <div className="category-card">
                  <h4>Compliance Reports</h4>
                  <div className="document-count">5 files</div>
                  <button className="btn-outline">View All</button>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="tab-content">
            <h3>Account Settings</h3>
            <div className="settings-section">
              <div className="setting-group">
                <h4>Profile Information</h4>
                <div className="setting-item">
                  <label>Company Name</label>
                  <input type="text" value={customer?.company_name || ''} readOnly />
                </div>
                <div className="setting-item">
                  <label>Contact Email</label>
                  <input type="email" value={customer?.email || ''} readOnly />
                </div>
                <div className="setting-item">
                  <label>Phone Number</label>
                  <input type="tel" value={customer?.phone || ''} readOnly />
                </div>
              </div>
              
              <div className="setting-group">
                <h4>Security</h4>
                <button className="btn-outline">Change Password</button>
                <button className="btn-outline">Two-Factor Authentication</button>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div className="tab-content">Content not found</div>;
    }
  };

  return (
    <div className="traditional-workflow">
      {/* Header */}
      <header className="workflow-header">
        <div className="header-left">
          <h1>3PL Logistics Platform</h1>
          <p>Traditional Workflow</p>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">
                {customer?.first_name} {customer?.last_name}
              </span>
              <span className="user-company">{customer?.company_name}</span>
            </div>
            <div className="user-avatar">
              {customer?.first_name?.charAt(0)}{customer?.last_name?.charAt(0)}
            </div>
          </div>
          
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="workflow-nav">
        <div className="nav-tabs">
          <TabButton
            tabId="overview"
            label="Overview"
            isActive={activeTab === 'overview'}
            onClick={setActiveTab}
          />
          <TabButton
            tabId="workflows"
            label="Workflows"
            isActive={activeTab === 'workflows'}
            onClick={setActiveTab}
          />
          <TabButton
            tabId="documents"
            label="Documents"
            isActive={activeTab === 'documents'}
            onClick={setActiveTab}
          />
          <TabButton
            tabId="settings"
            label="Settings"
            isActive={activeTab === 'settings'}
            onClick={setActiveTab}
          />
        </div>
      </nav>

      {/* Main Content */}
      <main className="workflow-main">
        <div className="content-container">
          {renderTabContent()}
        </div>
      </main>

      {/* Welcome Message for First Time Users */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <h3>🎉 Welcome to your Logistics Dashboard!</h3>
          <p>
            You're successfully logged in as <strong>{customer?.company_name}</strong>. 
            This is your Traditional Workflow interface where you can manage shipments, 
            track documentation, and monitor your logistics operations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TraditionalWorkflow;