import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AddressService } from '../../../services/addressService';
import AddressForm from '../../../components/organisms/AddressForm/AddressForm';
import Button from '../../../components/atoms/Button/Button';
import AddressLabel from '../../../components/atoms/AddressLabel/AddressLabel';
import AddressIcon from '../../../components/atoms/AddressIcon/AddressIcon';
import DefaultAddressBadge from '../../../components/molecules/DefaultAddressBadge/DefaultAddressBadge';
import AddressActions from '../../../components/molecules/AddressActions/AddressActions';
import { formatCompactAddress, getAddressTypeText } from '../../../utils/addressFormatter';
import './AddressBookPage.scss';

const AddressBookPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch addresses on component mount
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check authentication first
      if (!AddressService.isAuthenticated()) {
        setError('Please log in to view your addresses');
        setIsLoading(false);
        return;
      }
      
      const params = {};
      if (filterType !== 'all') {
        params.type = filterType;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      console.log('AddressBookPage: Loading addresses with params:', params);
      const response = await AddressService.getAddresses(params);
      
      if (response.success) {
        const addressList = response.data.addresses || response.addresses || [];
        console.log('AddressBookPage: Loaded addresses:', addressList);
        setAddresses(addressList);
      } else {
        setError('Failed to load addresses');
      }
    } catch (err) {
      console.error('Error loading addresses:', err);
      setError(err.message || 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowAddForm(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowAddForm(true);
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await AddressService.deleteAddress(addressId);
      await loadAddresses(); // Reload addresses
    } catch (err) {
      console.error('Error deleting address:', err);
      setError(err.message || 'Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await AddressService.setDefaultAddress(addressId);
      await loadAddresses(); // Reload addresses
    } catch (err) {
      console.error('Error setting default address:', err);
      setError(err.message || 'Failed to set default address');
    }
  };

  const handleCopyAddress = (address) => {
    const addressText = formatCompactAddress(address);
    navigator.clipboard.writeText(addressText).then(() => {
      // Could add a toast notification here
      console.log('Address copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy address:', err);
    });
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (editingAddress) {
        await AddressService.updateAddress(editingAddress.id, formData);
      } else {
        await AddressService.createAddress(formData);
      }

      setShowAddForm(false);
      setEditingAddress(null);
      await loadAddresses(); // Reload addresses
    } catch (err) {
      console.error('Error saving address:', err);
      setError(err.message || 'Failed to save address');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setShowAddForm(false);
    setEditingAddress(null);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
  };

  // Apply search and filter
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadAddresses();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filterType]);

  const getAddressIcon = (address) => {
    if (address.label?.toLowerCase().includes('home')) return 'home';
    if (address.label?.toLowerCase().includes('office') || address.label?.toLowerCase().includes('work')) return 'office';
    if (address.label?.toLowerCase().includes('warehouse')) return 'warehouse';
    return 'map';
  };

  if (showAddForm) {
    return (
      <div className="address-book-page">
        <div className="page-header">
          <div className="header-content">
            <Button
              variant="ghost"
              onClick={handleFormCancel}
              className="back-button"
            >
              ← Back to Addresses
            </Button>
            <h1>{editingAddress ? 'Edit Address' : 'Add New Address'}</h1>
          </div>
        </div>

        <div className="page-content">
          <div className="form-container">
            <AddressForm
              address={editingAddress}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="address-book-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Address Book</h1>
            <p>Manage your shipping and billing addresses</p>
          </div>
          <Button
            variant="primary"
            onClick={handleAddAddress}
            className="add-button"
          >
            + Add New Address
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="page-controls">
        <div className="search-filter-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search addresses..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          <select
            value={filterType}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="all">All Addresses</option>
            <option value="shipping">Shipping Only</option>
            <option value="billing">Billing Only</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button
            onClick={() => setError(null)}
            className="error-close"
            aria-label="Close error message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Content */}
      <div className="page-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading addresses...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📍</div>
            <h3>No addresses found</h3>
            <p>
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first address'}
            </p>
            <Button
              variant="primary"
              onClick={handleAddAddress}
              className="empty-action-button"
            >
              Add Your First Address
            </Button>
          </div>
        ) : (
          <div className="addresses-grid">
            {addresses.map((address) => (
              <div key={address.id} className="address-card">
                <div className="card-header">
                  <div className="address-info">
                    <div className="address-label-row">
                      <AddressIcon
                        type={getAddressIcon(address)}
                        size="medium"
                        className="address-card-icon"
                      />
                      <AddressLabel
                        label={address.label}
                        isDefault={address.is_default}
                        size="medium"
                      />
                    </div>
                    <div className="address-type">
                      {getAddressTypeText(address.is_shipping_address, address.is_billing_address)}
                    </div>
                  </div>

                  <AddressActions
                    onEdit={() => handleEditAddress(address)}
                    onDelete={() => handleDeleteAddress(address.id)}
                    onSetDefault={!address.is_default ? () => handleSetDefaultAddress(address.id) : undefined}
                    onCopy={() => handleCopyAddress(address)}
                    isDefault={address.is_default}
                    variant="minimal"
                    size="small"
                  />
                </div>

                <div className="card-content">
                  <div className="address-lines">
                    <div className="address-line">{address.address_line_1}</div>
                    {address.address_line_2 && (
                      <div className="address-line">{address.address_line_2}</div>
                    )}
                    <div className="address-line">
                      {address.city}, {address.state} {address.postcode}
                    </div>
                    <div className="address-line country">{address.country}</div>
                  </div>

                  {(address.contact_name || address.contact_phone || address.contact_email) && (
                    <div className="contact-info">
                      {address.contact_name && (
                        <div className="contact-item">
                          <span className="contact-icon">👤</span>
                          <span>{address.contact_name}</span>
                        </div>
                      )}
                      {address.contact_phone && (
                        <div className="contact-item">
                          <span className="contact-icon">📞</span>
                          <span>{address.contact_phone}</span>
                        </div>
                      )}
                      {address.contact_email && (
                        <div className="contact-item">
                          <span className="contact-icon">✉️</span>
                          <span>{address.contact_email}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {address.is_default && (
                  <div className="default-badge-overlay">
                    <DefaultAddressBadge
                      isDefault={true}
                      size="small"
                      showText={false}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

AddressBookPage.propTypes = {
  // No props for this page component
};

export default AddressBookPage;