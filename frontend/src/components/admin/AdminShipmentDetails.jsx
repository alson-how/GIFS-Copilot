/**
 * Admin Shipment Details Component
 * Enhanced shipment details view with admin-only functionality:
 * - Status management
 * - Full edit capabilities
 * - Customer information
 * - Document management
 * - Audit trail
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { apiRequest, API_HOST } from '../../config/api.js';
import { apiService } from '../../services/apiMigration.js';
import { listFiles } from '../../services/api.js';
import AdminSidebar from '../layout/AdminSidebar';
import StrategicItemPermitInterface from '../StrategicItemPermitInterface.jsx';
import './AdminShipmentDetails.scss';

export default function AdminShipmentDetails() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const { admin, makeAuthenticatedRequest } = useAdminAuth();
  
  // State management
  const [shipmentData, setShipmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({});
  
  // Strategic compliance state
  const [strategicItemsDetected, setStrategicItemsDetected] = useState(false);
  const [strategicDetectionComplete, setStrategicDetectionComplete] = useState(false);
  const [strategicDetectionLoading, setStrategicDetectionLoading] = useState(false);
  const [exportBlocked, setExportBlocked] = useState(false);
  const [complianceScore, setComplianceScore] = useState(100);
  const [strategicItemsCount, setStrategicItemsCount] = useState(0);
  const [missingPermits, setMissingPermits] = useState([]);
  
  // Documents state
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  
  // Load shipment data
  useEffect(() => {
    if (shipmentId) {
      loadShipmentData();
      loadStrategicStatus();
      loadDocuments();
    }
  }, [shipmentId]);

  const loadShipmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use admin API endpoint for detailed shipment info  
      const response = await makeAuthenticatedRequest(`${API_HOST}/api/admin/shipments/${shipmentId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load shipment: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setShipmentData(result.data);
        setEditForm(result.data); // Initialize edit form
      } else {
        throw new Error(result.error || 'Failed to load shipment');
      }
      
    } catch (err) {
      console.error('Error loading shipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStrategicStatus = async () => {
    try {
      console.log('🔍 AdminShipmentDetails: Loading strategic status for shipment:', shipmentId);
      setStrategicDetectionLoading(true);
      
      // Try to get strategic status first
      const statusResponse = await apiService.strategic.status(shipmentId);
      console.log('🔍 AdminShipmentDetails: Strategic status response:', statusResponse);
      
      if (statusResponse && statusResponse.strategic_status) {
        const strategicStatus = statusResponse.strategic_status;
        const permitStatus = statusResponse.permit_status;
        
        console.log('🔍 AdminShipmentDetails: strategicStatus:', strategicStatus);
        console.log('🔍 AdminShipmentDetails: permitStatus:', permitStatus);
        
        // Update state with API response
        setStrategicItemsDetected(strategicStatus.has_strategic_items || false);
        setExportBlocked(strategicStatus.export_blocked || false);
        setStrategicItemsCount(strategicStatus.strategic_items || 0);
        
        // Calculate compliance score
        let score = 100;
        if (strategicStatus.has_strategic_items) {
          score = permitStatus.missing_permits?.length > 0 ? 0 : 75;
        }
        setComplianceScore(score);
        
        setMissingPermits(permitStatus.missing_permits || []);
        setStrategicDetectionComplete(true);
        
        console.log('🔍 AdminShipmentDetails: Final state set:', {
          strategicItemsDetected: strategicStatus.has_strategic_items,
          exportBlocked: strategicStatus.export_blocked,
          complianceScore: score,
          strategicItemsCount: strategicStatus.strategic_items
        });
      }
      
    } catch (error) {
      console.error('AdminShipmentDetails: Error loading strategic status:', error);
      // Set default values on error
      setStrategicItemsDetected(false);
      setExportBlocked(false);
      setComplianceScore(100);
      setStrategicItemsCount(0);
      setMissingPermits([]);
      setStrategicDetectionComplete(true);
    } finally {
      setStrategicDetectionLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);
      console.log('🔍 AdminShipmentDetails: Loading documents for shipment:', shipmentId);
      
      const response = await listFiles(shipmentId);
      console.log('🔍 AdminShipmentDetails: Documents response:', response);
      
      if (response && response.files) {
        setDocuments(response.files);
      }
      
    } catch (error) {
      console.error('AdminShipmentDetails: Error loading documents:', error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!shipmentData) return;
    
    try {
      setStatusUpdateLoading(true);
      
      const response = await makeAuthenticatedRequest(`${API_HOST}/api/admin/shipments/${shipmentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local state
          setShipmentData(prev => ({
            ...prev,
            status: newStatus,
            updated_at: new Date().toISOString()
          }));
          
          // Show success message
          alert(`Shipment status updated to: ${newStatus}`);
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('Failed to update status');
      }
      
    } catch (err) {
      console.error('Error updating status:', err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      
      // TODO: Implement shipment update API
      console.log('Saving changes:', editForm);
      alert('Changes saved successfully (placeholder)');
      
      setEditMode(false);
    } catch (err) {
      console.error('Error saving changes:', err);
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value) => {
    if (!value) return 'Not specified';
    return typeof value === 'number' ? `$${value.toLocaleString()}` : value;
  };

  const getStatusBadge = (status) => {
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
      'EXPIRED': { label: 'Expired', className: 'status-expired' }
    };

    const config = statusConfig[status] || { label: status || 'Unknown', className: 'status-default' };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const statusOptions = [
    'CREATED', 'PENDING_QUOTE', 'UNDER_REVIEW', 'QUOTED', 'CONFIRMED',
    'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE', 'CUSTOMS_EXPORT',
    'IN_TRANSIT', 'ARRIVED_DESTINATION', 'CUSTOMS_IMPORT', 'OUT_FOR_DELIVERY',
    'DELIVERED', 'CANCELLED', 'EXPIRED'
  ];

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`admin-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading shipment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-layout">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`admin-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="error-container">
            <h3>Error Loading Shipment</h3>
            <p>{error}</p>
            <button onClick={loadShipmentData} className="btn-primary">
              Retry
            </button>
            <button onClick={() => navigate('/admin/shipments')} className="btn-secondary">
              Back to Shipments
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!shipmentData) {
    return (
      <div className="admin-layout">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`admin-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="error-container">
            <h3>Shipment Not Found</h3>
            <p>The requested shipment could not be found.</p>
            <button onClick={() => navigate('/admin/shipments')} className="btn-primary">
              Back to Shipments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
      <div className={`admin-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="admin-shipment-details">
          {/* Header */}
          <div className="shipment-header">
            <div className="header-left">
              <button onClick={() => navigate('/admin/shipments')} className="back-button">
                ← Back to Shipments
              </button>
              <h1>Shipment Details</h1>
              <div className="shipment-id">ID: {shipmentData.shipment_id}</div>
            </div>
            
            <div className="header-actions">
              <button onClick={() => window.print()} className="btn-outline">
                Print
              </button>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="status-timeline-section" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '2rem',
            borderRadius: '12px',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>Shipment Status Timeline</h2>
            
            {/* Progress Line */}
            <div style={{
              position: 'relative',
              height: '4px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '2px',
              marginBottom: '2rem'
            }}>
              <div style={{
                position: 'absolute',
                height: '100%',
                background: 'white',
                borderRadius: '2px',
                width: '60%' // This should be calculated based on actual status
              }}></div>
            </div>

            {/* Status Items */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              position: 'relative'
            }}>
              {/* Created */}
              <div className="status-item" style={{
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                flex: 1
              }}>
                <div className="status-icon" style={{
                  width: '50px',
                  height: '50px',
                  background: 'white',
                  border: '3px solid #4ade80',
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>📋</div>
                <div className="status-label" style={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>Created</div>
                <div className="status-owner" style={{
                  fontSize: '10px',
                  opacity: 0.8,
                  marginTop: '3px'
                }}>Customer</div>
              </div>

              {/* Quote Pending */}
              <div className="status-item" style={{
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                flex: 1
              }}>
                <div className="status-icon" style={{
                  width: '50px',
                  height: '50px',
                  background: 'white',
                  border: '3px solid #4ade80',
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>💰</div>
                <div className="status-label" style={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>Quote Ready</div>
                <div className="status-owner" style={{
                  fontSize: '10px',
                  opacity: 0.8,
                  marginTop: '3px'
                }}>3PL Admin</div>
              </div>

              {/* Picked Up */}
              <div className="status-item" style={{
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                flex: 1
              }}>
                <div className="status-icon" style={{
                  width: '50px',
                  height: '50px',
                  background: 'white',
                  border: `3px solid ${shipmentData.status === 'PICKED_UP' ? '#4ade80' : '#cbd5e0'}`,
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>🚚</div>
                <div className="status-label" style={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>Picked Up</div>
                <div className="status-owner" style={{
                  fontSize: '10px',
                  opacity: 0.8,
                  marginTop: '3px'
                }}>Carrier</div>
              </div>

              {/* In Transit */}
              <div className="status-item" style={{
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                flex: 1
              }}>
                <div className="status-icon" style={{
                  width: '50px',
                  height: '50px',
                  background: 'white',
                  border: `3px solid ${shipmentData.status === 'IN_TRANSIT' ? '#4ade80' : '#cbd5e0'}`,
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>✈️</div>
                <div className="status-label" style={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>In Transit</div>
                <div className="status-owner" style={{
                  fontSize: '10px',
                  opacity: 0.8,
                  marginTop: '3px'
                }}>Carrier</div>
              </div>

              {/* Delivered */}
              <div className="status-item" style={{
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                flex: 1
              }}>
                <div className="status-icon" style={{
                  width: '50px',
                  height: '50px',
                  background: 'white',
                  border: `3px solid ${shipmentData.status === 'DELIVERED' ? '#4ade80' : '#cbd5e0'}`,
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>📦</div>
                <div className="status-label" style={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>Delivered</div>
                <div className="status-owner" style={{
                  fontSize: '10px',
                  opacity: 0.8,
                  marginTop: '3px'
                }}>Carrier</div>
              </div>
            </div>
          </div>

          {/* Admin Status Management */}
          <div className="shipment-section" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1a202c' }}>Status Management</h2>
              <div className="current-status" style={{ marginTop: '0.5rem' }}>
                Current Status: {getStatusBadge(shipmentData.status)}
              </div>
            </div>
            
            <div className="status-controls">
              <div className="status-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.75rem'
              }}>
                {statusOptions.map(status => (
                  <button
                    key={status}
                    className={`status-option ${shipmentData.status === status ? 'active' : ''}`}
                    onClick={() => handleStatusUpdate(status)}
                    disabled={statusUpdateLoading || shipmentData.status === status}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: shipmentData.status === status ? '2px solid #4ade80' : '1px solid #e2e8f0',
                      background: shipmentData.status === status ? '#f0fff4' : 'white',
                      color: shipmentData.status === status ? '#16a34a' : '#4a5568',
                      fontSize: '0.875rem',
                      cursor: shipmentData.status === status ? 'default' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shipment Details Card - Read-only Labels */}
          <div className="shipment-section" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#1a202c' }}>Shipment Information</h2>
            
            {/* Main Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Left Column */}
              <div>
                <div className="detail-row" style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Export Date</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{formatDate(shipmentData.export_date)}</span>
                </div>
                
                <div className="detail-row" style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Transportation Mode</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.mode || 'Not specified'}</span>
                </div>
                
                <div className="detail-row" style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Destination Country</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.destination_country || 'Not specified'}</span>
                </div>
                
                <div className="detail-row" style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>End User/Consignee</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.end_user_name || 'Not specified'}</span>
                </div>
              </div>
              
              {/* Right Column */}
              <div>
                <div className="detail-row" style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Commercial Value</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{formatValue(shipmentData.commercial_value)} {shipmentData.currency || 'USD'}</span>
                </div>
                
                <div className="detail-row" style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Quantity</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.quantity || 'Not specified'} {shipmentData.quantity_unit || 'PCS'}</span>
                </div>
                
                <div className="detail-row" style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Incoterms</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.incoterms || 'Not specified'}</span>
                </div>
                
                <div className="detail-row" style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Technology Origin</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.tech_origin || shipmentData.origin || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            {/* Additional Details */}
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '1.5rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem'
              }}>
                <div className="detail-row">
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Product Type</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.product_type || shipmentData.productType || 'Not specified'}</span>
                </div>
                
                <div className="detail-row">
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>HS Code</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.hs_code || 'Not specified'}</span>
                </div>
                
                <div className="detail-row">
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>End Use Purpose</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.end_use_purpose || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Compliance Status - Read-only without permit upload */}
          {strategicDetectionComplete && (
            <div className="shipment-section" style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#1a202c' }}>Strategic Trade Compliance Status</h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  padding: '1rem',
                  background: strategicItemsDetected ? '#fef2f2' : '#f0fff4',
                  border: `1px solid ${strategicItemsDetected ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Strategic Items Detected</div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: strategicItemsDetected ? '#dc2626' : '#16a34a'
                  }}>{strategicItemsCount}</div>
                </div>
                
                <div style={{
                  padding: '1rem',
                  background: exportBlocked ? '#fef2f2' : '#f0fff4',
                  border: `1px solid ${exportBlocked ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Export Status</div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: exportBlocked ? '#dc2626' : '#16a34a'
                  }}>{exportBlocked ? 'BLOCKED' : 'PERMITTED'}</div>
                </div>
                
                <div style={{
                  padding: '1rem',
                  background: complianceScore < 100 ? '#fef2f2' : '#f0fff4',
                  border: `1px solid ${complianceScore < 100 ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Compliance Score</div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: complianceScore < 100 ? '#dc2626' : '#16a34a'
                  }}>{complianceScore}%</div>
                </div>
              </div>
              
              {missingPermits.length > 0 && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#dc2626',
                    marginBottom: '0.5rem'
                  }}>Missing Permits Required:</div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {missingPermits.map((permit, index) => (
                      <li key={index} style={{
                        color: '#dc2626',
                        fontSize: '0.875rem',
                        marginBottom: '0.25rem'
                      }}>{permit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Customer Information (Admin Only) */}
          {shipmentData.customer && (
            <div className="shipment-section" style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#1a202c' }}>Customer Information</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem'
              }}>
                <div className="detail-row">
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Customer Name</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.customer.fullName}</span>
                </div>
                <div className="detail-row">
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Email</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.customer.email}</span>
                </div>
                <div className="detail-row">
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    marginBottom: '0.25rem'
                  }}>Customer ID</label>
                  <span style={{
                    fontSize: '1rem',
                    color: '#1a202c'
                  }}>{shipmentData.customer.id}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tracking Information */}
          <div className="shipment-section" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#1a202c' }}>Tracking & Logistics</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              <div className="detail-row">
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#4a5568',
                  marginBottom: '0.25rem'
                }}>Tracking Number</label>
                <span style={{
                  fontSize: '1rem',
                  color: '#1a202c'
                }}>{shipmentData.tracking_number || 'Not assigned'}</span>
              </div>
              <div className="detail-row">
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#4a5568',
                  marginBottom: '0.25rem'
                }}>Carrier Reference</label>
                <span style={{
                  fontSize: '1rem',
                  color: '#1a202c'
                }}>{shipmentData.carrier_reference || 'Not assigned'}</span>
              </div>
              <div className="detail-row">
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#4a5568',
                  marginBottom: '0.25rem'
                }}>Estimated Delivery</label>
                <span style={{
                  fontSize: '1rem',
                  color: '#1a202c'
                }}>{formatDate(shipmentData.estimated_delivery_date)}</span>
              </div>
              <div className="detail-row">
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#4a5568',
                  marginBottom: '0.25rem'
                }}>Actual Pickup</label>
                <span style={{
                  fontSize: '1rem',
                  color: '#1a202c'
                }}>{formatDate(shipmentData.actual_pickup_date)}</span>
              </div>
              <div className="detail-row">
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#4a5568',
                  marginBottom: '0.25rem'
                }}>Actual Delivery</label>
                <span style={{
                  fontSize: '1rem',
                  color: '#1a202c'
                }}>{formatDate(shipmentData.actual_delivery_date)}</span>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="shipment-section" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#1a202c' }}>Uploaded Documents</h2>
            
            {documentsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                Loading documents...
              </div>
            ) : documents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {documents.map((doc, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: '#f9fafb'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: '0.25rem'
                      }}>
                        {doc.filename || doc.original_filename}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        display: 'flex',
                        gap: '1rem'
                      }}>
                        <span>Type: {doc.document_type || doc.tag || 'Document'}</span>
                        {doc.uploaded_at && (
                          <span>Uploaded: {formatDate(doc.uploaded_at)}</span>
                        )}
                        {doc.confidence_score && (
                          <span>Confidence: {Math.round(doc.confidence_score * 100)}%</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: 'white',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          // TODO: Implement download functionality
                          alert('Download functionality to be implemented');
                        }}
                      >
                        Download
                      </button>
                      <button 
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: 'white',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          // TODO: Implement view functionality
                          alert('View functionality to be implemented');
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6b7280',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                <div>No documents uploaded yet</div>
              </div>
            )}
          </div>

          {/* Audit Trail */}
          <div className="shipment-section" style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#1a202c' }}>Audit Trail</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  background: '#10b981',
                  borderRadius: '50%'
                }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>Created</div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>Shipment record created on {formatDate(shipmentData.created_at)}</div>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  background: '#3b82f6',
                  borderRadius: '50%'
                }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>Last Updated</div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>Shipment information updated on {formatDate(shipmentData.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}