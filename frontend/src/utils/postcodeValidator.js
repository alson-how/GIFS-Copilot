/**
 * Postcode Validation Utilities
 * Functions for validating and formatting postcodes by country
 */

/**
 * Postcode patterns and formats by country
 */
export const POSTCODE_PATTERNS = {
  MY: {
    pattern: /^\d{5}$/,
    format: '#####',
    example: '50000',
    name: 'Malaysian Postcode'
  },
  SG: {
    pattern: /^\d{6}$/,
    format: '######',
    example: '238863',
    name: 'Singapore Postal Code'
  },
  US: {
    pattern: /^\d{5}(-\d{4})?$/,
    format: '#####(-####)?',
    example: '12345 or 12345-6789',
    name: 'US ZIP Code'
  },
  GB: {
    pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
    format: 'A(A)#(A) #AA',
    example: 'SW1A 1AA',
    name: 'UK Postcode'
  },
  CA: {
    pattern: /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i,
    format: 'A#A #A#',
    example: 'K1A 0A6',
    name: 'Canadian Postal Code'
  },
  AU: {
    pattern: /^\d{4}$/,
    format: '####',
    example: '2000',
    name: 'Australian Postcode'
  },
  DE: {
    pattern: /^\d{5}$/,
    format: '#####',
    example: '10115',
    name: 'German Postcode'
  },
  FR: {
    pattern: /^\d{5}$/,
    format: '#####',
    example: '75001',
    name: 'French Postcode'
  },
  IT: {
    pattern: /^\d{5}$/,
    format: '#####',
    example: '00100',
    name: 'Italian Postcode'
  },
  ES: {
    pattern: /^\d{5}$/,
    format: '#####',
    example: '28001',
    name: 'Spanish Postcode'
  },
  JP: {
    pattern: /^\d{3}-?\d{4}$/,
    format: '###-####',
    example: '100-0001',
    name: 'Japanese Postcode'
  },
  KR: {
    pattern: /^\d{5}$/,
    format: '#####',
    example: '06292',
    name: 'Korean Postcode'
  },
  CN: {
    pattern: /^\d{6}$/,
    format: '######',
    example: '100000',
    name: 'Chinese Postcode'
  },
  IN: {
    pattern: /^\d{6}$/,
    format: '######',
    example: '110001',
    name: 'Indian PIN Code'
  },
  NL: {
    pattern: /^\d{4}\s*[A-Z]{2}$/i,
    format: '#### AA',
    example: '1012 AB',
    name: 'Dutch Postcode'
  },
  BE: {
    pattern: /^\d{4}$/,
    format: '####',
    example: '1000',
    name: 'Belgian Postcode'
  },
  CH: {
    pattern: /^\d{4}$/,
    format: '####',
    example: '8000',
    name: 'Swiss Postcode'
  },
  AT: {
    pattern: /^\d{4}$/,
    format: '####',
    example: '1010',
    name: 'Austrian Postcode'
  },
  NO: {
    pattern: /^\d{4}$/,
    format: '####',
    example: '0001',
    name: 'Norwegian Postcode'
  },
  SE: {
    pattern: /^\d{3}\s?\d{2}$/,
    format: '### ##',
    example: '111 29',
    name: 'Swedish Postcode'
  },
  DK: {
    pattern: /^\d{4}$/,
    format: '####',
    example: '1000',
    name: 'Danish Postcode'
  },
  FI: {
    pattern: /^\d{5}$/,
    format: '#####',
    example: '00100',
    name: 'Finnish Postcode'
  },
  BR: {
    pattern: /^\d{5}-?\d{3}$/,
    format: '#####-###',
    example: '01310-100',
    name: 'Brazilian CEP'
  },
  MX: {
    pattern: /^\d{5}$/,
    format: '#####',
    example: '01000',
    name: 'Mexican Postal Code'
  }
};

/**
 * Validate postcode for a specific country
 * @param {string} postcode - Postcode to validate
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {Object} Validation result
 */
export function validatePostcode(postcode, countryCode) {
  const result = {
    isValid: false,
    formatted: postcode,
    message: '',
    pattern: null,
    example: null
  };

  if (!postcode || !countryCode) {
    result.message = 'Postcode and country are required';
    return result;
  }

  const countryPattern = POSTCODE_PATTERNS[countryCode.toUpperCase()];
  
  if (!countryPattern) {
    // Country not supported, assume valid
    result.isValid = true;
    result.message = 'Postcode format not validated for this country';
    return result;
  }

  result.pattern = countryPattern.format;
  result.example = countryPattern.example;

  const trimmedPostcode = postcode.trim();
  
  if (countryPattern.pattern.test(trimmedPostcode)) {
    result.isValid = true;
    result.formatted = formatPostcode(trimmedPostcode, countryCode);
    result.message = `Valid ${countryPattern.name}`;
  } else {
    result.isValid = false;
    result.message = `Invalid format. Expected: ${countryPattern.example}`;
  }

  return result;
}

/**
 * Format postcode according to country conventions
 * @param {string} postcode - Postcode to format
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string} Formatted postcode
 */
export function formatPostcode(postcode, countryCode) {
  if (!postcode || !countryCode) return postcode;

  const trimmed = postcode.trim().toUpperCase();
  const country = countryCode.toUpperCase();

  switch (country) {
    case 'GB':
      // Format UK postcodes: "SW1A1AA" -> "SW1A 1AA"
      if (trimmed.length >= 5 && !trimmed.includes(' ')) {
        return trimmed.slice(0, -3) + ' ' + trimmed.slice(-3);
      }
      return trimmed;
      
    case 'CA':
      // Format Canadian postal codes: "K1A0A6" -> "K1A 0A6"
      if (trimmed.length === 6 && !trimmed.includes(' ')) {
        return trimmed.slice(0, 3) + ' ' + trimmed.slice(3);
      }
      return trimmed;
      
    case 'NL':
      // Format Dutch postcodes: "1012AB" -> "1012 AB"
      if (trimmed.length === 6 && !trimmed.includes(' ')) {
        return trimmed.slice(0, 4) + ' ' + trimmed.slice(4);
      }
      return trimmed;
      
    case 'SE':
      // Format Swedish postcodes: "11129" -> "111 29"
      if (trimmed.length === 5 && !trimmed.includes(' ')) {
        return trimmed.slice(0, 3) + ' ' + trimmed.slice(3);
      }
      return trimmed;
      
    case 'JP':
      // Format Japanese postcodes: "1000001" -> "100-0001"
      if (trimmed.length === 7 && !trimmed.includes('-')) {
        return trimmed.slice(0, 3) + '-' + trimmed.slice(3);
      }
      return trimmed;
      
    case 'BR':
      // Format Brazilian CEP: "01310100" -> "01310-100"
      if (trimmed.length === 8 && !trimmed.includes('-')) {
        return trimmed.slice(0, 5) + '-' + trimmed.slice(5);
      }
      return trimmed;
      
    default:
      return trimmed;
  }
}

/**
 * Get postcode format information for a country
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {Object|null} Format information or null if not supported
 */
export function getPostcodeFormat(countryCode) {
  return POSTCODE_PATTERNS[countryCode?.toUpperCase()] || null;
}

/**
 * Check if a country has postcode validation support
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {boolean} Whether validation is supported
 */
export function isPostcodeValidationSupported(countryCode) {
  return !!POSTCODE_PATTERNS[countryCode?.toUpperCase()];
}

/**
 * Get validation hint text for a country's postcode format
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string} Hint text
 */
export function getPostcodeHint(countryCode) {
  const format = getPostcodeFormat(countryCode);
  if (!format) {
    return 'Enter postcode/ZIP code';
  }
  return `Format: ${format.example}`;
}

/**
 * Normalize postcode for comparison (remove spaces, convert to uppercase)
 * @param {string} postcode - Postcode to normalize
 * @returns {string} Normalized postcode
 */
export function normalizePostcode(postcode) {
  if (!postcode) return '';
  return postcode.toString().replace(/\s+/g, '').toUpperCase();
}

/**
 * Compare two postcodes for equality (ignoring formatting)
 * @param {string} postcode1 - First postcode
 * @param {string} postcode2 - Second postcode
 * @returns {boolean} Whether postcodes are equal
 */
export function arePostcodesEqual(postcode1, postcode2) {
  return normalizePostcode(postcode1) === normalizePostcode(postcode2);
}

/**
 * Extract numeric part from postcode (useful for sorting)
 * @param {string} postcode - Postcode to extract from
 * @returns {number|null} Numeric part or null if no numbers found
 */
export function extractPostcodeNumber(postcode) {
  if (!postcode) return null;
  const numbers = postcode.match(/\d+/);
  return numbers ? parseInt(numbers[0], 10) : null;
}

/**
 * Validate multiple postcodes at once
 * @param {Array<{postcode: string, country: string}>} postcodes - Array of postcode/country pairs
 * @returns {Array<Object>} Array of validation results
 */
export function validateMultiplePostcodes(postcodes) {
  return postcodes.map(({ postcode, country }) => ({
    postcode,
    country,
    ...validatePostcode(postcode, country)
  }));
}

/**
 * Get postcode validation regex for a country (for frontend validation)
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {RegExp|null} Validation regex or null if not supported
 */
export function getPostcodeRegex(countryCode) {
  const format = getPostcodeFormat(countryCode);
  return format ? format.pattern : null;
}

/**
 * Auto-correct common postcode mistakes
 * @param {string} postcode - Postcode to correct
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string} Corrected postcode
 */
export function autoCorrectPostcode(postcode, countryCode) {
  if (!postcode || !countryCode) return postcode;

  let corrected = postcode.trim();
  const country = countryCode.toUpperCase();

  // Remove common invalid characters
  corrected = corrected.replace(/[^\w\s-]/g, '');

  // Country-specific corrections
  switch (country) {
    case 'GB':
      // Fix common UK postcode issues
      corrected = corrected.toUpperCase();
      // Replace O with 0 in numeric parts
      corrected = corrected.replace(/O(\d)/g, '0$1');
      corrected = corrected.replace(/(\d)O/g, '$10');
      break;
      
    case 'CA':
      // Fix Canadian postal code issues
      corrected = corrected.toUpperCase();
      // Replace 0 with O in alphabetic parts (common OCR error)
      if (corrected.length === 6) {
        corrected = corrected.charAt(0) + corrected.charAt(1) + 
                   (corrected.charAt(2) === '0' ? 'O' : corrected.charAt(2)) + 
                   corrected.slice(3);
      }
      break;
      
    case 'US':
      // Fix US ZIP code issues
      corrected = corrected.replace(/\D/g, ''); // Remove all non-digits
      if (corrected.length === 9) {
        corrected = corrected.slice(0, 5) + '-' + corrected.slice(5);
      }
      break;
      
    default:
      break;
  }

  return corrected;
}