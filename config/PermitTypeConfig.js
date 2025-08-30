/**
 * Centralized Permit Type Configuration
 * 
 * This file contains all permit type definitions used across the application.
 * It provides a single source of truth for permit types, their properties,
 * and validation rules.
 */

export const PERMIT_TYPES = {
    'STA_2010': {
        name: 'Strategic Trade Authorization 2010',
        authority: 'MITI',
        description: 'Required for all strategic items under Malaysian Strategic Trade Act 2010',
        urgency: 'HIGH',
        deadline: '30 days',
        deadline_days: 30,
        mandatory: true,
        validation_rules: ['permit_number_required', 'expiry_date_required'],
        category: 'strategic_trade'
    },
    'AICA': {
        name: 'Artificial Intelligence Control Authorization',
        authority: 'MCMC',
        description: 'Required for AI/ML hardware and high-performance computing equipment',
        urgency: 'HIGH',
        deadline: '14 days',
        deadline_days: 14,
        mandatory: true,
        validation_rules: ['permit_number_required', 'expiry_date_required', 'technical_specs_required'],
        category: 'ai_control'
    },
    'TechDocs': {
        name: 'Technical Documentation',
        authority: 'Internal',
        description: 'Technical specifications and compliance documentation',
        urgency: 'MEDIUM',
        deadline: '7 days',
        deadline_days: 7,
        mandatory: false,
        validation_rules: ['document_completeness'],
        category: 'documentation'
    },
    'SIRIM': {
        name: 'SIRIM Certification',
        authority: 'SIRIM',
        description: 'Product certification for electronic and telecommunication equipment',
        urgency: 'MEDIUM',
        deadline: '21 days',
        deadline_days: 21,
        mandatory: true,
        validation_rules: ['certification_number_required', 'product_match_required'],
        category: 'certification'
    },
    'CyberSecurity': {
        name: 'Cybersecurity Clearance',
        authority: 'CyberSecurity Malaysia',
        description: 'Security clearance for cybersecurity and encryption products',
        urgency: 'HIGH',
        deadline: '21 days',
        deadline_days: 21,
        mandatory: true,
        validation_rules: ['security_clearance_level', 'encryption_details'],
        category: 'security'
    }
};

/**
 * Get permit type configuration by ID
 * @param {string} permitType - The permit type ID
 * @returns {object} Permit type configuration or default values
 */
export function getPermitTypeConfig(permitType) {
    return PERMIT_TYPES[permitType] || {
        name: permitType,
        authority: 'Unknown',
        description: 'Unknown permit type',
        urgency: 'MEDIUM',
        deadline: '30 days',
        deadline_days: 30,
        mandatory: false,
        validation_rules: [],
        category: 'other'
    };
}

/**
 * Get all permit types
 * @returns {object} All permit type configurations
 */
export function getAllPermitTypes() {
    return PERMIT_TYPES;
}

/**
 * Get permit types by category
 * @param {string} category - The category to filter by
 * @returns {object} Filtered permit types
 */
export function getPermitTypesByCategory(category) {
    return Object.fromEntries(
        Object.entries(PERMIT_TYPES).filter(([_, config]) => config.category === category)
    );
}

/**
 * Get permit types by urgency level
 * @param {string} urgency - The urgency level ('HIGH', 'MEDIUM', 'LOW')
 * @returns {object} Filtered permit types
 */
export function getPermitTypesByUrgency(urgency) {
    return Object.fromEntries(
        Object.entries(PERMIT_TYPES).filter(([_, config]) => config.urgency === urgency)
    );
}

/**
 * Get mandatory permit types
 * @returns {object} Mandatory permit types only
 */
export function getMandatoryPermitTypes() {
    return Object.fromEntries(
        Object.entries(PERMIT_TYPES).filter(([_, config]) => config.mandatory === true)
    );
}

/**
 * Validate if a permit type exists
 * @param {string} permitType - The permit type ID to validate
 * @returns {boolean} True if permit type exists
 */
export function isValidPermitType(permitType) {
    return permitType in PERMIT_TYPES;
}

/**
 * Get permit type IDs as an array
 * @returns {string[]} Array of permit type IDs
 */
export function getPermitTypeIds() {
    return Object.keys(PERMIT_TYPES);
}

/**
 * Get permit type names as an array
 * @returns {string[]} Array of permit type names
 */
export function getPermitTypeNames() {
    return Object.values(PERMIT_TYPES).map(config => config.name);
}

// Default export for convenience
export default {
    PERMIT_TYPES,
    getPermitTypeConfig,
    getAllPermitTypes,
    getPermitTypesByCategory,
    getPermitTypesByUrgency,
    getMandatoryPermitTypes,
    isValidPermitType,
    getPermitTypeIds,
    getPermitTypeNames
};
