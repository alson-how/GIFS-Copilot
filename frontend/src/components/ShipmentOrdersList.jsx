import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../config/api.js';

const ShipmentOrdersList = () => {
    const navigate = useNavigate();
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalShipments, setTotalShipments] = useState(0);
    
    // Filter state
    const [filters, setFilters] = useState({
        shipmentId: '',
        status: '',
        endUser: ''
    });

    // Status options for filter dropdown
    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'cancelled', label: 'Cancelled' }
    ];

    // Items per page options
    const itemsPerPageOptions = [10, 25, 50, 100];

    // Fetch shipments data
    const fetchShipments = async () => {
        try {
            setLoading(true);
            setError(null);

            // Build query parameters
            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                ...(filters.shipmentId && { shipmentId: filters.shipmentId }),
                ...(filters.status && { status: filters.status }),
                ...(filters.endUser && { endUser: filters.endUser })
            });

            const response = await apiRequest(`/shipments?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                setShipments(data.data.shipments || []);
                setTotalShipments(data.data.pagination?.total || 0);
            } else {
                throw new Error(data.error || 'Failed to fetch shipments');
            }
        } catch (err) {
            console.error('Error fetching shipments:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Effect to fetch data when filters or pagination changes
    useEffect(() => {
        fetchShipments();
    }, [currentPage, itemsPerPage, filters]);

    // Handle filter changes
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1); // Reset to first page when filtering
    };

    // Handle clear filters
    const handleClearFilters = () => {
        setFilters({
            shipmentId: '',
            status: '',
            endUser: ''
        });
        setCurrentPage(1);
    };

    // Handle shipment selection
    const handleShipmentClick = (shipmentId) => {
        navigate(`/shipment/${shipmentId}`);
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

    // Format status for display
    const formatStatus = (status) => {
        if (!status) return 'Unknown';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    };

    // Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#28a745';
            case 'in_progress': return '#007bff';
            case 'pending': return '#ffc107';
            case 'blocked': return '#dc3545';
            case 'cancelled': return '#6c757d';
            default: return '#6c757d';
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(totalShipments / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalShipments);

    return (
        <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ 
                        fontSize: '2rem', 
                        fontWeight: 'bold', 
                        color: '#2c3e50',
                        marginBottom: '0.5rem'
                    }}>
                        Shipment Orders
                    </h1>
                    <p style={{ color: '#6c757d', fontSize: '1.1rem' }}>
                        Manage and track all shipment orders
                    </p>
                </div>

                {/* Filters */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        alignItems: 'end'
                    }}>
                        {/* Shipment ID Filter */}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '0.5rem', 
                                fontWeight: '500',
                                color: '#495057'
                            }}>
                                Shipment ID
                            </label>
                            <input
                                type="text"
                                value={filters.shipmentId}
                                onChange={(e) => handleFilterChange('shipmentId', e.target.value)}
                                placeholder="Enter shipment ID..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '0.5rem', 
                                fontWeight: '500',
                                color: '#495057'
                            }}>
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem',
                                    backgroundColor: 'white'
                                }}
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* End User Filter */}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '0.5rem', 
                                fontWeight: '500',
                                color: '#495057'
                            }}>
                                End User/Consignee
                            </label>
                            <input
                                type="text"
                                value={filters.endUser}
                                onChange={(e) => handleFilterChange('endUser', e.target.value)}
                                placeholder="Enter end user name..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        {/* Clear Filters Button */}
                        <div>
                            <button
                                onClick={handleClearFilters}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Items per page selector */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#6c757d' }}>Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '0.5rem',
                                border: '1px solid #dee2e6',
                                borderRadius: '4px',
                                fontSize: '0.9rem'
                            }}
                        >
                            {itemsPerPageOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <span style={{ color: '#6c757d' }}>entries</span>
                    </div>

                    {/* Results count */}
                    <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                        {totalShipments > 0 ? (
                            `Showing ${startItem} to ${endItem} of ${totalShipments} entries`
                        ) : (
                            'No entries found'
                        )}
                    </div>
                </div>

                {/* Table */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}>
                    {loading ? (
                        <div style={{ 
                            padding: '3rem', 
                            textAlign: 'center',
                            color: '#6c757d' 
                        }}>
                            <div style={{ marginBottom: '1rem' }}>Loading shipments...</div>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '3px solid #f3f3f3',
                                borderTop: '3px solid #007bff',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto'
                            }}></div>
                        </div>
                    ) : error ? (
                        <div style={{ 
                            padding: '3rem', 
                            textAlign: 'center',
                            color: '#dc3545'
                        }}>
                            <div style={{ marginBottom: '1rem' }}>Error: {error}</div>
                            <button
                                onClick={fetchShipments}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : shipments.length === 0 ? (
                        <div style={{ 
                            padding: '3rem', 
                            textAlign: 'center',
                            color: '#6c757d'
                        }}>
                            No shipments found matching your criteria
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ 
                                        padding: '1rem', 
                                        textAlign: 'left', 
                                        fontWeight: '600',
                                        color: '#495057',
                                        borderBottom: '2px solid #dee2e6'
                                    }}>
                                        Shipment ID
                                    </th>
                                    <th style={{ 
                                        padding: '1rem', 
                                        textAlign: 'left', 
                                        fontWeight: '600',
                                        color: '#495057',
                                        borderBottom: '2px solid #dee2e6'
                                    }}>
                                        Status
                                    </th>
                                    <th style={{ 
                                        padding: '1rem', 
                                        textAlign: 'left', 
                                        fontWeight: '600',
                                        color: '#495057',
                                        borderBottom: '2px solid #dee2e6'
                                    }}>
                                        Export Date
                                    </th>
                                    <th style={{ 
                                        padding: '1rem', 
                                        textAlign: 'left', 
                                        fontWeight: '600',
                                        color: '#495057',
                                        borderBottom: '2px solid #dee2e6'
                                    }}>
                                        End User/Consignee
                                    </th>
                                    <th style={{ 
                                        padding: '1rem', 
                                        textAlign: 'left', 
                                        fontWeight: '600',
                                        color: '#495057',
                                        borderBottom: '2px solid #dee2e6'
                                    }}>
                                        Destination
                                    </th>
                                    <th style={{ 
                                        padding: '1rem', 
                                        textAlign: 'left', 
                                        fontWeight: '600',
                                        color: '#495057',
                                        borderBottom: '2px solid #dee2e6'
                                    }}>
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipments.map((shipment, index) => (
                                    <tr 
                                        key={shipment.shipmentId || shipment.id}
                                        style={{
                                            backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                                            transition: 'background-color 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'}
                                        onClick={() => handleShipmentClick(shipment.shipmentId)}
                                    >
                                        <td style={{ 
                                            padding: '1rem',
                                            borderBottom: '1px solid #dee2e6',
                                            color: '#007bff',
                                            fontWeight: '500',
                                            textDecoration: 'underline'
                                        }}>
                                            {shipment.shipmentId || shipment.id}
                                        </td>
                                        <td style={{ 
                                            padding: '1rem',
                                            borderBottom: '1px solid #dee2e6'
                                        }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                fontWeight: '500',
                                                backgroundColor: `${getStatusColor(shipment.status)}20`,
                                                color: getStatusColor(shipment.status),
                                                border: `1px solid ${getStatusColor(shipment.status)}40`
                                            }}>
                                                {formatStatus(shipment.status)}
                                            </span>
                                        </td>
                                        <td style={{ 
                                            padding: '1rem',
                                            borderBottom: '1px solid #dee2e6',
                                            color: '#495057'
                                        }}>
                                            {formatDate(shipment.exportDate)}
                                        </td>
                                        <td style={{ 
                                            padding: '1rem',
                                            borderBottom: '1px solid #dee2e6',
                                            color: '#495057'
                                        }}>
                                            {shipment.endUser || shipment.consignee || 'Not specified'}
                                        </td>
                                        <td style={{ 
                                            padding: '1rem',
                                            borderBottom: '1px solid #dee2e6',
                                            color: '#495057'
                                        }}>
                                            {shipment.destination || 'Not specified'}
                                        </td>
                                        <td style={{ 
                                            padding: '1rem',
                                            borderBottom: '1px solid #dee2e6',
                                            color: '#495057'
                                        }}>
                                            {shipment.totalValue ? 
                                                `USD ${Number(shipment.totalValue).toLocaleString()}` :
                                                'Not specified'
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '2rem'
                    }}>
                        {/* Previous button */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid #dee2e6',
                                backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
                                color: currentPage === 1 ? '#6c757d' : '#495057',
                                borderRadius: '4px',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Previous
                        </button>

                        {/* Page numbers */}
                        {[...Array(Math.min(5, totalPages))].map((_, index) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = index + 1;
                            } else if (currentPage <= 3) {
                                pageNum = index + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + index;
                            } else {
                                pageNum = currentPage - 2 + index;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid #dee2e6',
                                        backgroundColor: currentPage === pageNum ? '#007bff' : 'white',
                                        color: currentPage === pageNum ? 'white' : '#495057',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        minWidth: '40px'
                                    }}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        {/* Next button */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid #dee2e6',
                                backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
                                color: currentPage === totalPages ? '#6c757d' : '#495057',
                                borderRadius: '4px',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ShipmentOrdersList;
