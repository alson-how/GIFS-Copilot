/**
 * Address Formatting Utilities
 * Functions for formatting and displaying addresses in various contexts
 */

/**
 * Format a complete address for display
 * @param {Object} address - Address object
 * @param {Object} options - Formatting options
 * @param {boolean} [options.includeContact=false] - Include contact information
 * @param {boolean} [options.singleLine=false] - Format as single line
 * @param {boolean} [options.includeLabel=true] - Include address label
 * @returns {string} Formatted address
 */
export function formatAddress(address, options = {}) {
  const {
    includeContact = false,
    singleLine = false,
    includeLabel = true
  } = options;

  if (!address) return '';

  const parts = [];

  // Add label if requested
  if (includeLabel && address.label) {
    parts.push(`${address.label}:`);
  }

  // Add contact name if available and requested
  if (includeContact && address.contact_name) {
    parts.push(address.contact_name);
  }

  // Add address lines
  if (address.address_line_1) {
    parts.push(address.address_line_1);
  }

  if (address.address_line_2) {
    parts.push(address.address_line_2);
  }

  // Add city, state, postcode
  const locationParts = [];
  if (address.city) locationParts.push(address.city);
  if (address.state) locationParts.push(address.state);
  if (address.postcode) locationParts.push(address.postcode);

  if (locationParts.length > 0) {
    parts.push(locationParts.join(', '));
  }

  // Add country
  if (address.country) {
    parts.push(getCountryName(address.country));
  }

  // Add contact info if requested
  if (includeContact) {
    if (address.contact_phone) {
      parts.push(`Tel: ${address.contact_phone}`);
    }
    if (address.contact_email) {
      parts.push(`Email: ${address.contact_email}`);
    }
  }

  return singleLine ? parts.join(', ') : parts.join('\n');
}

/**
 * Format address for compact display (e.g., in cards)
 * @param {Object} address - Address object
 * @returns {string} Compact formatted address
 */
export function formatCompactAddress(address) {
  if (!address) return '';

  const parts = [];

  if (address.address_line_1) {
    parts.push(address.address_line_1);
  }

  const locationParts = [];
  if (address.city) locationParts.push(address.city);
  if (address.postcode) locationParts.push(address.postcode);

  if (locationParts.length > 0) {
    parts.push(locationParts.join(' '));
  }

  return parts.join(', ');
}

/**
 * Format address for shipping labels
 * @param {Object} address - Address object
 * @returns {Array<string>} Array of address lines for labels
 */
export function formatShippingLabel(address) {
  if (!address) return [];

  const lines = [];

  // Recipient name
  if (address.contact_name) {
    lines.push(address.contact_name.toUpperCase());
  }

  // Address lines
  if (address.address_line_1) {
    lines.push(address.address_line_1.toUpperCase());
  }

  if (address.address_line_2) {
    lines.push(address.address_line_2.toUpperCase());
  }

  // City, State, Postcode
  const locationParts = [];
  if (address.city) locationParts.push(address.city.toUpperCase());
  if (address.state) locationParts.push(address.state.toUpperCase());
  if (address.postcode) locationParts.push(address.postcode);

  if (locationParts.length > 0) {
    lines.push(locationParts.join(' '));
  }

  // Country
  if (address.country) {
    lines.push(getCountryName(address.country).toUpperCase());
  }

  return lines;
}

/**
 * Get country name from country code
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string} Country name
 */
export function getCountryName(countryCode) {
  const countries = {
    'MY': 'Malaysia',
    'SG': 'Singapore',
    'US': 'United States',
    'GB': 'United Kingdom',
    'CN': 'China',
    'DE': 'Germany',
    'JP': 'Japan',
    'KR': 'South Korea',
    'AU': 'Australia',
    'CA': 'Canada',
    'FR': 'France',
    'IT': 'Italy',
    'NL': 'Netherlands',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'ID': 'Indonesia',
    'PH': 'Philippines',
    'IN': 'India',
    'AE': 'United Arab Emirates',
    'HK': 'Hong Kong'
  };

  return countries[countryCode] || countryCode;
}

/**
 * Get address type display text
 * @param {boolean} isShipping - Is shipping address
 * @param {boolean} isBilling - Is billing address
 * @returns {string} Address type description
 */
export function getAddressTypeText(isShipping, isBilling) {
  if (isShipping && isBilling) {
    return 'Shipping & Billing';
  } else if (isShipping) {
    return 'Shipping Only';
  } else if (isBilling) {
    return 'Billing Only';
  }
  return 'Unknown Type';
}

/**
 * Generate address summary for selection lists
 * @param {Object} address - Address object
 * @returns {string} Address summary
 */
export function getAddressSummary(address) {
  if (!address) return '';

  const parts = [];

  // Add label
  if (address.label) {
    parts.push(address.label);
  }

  // Add first line and city
  if (address.address_line_1 && address.city) {
    parts.push(`${address.address_line_1}, ${address.city}`);
  } else if (address.address_line_1) {
    parts.push(address.address_line_1);
  } else if (address.city) {
    parts.push(address.city);
  }

  return parts.join(' - ');
}

/**
 * Check if two addresses are similar (for duplicate detection)
 * @param {Object} address1 - First address
 * @param {Object} address2 - Second address
 * @returns {boolean} Whether addresses are similar
 */
export function areAddressesSimilar(address1, address2) {
  if (!address1 || !address2) return false;

  // Normalize text for comparison
  const normalize = (text) => 
    text?.toString().toLowerCase().replace(/\s+/g, ' ').trim() || '';

  const fields = [
    'address_line_1', 
    'city', 
    'state', 
    'postcode', 
    'country'
  ];

  // Check if most fields match
  const matches = fields.reduce((count, field) => {
    return normalize(address1[field]) === normalize(address2[field]) ? count + 1 : count;
  }, 0);

  // Consider similar if 4 out of 5 key fields match
  return matches >= 4;
}

/**
 * Extract initials from address label for avatar display
 * @param {string} label - Address label
 * @returns {string} Initials (max 2 characters)
 */
export function getAddressInitials(label) {
  if (!label) return 'AD';

  return label
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Format address for API submission
 * @param {Object} formData - Form data from AddressForm
 * @returns {Object} API-ready address data
 */
export function formatAddressForAPI(formData) {
  return {
    label: formData.label?.trim(),
    addressLine1: formData.addressLine1?.trim(),
    addressLine2: formData.addressLine2?.trim() || null,
    postcode: formData.postcode?.trim(),
    city: formData.city?.trim(),
    state: formData.state?.trim(),
    country: formData.country?.toUpperCase(),
    isDefault: Boolean(formData.isDefault),
    isBillingAddress: Boolean(formData.isBillingAddress),
    isShippingAddress: Boolean(formData.isShippingAddress),
    contactName: formData.contactName?.trim() || null,
    contactPhone: formData.contactPhone?.trim() || null,
    contactEmail: formData.contactEmail?.trim()?.toLowerCase() || null,
    latitude: formData.latitude || null,
    longitude: formData.longitude || null
  };
}

/**
 * Parse address string into components (basic parsing)
 * @param {string} addressString - Address as string
 * @returns {Object} Parsed address components
 */
export function parseAddressString(addressString) {
  if (!addressString || typeof addressString !== 'string') {
    return {};
  }

  const lines = addressString.split('\n').map(line => line.trim()).filter(Boolean);
  const result = {};

  if (lines.length > 0) {
    result.address_line_1 = lines[0];
  }

  if (lines.length > 1) {
    result.address_line_2 = lines[1];
  }

  // Try to extract city, state, postcode from last line
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    const parts = lastLine.split(',').map(part => part.trim());

    if (parts.length >= 2) {
      result.city = parts[0];
      
      // Try to extract postcode (numbers at the end)
      const lastPart = parts[parts.length - 1];
      const postcodeMatch = lastPart.match(/\d+/);
      if (postcodeMatch) {
        result.postcode = postcodeMatch[0];
        result.state = parts.slice(1, -1).join(', ') || lastPart.replace(postcodeMatch[0], '').trim();
      } else {
        result.state = parts.slice(1).join(', ');
      }
    }
  }

  return result;
}