/**
 * Manage Shipments - Admin View
 * Admin interface for managing all customer shipments
 */

import React, { useState, useEffect } from 'react';
import './ManageShipments.scss';

const ManageShipments = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setTimeout(() => {
      setShipments([
        {
          id: 'SH-2024-001',
          customer: 'Tech Corp Solutions',
          origin: 'Singapore',
          destination: 'Los Angeles',
          status: 'in_transit',
          value: '$25,000',
          created: '2024-01-15',
          updated: '2024-01-16'
        },
        {
          id: 'SH-2024-002',
          customer: 'Global Imports Ltd',
          origin: 'Hong Kong',
          destination: 'New York',
          status: 'pending_review',
          value: '$45,000',
          created: '2024-01-14',
          updated: '2024-01-15'
        },
        {
          id: 'SH-2024-003',
          customer: 'Fashion House International',
          origin: 'Shanghai',
          destination: 'London',
          status: 'completed',
          value: '$18,000',
          created: '2024-01-12',
          updated: '2024-01-14'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      in_transit: { label: 'In Transit', className: 'status-transit' },
      pending_review: { label: 'Pending Review', className: 'status-pending' },
      completed: { label: 'Completed', className: 'status-completed' },
      cancelled: { label: 'Cancelled', className: 'status-cancelled' }
    };

    const config = statusConfig[status] || { label: status, className: 'status-default' };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const filteredShipments = filter === 'all' 
    ? shipments 
    : shipments.filter(s => s.status === filter);

  if (loading) {
    return (
      <div className="manage-shipments">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-shipments">
      <div className="shipments-container">
        {/* Header */}
        <div className="shipments-header">
          <div className="header-left">
            <h1>Manage Shipments</h1>
            <p>View and manage all customer shipments</p>
          </div>
          
          <div className="header-actions">
            <button className="btn-secondary">Export Data</button>
            <button className="btn-primary">New Shipment</button>
          </div>
        </div>

        {/* Filters */}
        <div className="shipments-filters">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({shipments.length})
            </button>
            <button 
              className={`filter-tab ${filter === 'pending_review' ? 'active' : ''}`}
              onClick={() => setFilter('pending_review')}
            >
              Pending Review ({shipments.filter(s => s.status === 'pending_review').length})
            </button>
            <button 
              className={`filter-tab ${filter === 'in_transit' ? 'active' : ''}`}
              onClick={() => setFilter('in_transit')}
            >
              In Transit ({shipments.filter(s => s.status === 'in_transit').length})
            </button>
            <button 
              className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed ({shipments.filter(s => s.status === 'completed').length})
            </button>
          </div>

          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search shipments..." 
              className="search-input"
            />
          </div>
        </div>

        {/* Shipments Table */}
        <div className="shipments-table-container">
          <table className="shipments-table">
            <thead>
              <tr>
                <th>Shipment ID</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Status</th>
                <th>Value</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map(shipment => (
                <tr key={shipment.id}>
                  <td className="shipment-id">{shipment.id}</td>
                  <td className="customer-name">{shipment.customer}</td>
                  <td className="route">
                    {shipment.origin} → {shipment.destination}
                  </td>
                  <td className="status">
                    {getStatusBadge(shipment.status)}
                  </td>
                  <td className="value">{shipment.value}</td>
                  <td className="created">{shipment.created}</td>
                  <td className="actions">
                    <button className="action-btn view">👁️</button>
                    <button className="action-btn edit">✏️</button>
                    <button className="action-btn delete">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredShipments.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No shipments found</h3>
              <p>No shipments match your current filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageShipments;