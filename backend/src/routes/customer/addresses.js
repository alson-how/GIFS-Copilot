/**
 * Customer Address Management Routes
 * Handles CRUD operations for customer addresses with validation and security
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authCustomer } from '../../middleware/authCustomer.js';

const router = express.Router();

// Address validation utilities
const validateAddress = (address) => {
  const errors = [];
  
  if (!address.label || address.label.trim().length < 2 || address.label.trim().length > 50) {
    errors.push('Label must be between 2-50 characters');
  }
  
  if (!address.addressLine1 || address.addressLine1.trim().length < 5 || address.addressLine1.trim().length > 200) {
    errors.push('Address Line 1 must be between 5-200 characters');
  }
  
  if (address.addressLine2 && address.addressLine2.trim().length > 200) {
    errors.push('Address Line 2 must be less than 200 characters');
  }
  
  if (!address.postcode || address.postcode.trim().length < 3 || address.postcode.trim().length > 20) {
    errors.push('Postcode must be between 3-20 characters');
  }
  
  if (!address.city || address.city.trim().length < 2 || address.city.trim().length > 100) {
    errors.push('City must be between 2-100 characters');
  }
  
  if (!address.state || address.state.trim().length < 2 || address.state.trim().length > 100) {
    errors.push('State must be between 2-100 characters');
  }
  
  if (!address.country || !/^[A-Z]{2}$/.test(address.country)) {
    errors.push('Country must be a valid 2-letter ISO code');
  }
  
  if (address.contactPhone && !/^[\+]?[1-9][\d\s\-\(\)]{7,20}$/.test(address.contactPhone)) {
    errors.push('Invalid contact phone format');
  }
  
  if (address.contactEmail && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(address.contactEmail)) {
    errors.push('Invalid contact email format');
  }
  
  if (!address.isShippingAddress && !address.isBillingAddress) {
    errors.push('Address must be either shipping, billing, or both');
  }
  
  return errors;
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

const checkRateLimit = (customerId) => {
  const key = `address_create_${customerId}`;
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  const attempts = rateLimitStore.get(key) || [];
  const recentAttempts = attempts.filter(timestamp => timestamp > hourAgo);
  
  if (recentAttempts.length >= 10) {
    return false;
  }
  
  recentAttempts.push(now);
  rateLimitStore.set(key, recentAttempts);
  return true;
};

// GET /api/customer/addresses - Fetch all addresses for logged-in customer
router.get('/', authCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;
    const { type, page = 1, limit = 20, search } = req.query;
    
    logger.info(`Fetching addresses for customer: ${customerId}`, {
      type, page, limit, search
    });
    
    // Build query conditions
    const conditions = ['customer_id = $1', 'is_active = TRUE'];
    const params = [customerId];
    let paramCount = 1;
    
    if (type === 'shipping') {
      conditions.push('is_shipping_address = TRUE');
    } else if (type === 'billing') {
      conditions.push('is_billing_address = TRUE');
    }
    
    if (search) {
      paramCount++;
      conditions.push(`(label ILIKE $${paramCount} OR address_line_1 ILIKE $${paramCount} OR city ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }
    
    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    params.push(parseInt(limit), offset);
    
    const query = `
      SELECT id, customer_id, label, address_line_1, address_line_2, postcode, city, state, country,
             is_default, is_billing_address, is_shipping_address, contact_name, contact_phone, contact_email,
             latitude, longitude, created_at, updated_at
      FROM customer_addresses
      WHERE ${conditions.join(' AND ')}
      ORDER BY is_default DESC, created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    
    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM customer_addresses
      WHERE ${conditions.slice(0, -2).join(' AND ')}
    `;
    
    // Mock database operations (replace with actual database calls)
    const mockAddresses = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        customer_id: customerId,
        label: 'Home',
        address_line_1: '123 Main Street',
        address_line_2: 'Unit 45',
        postcode: '50000',
        city: 'Kuala Lumpur',
        state: 'Kuala Lumpur',
        country: 'MY',
        is_default: true,
        is_billing_address: true,
        is_shipping_address: true,
        contact_name: 'John Doe',
        contact_phone: '+60123456789',
        contact_email: 'john@example.com',
        latitude: null,
        longitude: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      },
      {
        id: '223e4567-e89b-12d3-a456-426614174001',
        customer_id: customerId,
        label: 'Office',
        address_line_1: '456 Business Ave',
        address_line_2: null,
        postcode: '50100',
        city: 'Kuala Lumpur',
        state: 'Kuala Lumpur',
        country: 'MY',
        is_default: false,
        is_billing_address: false,
        is_shipping_address: true,
        contact_name: 'Jane Smith',
        contact_phone: '+60187654321',
        contact_email: 'jane@company.com',
        latitude: null,
        longitude: null,
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02')
      }
    ];
    
    const filteredAddresses = type 
      ? mockAddresses.filter(addr => 
          type === 'shipping' ? addr.is_shipping_address : addr.is_billing_address
        )
      : mockAddresses;
    
    const total = filteredAddresses.length;
    const paginatedAddresses = filteredAddresses.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        addresses: paginatedAddresses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    logger.error('Error fetching customer addresses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch addresses'
    });
  }
});

// GET /api/customer/addresses/:id - Fetch single address by ID
router.get('/:id', authCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.id;
    
    logger.info(`Fetching address ${id} for customer: ${customerId}`);
    
    // Mock database query (replace with actual database call)
    const mockAddress = {
      id,
      customer_id: customerId,
      label: 'Home',
      address_line_1: '123 Main Street',
      address_line_2: 'Unit 45',
      postcode: '50000',
      city: 'Kuala Lumpur',
      state: 'Kuala Lumpur',
      country: 'MY',
      is_default: true,
      is_billing_address: true,
      is_shipping_address: true,
      contact_name: 'John Doe',
      contact_phone: '+60123456789',
      contact_email: 'john@example.com',
      latitude: null,
      longitude: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    };
    
    // Verify ownership
    if (mockAddress.customer_id !== customerId) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }
    
    res.json({
      success: true,
      data: mockAddress
    });
    
  } catch (error) {
    logger.error('Error fetching address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch address'
    });
  }
});

// POST /api/customer/addresses - Create new address
router.post('/', authCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;
    const addressData = req.body;
    
    // Rate limiting
    if (!checkRateLimit(customerId)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Maximum 10 addresses per hour.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    logger.info(`Creating new address for customer: ${customerId}`, addressData);
    
    // Validate address data
    const validationErrors = validateAddress(addressData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Sanitize and prepare data
    const sanitizedData = {
      customer_id: customerId,
      label: addressData.label.trim(),
      address_line_1: addressData.addressLine1.trim(),
      address_line_2: addressData.addressLine2 ? addressData.addressLine2.trim() : null,
      postcode: addressData.postcode.trim(),
      city: addressData.city.trim(),
      state: addressData.state.trim(),
      country: addressData.country.toUpperCase(),
      is_default: addressData.isDefault || false,
      is_billing_address: addressData.isBillingAddress || false,
      is_shipping_address: addressData.isShippingAddress || true,
      contact_name: addressData.contactName ? addressData.contactName.trim() : null,
      contact_phone: addressData.contactPhone ? addressData.contactPhone.trim() : null,
      contact_email: addressData.contactEmail ? addressData.contactEmail.toLowerCase().trim() : null,
      latitude: addressData.latitude || null,
      longitude: addressData.longitude || null
    };
    
    // Mock database insertion (replace with actual database call)
    const newAddressId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAddress = {
      id: newAddressId,
      ...sanitizedData,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    logger.info(`Address created successfully: ${newAddressId}`);
    
    res.status(201).json({
      success: true,
      data: newAddress,
      message: 'Address created successfully'
    });
    
  } catch (error) {
    logger.error('Error creating address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create address',
      code: 'CREATION_ERROR'
    });
  }
});

// PUT /api/customer/addresses/:id - Update existing address
router.put('/:id', authCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.id;
    const updateData = req.body;
    
    logger.info(`Updating address ${id} for customer: ${customerId}`, updateData);
    
    // Validate address data
    const validationErrors = validateAddress(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Mock ownership verification (replace with actual database query)
    const existingAddress = {
      id,
      customer_id: customerId
    };
    
    if (existingAddress.customer_id !== customerId) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }
    
    // Sanitize update data
    const sanitizedData = {
      label: updateData.label.trim(),
      address_line_1: updateData.addressLine1.trim(),
      address_line_2: updateData.addressLine2 ? updateData.addressLine2.trim() : null,
      postcode: updateData.postcode.trim(),
      city: updateData.city.trim(),
      state: updateData.state.trim(),
      country: updateData.country.toUpperCase(),
      is_default: updateData.isDefault || false,
      is_billing_address: updateData.isBillingAddress || false,
      is_shipping_address: updateData.isShippingAddress || true,
      contact_name: updateData.contactName ? updateData.contactName.trim() : null,
      contact_phone: updateData.contactPhone ? updateData.contactPhone.trim() : null,
      contact_email: updateData.contactEmail ? updateData.contactEmail.toLowerCase().trim() : null,
      latitude: updateData.latitude || null,
      longitude: updateData.longitude || null,
      updated_at: new Date()
    };
    
    // Mock database update
    const updatedAddress = {
      id,
      customer_id: customerId,
      ...sanitizedData,
      is_active: true,
      created_at: new Date('2024-01-01')
    };
    
    res.json({
      success: true,
      data: updatedAddress,
      message: 'Address updated successfully'
    });
    
  } catch (error) {
    logger.error('Error updating address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update address',
      code: 'UPDATE_ERROR'
    });
  }
});

// DELETE /api/customer/addresses/:id - Soft delete address
router.delete('/:id', authCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.id;
    
    logger.info(`Deleting address ${id} for customer: ${customerId}`);
    
    // Mock ownership verification and active address count check
    const existingAddress = {
      id,
      customer_id: customerId,
      is_active: true
    };
    
    if (existingAddress.customer_id !== customerId) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }
    
    // Mock check for active shipments using this address
    const hasActiveShipments = false; // Replace with actual query
    
    if (hasActiveShipments) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete address that is used in active shipments',
        code: 'ADDRESS_IN_USE'
      });
    }
    
    // Mock count of active addresses
    const activeAddressCount = 2; // Replace with actual count query
    
    if (activeAddressCount <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your only address',
        code: 'LAST_ADDRESS'
      });
    }
    
    // Mock soft delete
    logger.info(`Address ${id} soft deleted successfully`);
    
    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
    
  } catch (error) {
    logger.error('Error deleting address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete address',
      code: 'DELETION_ERROR'
    });
  }
});

// PATCH /api/customer/addresses/:id/set-default - Set address as default
router.patch('/:id/set-default', authCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.id;
    
    logger.info(`Setting address ${id} as default for customer: ${customerId}`);
    
    // Mock ownership verification
    const existingAddress = {
      id,
      customer_id: customerId,
      is_active: true
    };
    
    if (existingAddress.customer_id !== customerId) {
      return res.status(404).json({
        success: false,
        error: 'Address not found'
      });
    }
    
    // Mock database update (trigger will handle unsetting other defaults)
    const updatedAddress = {
      ...existingAddress,
      is_default: true,
      updated_at: new Date()
    };
    
    logger.info(`Address ${id} set as default successfully`);
    
    res.json({
      success: true,
      data: updatedAddress,
      message: 'Default address updated successfully'
    });
    
  } catch (error) {
    logger.error('Error setting default address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set default address',
      code: 'SET_DEFAULT_ERROR'
    });
  }
});

// GET /api/customer/addresses/validate - Validate address with external service
router.get('/validate', authCustomer, async (req, res) => {
  try {
    const { postcode, city, state, country } = req.query;
    
    if (!postcode || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        error: 'Missing required validation parameters',
        code: 'MISSING_PARAMS'
      });
    }
    
    logger.info(`Validating address: ${postcode}, ${city}, ${state}, ${country}`);
    
    // Mock validation logic (replace with actual external service call)
    const isValid = true;
    const suggestions = [];
    
    res.json({
      success: true,
      data: {
        isValid,
        suggestions,
        validatedAddress: {
          postcode: postcode.toUpperCase(),
          city,
          state,
          country: country.toUpperCase()
        }
      }
    });
    
  } catch (error) {
    logger.error('Error validating address:', error);
    res.status(500).json({
      success: false,
      error: 'Address validation failed',
      code: 'VALIDATION_SERVICE_ERROR'
    });
  }
});

export default router;