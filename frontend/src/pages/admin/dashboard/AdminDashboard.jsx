/**
 * Admin Dashboard Page
 * Main dashboard for admin portal with quote management and analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../../config/api.js';
import { Card } from '../../molecules/Card/Card';
import { StatusBadge } from '../../atoms/StatusBadge/StatusBadge';
import { Button } from '../../atoms/Button/Button';
import { LoadingSpinner } from '../../atoms/LoadingSpinner/LoadingSpinner';
import { ErrorMessage } from '../../atoms/ErrorMessage/ErrorMessage';
import { Modal } from '../../atoms/Modal/Modal';
import { QuoteGenerationModal } from '../../organisms/QuoteGenerationModal/QuoteGenerationModal';
import './AdminDashboard.scss';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dashboard data
  const [dashboardStats, setDashboardStats] = useState({
    pendingQuotes: 0,
    activeShipments: 0,
    todaysDeliveries: 0,
    monthlyRevenue: 0
  });
  
  const [pendingShipments, setPendingShipments] = useState([]);
  const [activeQuotes, setActiveQuotes] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data (replace with actual API calls)
      const [statsResponse, shipmentsResponse, quotesResponse] = await Promise.all([
        fetch('/api/admin/dashboard/stats'),
        fetch('/api/admin/quotes'),
        fetch('/api/admin/dashboard/activity')
      ]);

      if (!statsResponse.ok || !shipmentsResponse.ok || !quotesResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const stats = await statsResponse.json();
      const shipmentsData = await shipmentsResponse.json();
      const quotesData = await quotesResponse.json();

      setDashboardStats(stats.data || {});
      setPendingShipments(shipmentsData.data?.pendingShipments || []);
      setActiveQuotes(shipmentsData.data?.activeQuotes || []);
      
    } catch (err) {
      setError(err.message);
      console.error('Dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle quote generation
  const handleGenerateQuote = useCallback((shipment) => {
    setSelectedShipment(shipment);
    setShowQuoteModal(true);
  }, []);

  const handleQuoteGenerated = useCallback(() => {
    setShowQuoteModal(false);
    setSelectedShipment(null);
    loadDashboardData(); // Refresh data
  }, [loadDashboardData]);

  // Handle shipment review
  const handleReviewShipment = useCallback(async (shipmentId) => {
    try {
      const response = await apiRequest(`/shipments/${shipmentId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          status: 'UNDER_REVIEW',
          notes: 'Admin started review process'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update shipment status');
      }

      // Refresh data
      loadDashboardData();
    } catch (err) {
      console.error('Failed to review shipment:', err);
      setError(err.message);
    }
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="admin-dashboard admin-dashboard--loading">
        <LoadingSpinner size="large" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <ErrorMessage message={error} />
        <Button onClick={loadDashboardData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">Admin Dashboard</h1>
        <p className="admin-dashboard__subtitle">
          Manage quotes, shipments, and track logistics operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="admin-dashboard__stats">
        <Card className="admin-dashboard__stat-card">
          <div className="admin-dashboard__stat-icon">💰</div>
          <div className="admin-dashboard__stat-content">
            <h3 className="admin-dashboard__stat-value">{dashboardStats.pendingQuotes}</h3>
            <p className="admin-dashboard__stat-label">Pending Quotes</p>
          </div>
        </Card>

        <Card className="admin-dashboard__stat-card">
          <div className="admin-dashboard__stat-icon">📦</div>
          <div className="admin-dashboard__stat-content">
            <h3 className="admin-dashboard__stat-value">{dashboardStats.activeShipments}</h3>
            <p className="admin-dashboard__stat-label">Active Shipments</p>
          </div>
        </Card>

        <Card className="admin-dashboard__stat-card">
          <div className="admin-dashboard__stat-icon">🚚</div>
          <div className="admin-dashboard__stat-content">
            <h3 className="admin-dashboard__stat-value">{dashboardStats.todaysDeliveries}</h3>
            <p className="admin-dashboard__stat-label">Today's Deliveries</p>
          </div>
        </Card>

        <Card className="admin-dashboard__stat-card">
          <div className="admin-dashboard__stat-icon">💵</div>
          <div className="admin-dashboard__stat-content">
            <h3 className="admin-dashboard__stat-value">
              ${dashboardStats.monthlyRevenue?.toLocaleString() || '0'}
            </h3>
            <p className="admin-dashboard__stat-label">Revenue This Month</p>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="admin-dashboard__content">
        {/* Pending Quote Requests */}
        <div className="admin-dashboard__section">
          <Card>
            <div className="admin-dashboard__section-header">
              <h2 className="admin-dashboard__section-title">
                🔍 Pending Quote Requests
              </h2>
              <StatusBadge 
                status={pendingShipments.length > 0 ? 'warning' : 'success'} 
                text={`${pendingShipments.length} pending`}
              />
            </div>

            <div className="admin-dashboard__quote-requests">
              {pendingShipments.length === 0 ? (
                <div className="admin-dashboard__empty">
                  <p>No pending quote requests</p>
                </div>
              ) : (
                pendingShipments.map((shipment) => (
                  <div key={shipment.shipment_id} className="admin-dashboard__quote-card">
                    <div className="admin-dashboard__quote-info">
                      <div className="admin-dashboard__quote-header">
                        <h4 className="admin-dashboard__quote-title">
                          {shipment.reference || `Shipment #${shipment.shipment_id}`}
                        </h4>
                        <StatusBadge status={shipment.status.toLowerCase()} />
                      </div>
                      
                      <div className="admin-dashboard__quote-details">
                        <p><strong>Customer:</strong> {shipment.customer_name}</p>
                        <p><strong>Route:</strong> {shipment.origin} → {shipment.destination}</p>
                        <p><strong>Documents:</strong> {shipment.document_count} uploaded</p>
                        {shipment.package_weight_kg && (
                          <p><strong>Weight:</strong> {shipment.package_weight_kg} kg</p>
                        )}
                      </div>

                      {shipment.documents && shipment.documents.length > 0 && (
                        <div className="admin-dashboard__quote-documents">
                          <strong>Documents:</strong>
                          <ul>
                            {shipment.documents.slice(0, 3).map((doc, index) => (
                              <li key={index}>{doc}</li>
                            ))}
                            {shipment.documents.length > 3 && (
                              <li>+{shipment.documents.length - 3} more...</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="admin-dashboard__quote-actions">
                      {shipment.status === 'PENDING_QUOTE' && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleReviewShipment(shipment.shipment_id)}
                        >
                          Start Review
                        </Button>
                      )}
                      
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleGenerateQuote(shipment)}
                      >
                        Generate Quote
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Active Quotes */}
        {activeQuotes.length > 0 && (
          <div className="admin-dashboard__section">
            <Card>
              <div className="admin-dashboard__section-header">
                <h2 className="admin-dashboard__section-title">
                  📋 Active Quotes
                </h2>
                <StatusBadge 
                  status="info" 
                  text={`${activeQuotes.length} active`}
                />
              </div>

              <div className="admin-dashboard__active-quotes">
                {activeQuotes.map((quote) => (
                  <div key={quote.id} className="admin-dashboard__quote-card">
                    <div className="admin-dashboard__quote-info">
                      <div className="admin-dashboard__quote-header">
                        <h4 className="admin-dashboard__quote-title">
                          {quote.quote_number}
                        </h4>
                        <div className="admin-dashboard__quote-value">
                          ${quote.total_cost?.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="admin-dashboard__quote-details">
                        <p><strong>Customer:</strong> {quote.customer_name}</p>
                        <p><strong>Shipment:</strong> {quote.reference}</p>
                        <p><strong>Valid Until:</strong> {new Date(quote.valid_until).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="admin-dashboard__quote-actions">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => window.open(`/admin/quotes/${quote.id}`, '_blank')}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="admin-dashboard__section">
          <Card>
            <h2 className="admin-dashboard__section-title">⚡ Quick Actions</h2>
            <div className="admin-dashboard__quick-actions">
              <Button
                variant="primary"
                onClick={() => window.location.href = '/admin/shipments'}
              >
                📦 Manage All Shipments
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/admin/quotes'}
              >
                💰 View All Quotes
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/admin/analytics'}
              >
                📊 View Analytics
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/admin/calendar'}
              >
                📅 View Calendar
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Quote Generation Modal */}
      {showQuoteModal && selectedShipment && (
        <Modal
          isOpen={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          title="Generate Quote"
          size="large"
        >
          <QuoteGenerationModal
            shipment={selectedShipment}
            onQuoteGenerated={handleQuoteGenerated}
            onCancel={() => setShowQuoteModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;