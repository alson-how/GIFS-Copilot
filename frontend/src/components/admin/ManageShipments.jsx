/**
 * Manage Shipments - Admin View
 * Admin interface for managing all customer shipments
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../config/api.js';
import './ManageShipments.scss';

const ManageShipments = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalShipments, setTotalShipments] = useState(0);

  // Fetch shipments from API
  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(filter !== 'all' && { status: filter }),
        ...(searchTerm && { search: searchTerm })
      });

      // Try admin endpoint first, then fallback to public endpoint
      let response;
      try {
        const token1 = localStorage.getItem('admin_access_token');
        const token2 = localStorage.getItem('admin_token');
        const finalToken = token1 || token2;
        
        console.log('🔍 ManageShipments token debug:');
        console.log('  - admin_access_token:', token1?.substring(0, 50) + '...' || token1);
        console.log('  - admin_token:', token2?.substring(0, 50) + '...' || token2);
        console.log('  - final token:', finalToken?.substring(0, 50) + '...' || finalToken);
        console.log('  - is null string?', finalToken === 'null');
        console.log('  - sending Authorization header:', `Bearer ${finalToken}`);
        
        response = await apiRequest(`/admin/shipments?${params}`, {
          headers: {
            'Authorization': `Bearer ${finalToken}`
          }
        });
      } catch (adminError) {
        // Admin endpoint doesn't exist, use public shipments endpoint
        response = await apiRequest(`/shipments?${params}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('🔍 Shipments API response:', data);
      
      if (data.success) {
        // Standardized response format: data.shipments[]
        const shipments = data.data.shipments || [];
        console.log('🔍 First few shipments data:', shipments.slice(0, 3));
        console.log('🔍 Sample shipment status values:', shipments.slice(0, 5).map(s => ({ id: s.shipment_id, status: s.status })));
        
        setShipments(shipments);
        setTotalShipments(data.data.pagination?.total || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch shipments');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [currentPage, filter, searchTerm]);

  // Handle navigation to shipment details
  const handleShipmentClick = (shipmentId) => {
    navigate(`/admin/shipment/${shipmentId}`);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency value
  const formatValue = (value) => {
    if (!value) return 'Not specified';
    return typeof value === 'number' ? `$${value.toLocaleString()}` : value;
  };

  // Get status badge with proper enum mapping
  const getStatusBadge = (status) => {
    console.log('🔍 getStatusBadge called with status:', status, 'type:', typeof status);
    
    const statusConfig = {
      'CREATED': { label: 'Created', className: 'status-created' },
      'PENDING_QUOTE': { label: 'Pending Quote', className: 'status-pending' },
      'UNDER_REVIEW': { label: 'Under Review', className: 'status-review' },
      'QUOTED': { label: 'Quoted', className: 'status-quoted' },
      'CONFIRMED': { label: 'Confirmed', className: 'status-confirmed' },
      'PICKUP_SCHEDULED': { label: 'Pickup Scheduled', className: 'status-scheduled' },
      'PICKED_UP': { label: 'Picked Up', className: 'status-pickup' },
      'AT_WAREHOUSE': { label: 'At Warehouse', className: 'status-warehouse' },
      'CUSTOMS_EXPORT': { label: 'Customs Export', className: 'status-customs' },
      'IN_TRANSIT': { label: 'In Transit', className: 'status-transit' },
      'ARRIVED_DESTINATION': { label: 'Arrived', className: 'status-arrived' },
      'CUSTOMS_IMPORT': { label: 'Customs Import', className: 'status-customs' },
      'OUT_FOR_DELIVERY': { label: 'Out for Delivery', className: 'status-delivery' },
      'DELIVERED': { label: 'Delivered', className: 'status-completed' },
      'CANCELLED': { label: 'Cancelled', className: 'status-cancelled' },
      'EXPIRED': { label: 'Expired', className: 'status-expired' },
      // Legacy status mapping
      'in_transit': { label: 'In Transit', className: 'status-transit' },
      'pending_review': { label: 'Pending Review', className: 'status-pending' },
      'completed': { label: 'Completed', className: 'status-completed' },
      'cancelled': { label: 'Cancelled', className: 'status-cancelled' }
    };

    const config = statusConfig[status] || { label: status?.replace('_', ' ') || 'Unknown', className: 'status-default' };
    
    console.log('🔍 Status badge config:', { status, config, className: `status-badge ${config.className}` });
    
    // Inline styles to force visibility
    const inlineStyles = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      backgroundColor: '#e6f3ff',
      color: '#2b6cb0',
      border: '1px solid #bee3f8',
      display: 'inline-block'
    };
    
    const badge = (
      <span 
        className={`status-badge ${config.className}`}
        style={inlineStyles}
      >
        {config.label}
      </span>
    );
    console.log('🔍 Status badge element:', badge);
    
    return badge;
  };

  // Filter shipments based on current filter and search term  
  const filteredShipments = shipments.filter(shipment => {
    const matchesFilter = filter === 'all' || shipment.status === filter || 
      (filter === 'pending_review' && ['PENDING_QUOTE', 'UNDER_REVIEW'].includes(shipment.status)) ||
      (filter === 'in_transit' && ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.status)) ||
      (filter === 'completed' && shipment.status === 'DELIVERED');
    
    const matchesSearch = !searchTerm || 
      (shipment.shipment_id || shipment.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shipment.end_user_name || shipment.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shipment.destination_country || shipment.destination || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

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

  if (error) {
    return (
      <div className="manage-shipments">
        <div className="error-container">
          <div className="error-message">
            <h3>Error Loading Shipments</h3>
            <p>{error}</p>
            <button onClick={fetchShipments} className="btn-primary">
              Retry
            </button>
          </div>
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
              Pending Review ({shipments.filter(s => ['PENDING_QUOTE', 'UNDER_REVIEW'].includes(s.status) || s.status === 'pending_review').length})
            </button>
            <button 
              className={`filter-tab ${filter === 'in_transit' ? 'active' : ''}`}
              onClick={() => setFilter('in_transit')}
            >
              In Transit ({shipments.filter(s => ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status) || s.status === 'in_transit').length})
            </button>
            <button 
              className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed ({shipments.filter(s => s.status === 'DELIVERED' || s.status === 'completed').length})
            </button>
          </div>

          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search shipments..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Shipments Table */}
        <div className="shipments-table-container">
          <table className="shipments-table">
            <thead>
              <tr>
                <th>Shipment ID</th>
                <th>Customer/End User</th>
                <th>Route</th>
                <th>Status</th>
                <th>Value</th>
                <th>Export Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map(shipment => (
                <tr key={shipment.shipment_id || shipment.id} 
                    onClick={() => handleShipmentClick(shipment.shipment_id || shipment.id)}
                    style={{ cursor: 'pointer' }}>
                  <td className="shipment-id">{shipment.shipment_id || shipment.id}</td>
                  <td className="customer-name">{shipment.end_user_name || shipment.customer || 'Not specified'}</td>
                  <td className="route">
                    {shipment.tech_origin || shipment.origin || 'N/A'} → {shipment.destination_country || shipment.destination || 'N/A'}
                  </td>
                  <td className="status">
                    {/* Original status badge */}
                    {getStatusBadge(shipment.status)}
                  </td>
                  <td className="value">
                    {formatValue(shipment.commercial_value || shipment.value)}
                  </td>
                  <td className="created">{formatDate(shipment.export_date || shipment.created_at || shipment.created)}</td>
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="action-btn view"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShipmentClick(shipment.shipment_id || shipment.id);
                      }}
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button 
                      className="action-btn edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShipmentClick(shipment.shipment_id || shipment.id);
                      }}
                      title="Edit Shipment"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredShipments.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No shipments found</h3>
              <p>No shipments match your current filter criteria.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalShipments > itemsPerPage && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalShipments)} to{' '}
              {Math.min(currentPage * itemsPerPage, totalShipments)} of {totalShipments} shipments
            </div>
            
            <div className="pagination-controls">
              <button 
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
              
              <span className="page-info">
                Page {currentPage} of {Math.ceil(totalShipments / itemsPerPage)}
              </span>
              
              <button 
                className="pagination-btn"
                disabled={currentPage >= Math.ceil(totalShipments / itemsPerPage)}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageShipments;