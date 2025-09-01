/**
 * Address Type Definitions
 * TypeScript-style JSDoc definitions for address entities
 */

/**
 * @typedef {Object} Address
 * @property {string} id - Unique address identifier (UUID)
 * @property {string} customer_id - Customer identifier (UUID)
 * @property {string} label - Address label (e.g., "Home", "Office")
 * @property {string} address_line_1 - Primary address line
 * @property {string|null} address_line_2 - Secondary address line (optional)
 * @property {string} postcode - Postal/ZIP code
 * @property {string} city - City name
 * @property {string} state - State/Province name
 * @property {string} country - ISO 3166-1 alpha-2 country code
 * @property {boolean} is_default - Whether this is the default address
 * @property {boolean} is_billing_address - Whether this is a billing address
 * @property {boolean} is_shipping_address - Whether this is a shipping address
 * @property {string|null} contact_name - Contact person name (optional)
 * @property {string|null} contact_phone - Contact phone number (optional)
 * @property {string|null} contact_email - Contact email address (optional)
 * @property {number|null} latitude - Latitude coordinate (optional)
 * @property {number|null} longitude - Longitude coordinate (optional)
 * @property {boolean} is_active - Whether the address is active (soft delete flag)
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} CreateAddressRequest
 * @property {string} label - Address label (2-50 characters)
 * @property {string} addressLine1 - Primary address line (5-200 characters)
 * @property {string} [addressLine2] - Secondary address line (optional, max 200 characters)
 * @property {string} postcode - Postal/ZIP code (3-20 characters)
 * @property {string} city - City name (2-100 characters)
 * @property {string} state - State/Province name (2-100 characters)
 * @property {string} country - ISO 3166-1 alpha-2 country code
 * @property {boolean} [isDefault=false] - Whether this is the default address
 * @property {boolean} [isBillingAddress=false] - Whether this is a billing address
 * @property {boolean} [isShippingAddress=true] - Whether this is a shipping address
 * @property {string} [contactName] - Contact person name (optional, max 100 characters)
 * @property {string} [contactPhone] - Contact phone number (optional, international format)
 * @property {string} [contactEmail] - Contact email address (optional, valid email)
 * @property {number} [latitude] - Latitude coordinate (optional, -90 to 90)
 * @property {number} [longitude] - Longitude coordinate (optional, -180 to 180)
 */

/**
 * @typedef {CreateAddressRequest} UpdateAddressRequest
 * Updates use the same structure as create requests
 */

/**
 * @typedef {Object} AddressFormData
 * Form-specific address data structure for React components
 * @property {string} label
 * @property {string} addressLine1
 * @property {string} addressLine2
 * @property {string} postcode
 * @property {string} city
 * @property {string} state
 * @property {string} country
 * @property {boolean} isDefault
 * @property {boolean} isBillingAddress
 * @property {boolean} isShippingAddress
 * @property {string} contactName
 * @property {string} contactPhone
 * @property {string} contactEmail
 */

/**
 * @typedef {Object} AddressValidationResult
 * @property {boolean} isValid - Whether the address is valid
 * @property {string[]} errors - Validation error messages
 * @property {Object} [validatedAddress] - Corrected address data (if available)
 * @property {string[]} [suggestions] - Address suggestions from validation service
 */

/**
 * @typedef {Object} AddressListResponse
 * @property {boolean} success - Request success status
 * @property {Object} data - Response data
 * @property {Address[]} data.addresses - Array of addresses
 * @property {PaginationInfo} data.pagination - Pagination information
 */

/**
 * @typedef {Object} AddressResponse
 * @property {boolean} success - Request success status
 * @property {Address} data - Address data
 * @property {string} [message] - Success message
 */

/**
 * @typedef {Object} PaginationInfo
 * @property {number} page - Current page number
 * @property {number} limit - Items per page
 * @property {number} total - Total number of items
 * @property {number} pages - Total number of pages
 */

/**
 * @typedef {Object} AddressQueryParams
 * @property {'shipping'|'billing'} [type] - Filter by address type
 * @property {number} [page=1] - Page number for pagination
 * @property {number} [limit=20] - Items per page
 * @property {string} [search] - Search term for label, address, or city
 */

/**
 * @typedef {Object} AddressApiError
 * @property {boolean} success - Always false for errors
 * @property {string} error - Error message
 * @property {string} [code] - Error code
 * @property {string|string[]} [details] - Additional error details
 * @property {string} [field] - Field that caused the error (for validation errors)
 */

/**
 * @typedef {Object} Country
 * @property {string} code - ISO 3166-1 alpha-2 country code
 * @property {string} name - Country name
 * @property {string} flag - Country flag emoji
 * @property {string[]} [states] - Array of state/province names
 * @property {Object} [postcodeFormat] - Postcode format information
 * @property {string} postcodeFormat.pattern - Regex pattern for postcode validation
 * @property {string} postcodeFormat.example - Example postcode
 */

/**
 * @typedef {Object} State
 * @property {string} code - State/province code
 * @property {string} name - State/province name
 * @property {string} country - Country code this state belongs to
 */

/**
 * @typedef {Object} AddressFormProps
 * Props for AddressForm component
 * @property {Address} [address] - Address to edit (for update mode)
 * @property {function(CreateAddressRequest): void} onSubmit - Submit handler
 * @property {function(): void} [onCancel] - Cancel handler
 * @property {boolean} [isLoading=false] - Loading state
 * @property {string[]} [errors] - Form errors
 */

/**
 * @typedef {Object} AddressCardProps
 * Props for AddressCard component
 * @property {Address} address - Address to display
 * @property {function(Address): void} [onEdit] - Edit handler
 * @property {function(string): void} [onDelete] - Delete handler (receives address ID)
 * @property {function(string): void} [onSetDefault] - Set default handler (receives address ID)
 * @property {boolean} [showActions=true] - Whether to show action buttons
 * @property {boolean} [compact=false] - Whether to use compact layout
 */

/**
 * @typedef {Object} AddressGridProps
 * Props for AddressGrid component
 * @property {Address[]} addresses - Array of addresses to display
 * @property {function(Address): void} [onEdit] - Edit handler
 * @property {function(string): void} [onDelete] - Delete handler
 * @property {function(string): void} [onSetDefault] - Set default handler
 * @property {boolean} [isLoading=false] - Loading state
 * @property {React.ReactNode} [emptyState] - Custom empty state component
 */

/**
 * @typedef {Object} AddressModalProps
 * Props for AddressModal component
 * @property {boolean} isOpen - Whether modal is open
 * @property {function(): void} onClose - Close handler
 * @property {Address} [address] - Address to edit (for update mode)
 * @property {function(Address): void} [onSave] - Save handler
 */

/**
 * @typedef {Object} AddressBookLayoutProps
 * Props for AddressBookLayout template
 * @property {Address[]} addresses - Array of addresses
 * @property {function(): void} onAddNew - Add new address handler
 * @property {function(Address): void} onEdit - Edit address handler
 * @property {function(string): void} onDelete - Delete address handler
 * @property {function(string): void} onSetDefault - Set default handler
 * @property {boolean} [isLoading=false] - Loading state
 * @property {PaginationInfo} [pagination] - Pagination information
 * @property {function(number): void} [onPageChange] - Page change handler
 * @property {function(string): void} [onSearch] - Search handler
 * @property {function(string): void} [onFilter] - Filter handler
 */

/**
 * @typedef {Object} AddressHookResult
 * Result from useAddresses hook
 * @property {Address[]} addresses - Array of addresses
 * @property {boolean} isLoading - Loading state
 * @property {string|null} error - Error message
 * @property {PaginationInfo} pagination - Pagination info
 * @property {function(): void} refetch - Refetch addresses
 * @property {function(CreateAddressRequest): Promise<Address>} createAddress - Create address function
 * @property {function(string, UpdateAddressRequest): Promise<Address>} updateAddress - Update address function
 * @property {function(string): Promise<void>} deleteAddress - Delete address function
 * @property {function(string): Promise<Address>} setDefaultAddress - Set default address function
 */

/**
 * @typedef {Object} AddressValidationHookResult
 * Result from useAddressValidation hook
 * @property {function(Object): Promise<AddressValidationResult>} validateAddress - Validate address function
 * @property {boolean} isValidating - Validation loading state
 * @property {AddressValidationResult|null} lastResult - Last validation result
 */

/**
 * @typedef {Object} AddressSelectProps
 * Props for address selector components
 * @property {Address[]} addresses - Available addresses
 * @property {string} [selectedId] - Currently selected address ID
 * @property {function(Address): void} onSelect - Selection handler
 * @property {'shipping'|'billing'} [type] - Filter addresses by type
 * @property {boolean} [allowNew=true] - Whether to show "Add New" option
 * @property {function(): void} [onAddNew] - Add new address handler
 * @property {string} [placeholder] - Placeholder text
 * @property {boolean} [required=false] - Whether selection is required
 */

/**
 * Export types for use in other modules
 */
export const AddressTypes = {
  // This is just a marker export since we're using JSDoc
  // In a real TypeScript project, these would be actual type exports
  VALIDATION_PATTERNS: {
    POSTCODE: {
      US: /^\d{5}(-\d{4})?$/,
      MY: /^\d{5}$/,
      GB: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
      SG: /^\d{6}$/,
      AU: /^\d{4}$/
    },
    PHONE: /^[\+]?[1-9][\d\s\-\(\)]{7,20}$/,
    EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  },
  
  ADDRESS_TYPES: {
    SHIPPING: 'shipping',
    BILLING: 'billing',
    BOTH: 'both'
  },
  
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    ADDRESS_IN_USE: 'ADDRESS_IN_USE',
    LAST_ADDRESS: 'LAST_ADDRESS',
    NOT_FOUND: 'NOT_FOUND'
  }
};