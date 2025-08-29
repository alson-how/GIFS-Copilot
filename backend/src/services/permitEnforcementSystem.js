/**
 * Permit Enforcement System
 * Malaysian Strategic Trade Act 2010 Compliance
 * 
 * Features:
 * - Hard export blocking until permits uploaded
 * - Permit validation and tracking
 * - Compliance deadline management
 * - Real-time permit status updates
 * - Comprehensive audit trail
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PermitEnforcementSystem {
    constructor(db) {
        this.db = db;
        this.uploadsDir = path.join(__dirname, '../../uploads/permits');
        this.permitTypes = {
            'STA_2010': {
                name: 'Strategic Trade Authorization 2010',
                authority: 'MITI',
                deadline_days: 30,
                mandatory: true,
                validation_rules: ['permit_number_required', 'expiry_date_required']
            },
            'AICA': {
                name: 'Artificial Intelligence Control Authorization',
                authority: 'MCMC',
                deadline_days: 14,
                mandatory: true,
                validation_rules: ['permit_number_required', 'technical_specs_required']
            },
            'TechDocs': {
                name: 'Technical Documentation',
                authority: 'Internal',
                deadline_days: 7,
                mandatory: true,
                validation_rules: ['technical_specifications']
            },
            'SIRIM': {
                name: 'SIRIM Certification',
                authority: 'SIRIM',
                deadline_days: 21,
                mandatory: true,
                validation_rules: ['certificate_number_required', 'test_report_required']
            },
            'CyberSecurity': {
                name: 'Cybersecurity Clearance',
                authority: 'CyberSecurity Malaysia',
                deadline_days: 21,
                mandatory: true,
                validation_rules: ['security_assessment_required']
            }
        };
    }

    /**
     * Initialize permit enforcement system
     */
    async initialize() {
        try {
            // Ensure uploads directory exists
            await fs.mkdir(this.uploadsDir, { recursive: true });
            console.log('✅ Permit Enforcement System initialized');
        } catch (error) {
            console.error('❌ Failed to initialize permit system:', error);
            throw error;
        }
    }

    /**
     * Upload and validate permit
     */
    async uploadPermit(shipmentId, permitType, fileBuffer, originalFilename, uploadedBy) {
        try {
            console.log(`📤 Uploading permit: ${permitType} for shipment ${shipmentId}`);
            
            // Validate permit type
            if (!this.permitTypes[permitType]) {
                throw new Error(`Invalid permit type: ${permitType}`);
            }
            
            // Generate unique filename
            const fileExtension = path.extname(originalFilename);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${shipmentId}_${permitType}_${timestamp}${fileExtension}`;
            const filePath = path.join(this.uploadsDir, filename);
            
            // Save file to disk
            await fs.writeFile(filePath, fileBuffer);
            
            // Store permit record in database
            const permitRecord = await this.storePermitRecord({
                shipment_id: shipmentId,
                permit_type: permitType,
                file_path: filePath,
                original_filename: originalFilename,
                file_size: fileBuffer.length,
                mime_type: this.getMimeType(originalFilename),
                uploaded_by: uploadedBy
            });
            
            // Validate permit
            const validationResult = await this.validatePermit(permitRecord.id, permitType, filePath);
            
            // Update permit record with validation result
            await this.updatePermitValidation(permitRecord.id, validationResult);
            
            // Check if this completes compliance for the shipment
            await this.checkShipmentCompliance(shipmentId);
            
            // Create audit trail
            await this.createAuditTrail(shipmentId, 'PERMIT_UPLOAD', {
                permit_type: permitType,
                permit_id: permitRecord.id,
                validation_result: validationResult,
                uploaded_by: uploadedBy
            });
            
            console.log(`✅ Permit uploaded and validated: ${permitType} (${validationResult.is_valid ? 'VALID' : 'INVALID'})`);
            
            return {
                permit_id: permitRecord.id,
                permit_type: permitType,
                validation_result: validationResult,
                compliance_updated: true
            };
            
        } catch (error) {
            console.error('❌ Permit upload failed:', error);
            throw error;
        }
    }

    /**
     * Store permit record in database
     */
    async storePermitRecord(permitData) {
        try {
            const query = `
                INSERT INTO permit_uploads (
                    shipment_id, permit_type, file_path, original_filename,
                    file_size, mime_type, upload_status, uploaded_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, uploaded_at
            `;
            
            const { rows } = await this.db.query(query, [
                permitData.shipment_id,
                permitData.permit_type,
                permitData.file_path,
                permitData.original_filename,
                permitData.file_size,
                permitData.mime_type,
                'uploaded',
                permitData.uploaded_by
            ]);
            
            return {
                id: rows[0].id,
                uploaded_at: rows[0].uploaded_at,
                ...permitData
            };
            
        } catch (error) {
            console.error('❌ Failed to store permit record:', error);
            throw error;
        }
    }

    /**
     * Validate uploaded permit
     */
    async validatePermit(permitId, permitType, filePath) {
        try {
            console.log(`🔍 Validating permit: ${permitType}`);
            
            const permitConfig = this.permitTypes[permitType];
            const validationResult = {
                permit_id: permitId,
                permit_type: permitType,
                is_valid: true,
                validation_errors: [],
                validation_warnings: [],
                extracted_data: {},
                validation_timestamp: new Date()
            };
            
            // File existence check
            try {
                await fs.access(filePath);
            } catch {
                validationResult.is_valid = false;
                validationResult.validation_errors.push('File not found or not accessible');
                return validationResult;
            }
            
            // File size check
            const stats = await fs.stat(filePath);
            if (stats.size === 0) {
                validationResult.is_valid = false;
                validationResult.validation_errors.push('File is empty');
                return validationResult;
            }
            
            if (stats.size > 50 * 1024 * 1024) { // 50MB limit
                validationResult.is_valid = false;
                validationResult.validation_errors.push('File size exceeds 50MB limit');
                return validationResult;
            }
            
            // Permit-specific validation
            switch (permitType) {
                case 'STA_2010':
                    await this.validateSTA2010Permit(filePath, validationResult);
                    break;
                case 'AICA':
                    await this.validateAICAPermit(filePath, validationResult);
                    break;
                case 'TechDocs':
                    await this.validateTechDocsPermit(filePath, validationResult);
                    break;
                case 'SIRIM':
                    await this.validateSIRIMPermit(filePath, validationResult);
                    break;
                case 'CyberSecurity':
                    await this.validateCyberSecurityPermit(filePath, validationResult);
                    break;
                default:
                    validationResult.validation_warnings.push('No specific validation rules for this permit type');
            }
            
            // Set compliance deadline
            const deadlineDays = permitConfig.deadline_days;
            validationResult.compliance_deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);
            
            console.log(`🔍 Permit validation complete: ${validationResult.is_valid ? '✅ VALID' : '❌ INVALID'}`);
            
            return validationResult;
            
        } catch (error) {
            console.error('❌ Permit validation failed:', error);
            return {
                permit_id: permitId,
                permit_type: permitType,
                is_valid: false,
                validation_errors: [`Validation system error: ${error.message}`],
                validation_warnings: [],
                extracted_data: {},
                validation_timestamp: new Date()
            };
        }
    }

    /**
     * Validate STA 2010 permit
     */
    async validateSTA2010Permit(filePath, validationResult) {
        try {
            // Basic PDF/document validation
            const fileExtension = path.extname(filePath).toLowerCase();
            if (!['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'].includes(fileExtension)) {
                validationResult.is_valid = false;
                validationResult.validation_errors.push('STA 2010 permit must be PDF, DOC, or image format');
                return;
            }
            
            // For demo purposes, we'll do basic validation
            // In production, you would use OCR or document parsing
            validationResult.extracted_data = {
                permit_authority: 'MITI',
                document_type: 'STA_2010',
                validation_method: 'document_format_check'
            };
            
            validationResult.validation_warnings.push('Advanced document content validation not implemented - manual review recommended');
            
        } catch (error) {
            validationResult.is_valid = false;
            validationResult.validation_errors.push(`STA 2010 validation error: ${error.message}`);
        }
    }

    /**
     * Validate AICA permit
     */
    async validateAICAPermit(filePath, validationResult) {
        try {
            const fileExtension = path.extname(filePath).toLowerCase();
            if (!['.pdf', '.doc', '.docx'].includes(fileExtension)) {
                validationResult.is_valid = false;
                validationResult.validation_errors.push('AICA permit must be PDF or DOC format');
                return;
            }
            
            validationResult.extracted_data = {
                permit_authority: 'MCMC',
                document_type: 'AICA',
                validation_method: 'document_format_check'
            };
            
            validationResult.validation_warnings.push('AI-specific technical validation not implemented - manual review required');
            
        } catch (error) {
            validationResult.is_valid = false;
            validationResult.validation_errors.push(`AICA validation error: ${error.message}`);
        }
    }

    /**
     * Validate Technical Documentation permit
     */
    async validateTechDocsPermit(filePath, validationResult) {
        try {
            const fileExtension = path.extname(filePath).toLowerCase();
            if (!['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(fileExtension)) {
                validationResult.is_valid = false;
                validationResult.validation_errors.push('Technical documentation must be PDF, DOC, or Excel format');
                return;
            }
            
            validationResult.extracted_data = {
                document_type: 'TechDocs',
                validation_method: 'document_format_check'
            };
            
        } catch (error) {
            validationResult.is_valid = false;
            validationResult.validation_errors.push(`Technical docs validation error: ${error.message}`);
        }
    }

    /**
     * Validate SIRIM permit
     */
    async validateSIRIMPermit(filePath, validationResult) {
        try {
            const fileExtension = path.extname(filePath).toLowerCase();
            if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(fileExtension)) {
                validationResult.is_valid = false;
                validationResult.validation_errors.push('SIRIM certificate must be PDF or image format');
                return;
            }
            
            validationResult.extracted_data = {
                permit_authority: 'SIRIM',
                document_type: 'SIRIM',
                validation_method: 'document_format_check'
            };
            
        } catch (error) {
            validationResult.is_valid = false;
            validationResult.validation_errors.push(`SIRIM validation error: ${error.message}`);
        }
    }

    /**
     * Validate CyberSecurity permit
     */
    async validateCyberSecurityPermit(filePath, validationResult) {
        try {
            const fileExtension = path.extname(filePath).toLowerCase();
            if (!['.pdf', '.doc', '.docx'].includes(fileExtension)) {
                validationResult.is_valid = false;
                validationResult.validation_errors.push('CyberSecurity clearance must be PDF or DOC format');
                return;
            }
            
            validationResult.extracted_data = {
                permit_authority: 'CyberSecurity Malaysia',
                document_type: 'CyberSecurity',
                validation_method: 'document_format_check'
            };
            
        } catch (error) {
            validationResult.is_valid = false;
            validationResult.validation_errors.push(`CyberSecurity validation error: ${error.message}`);
        }
    }

    /**
     * Update permit validation result in database
     */
    async updatePermitValidation(permitId, validationResult) {
        try {
            const query = `
                UPDATE permit_uploads SET
                    upload_status = $2,
                    validation_result = $3,
                    is_valid = $4,
                    validated_at = $5,
                    compliance_deadline = $6
                WHERE id = $1
            `;
            
            await this.db.query(query, [
                permitId,
                validationResult.is_valid ? 'valid' : 'invalid',
                JSON.stringify(validationResult),
                validationResult.is_valid,
                validationResult.validation_timestamp,
                validationResult.compliance_deadline || null
            ]);
            
        } catch (error) {
            console.error('❌ Failed to update permit validation:', error);
            throw error;
        }
    }

    /**
     * Check shipment compliance after permit upload
     */
    async checkShipmentCompliance(shipmentId) {
        try {
            console.log(`🔒 Checking compliance for shipment ${shipmentId}`);
            
            // Get all strategic items and their required permits
            const strategicItemsQuery = `
                SELECT id, required_permits, export_blocked
                FROM strategic_detection_results
                WHERE shipment_id = $1 AND is_strategic = true
            `;
            
            const { rows: strategicItems } = await this.db.query(strategicItemsQuery, [shipmentId]);
            
            if (strategicItems.length === 0) {
                console.log('✅ No strategic items - shipment compliant');
                return { compliant: true, reason: 'No strategic items detected' };
            }
            
            let allCompliant = true;
            const complianceDetails = [];
            
            for (const item of strategicItems) {
                const itemCompliance = {
                    detection_result_id: item.id,
                    required_permits: item.required_permits,
                    missing_permits: [],
                    compliant: true
                };
                
                // Check each required permit
                for (const permitType of item.required_permits) {
                    const permitQuery = `
                        SELECT id, is_valid, expiry_date
                        FROM permit_uploads
                        WHERE shipment_id = $1 AND permit_type = $2 AND is_valid = true
                        ORDER BY uploaded_at DESC
                        LIMIT 1
                    `;
                    
                    const { rows: permits } = await this.db.query(permitQuery, [shipmentId, permitType]);
                    
                    if (permits.length === 0) {
                        itemCompliance.missing_permits.push(permitType);
                        itemCompliance.compliant = false;
                        allCompliant = false;
                    } else {
                        // Check expiry
                        const permit = permits[0];
                        if (permit.expiry_date && new Date(permit.expiry_date) < new Date()) {
                            itemCompliance.missing_permits.push(`${permitType} (EXPIRED)`);
                            itemCompliance.compliant = false;
                            allCompliant = false;
                        }
                    }
                }
                
                complianceDetails.push(itemCompliance);
                
                // Update export_blocked status for this item
                await this.db.query(`
                    UPDATE strategic_detection_results 
                    SET export_blocked = $2, updated_at = NOW()
                    WHERE id = $1
                `, [item.id, !itemCompliance.compliant]);
            }
            
            // Create compliance log entry
            await this.logComplianceCheck(shipmentId, {
                compliant: allCompliant,
                strategic_items_count: strategicItems.length,
                compliance_details: complianceDetails,
                checked_at: new Date()
            });
            
            console.log(`🔒 Compliance check complete: ${allCompliant ? '✅ COMPLIANT' : '🚫 NON-COMPLIANT'}`);
            
            return {
                compliant: allCompliant,
                strategic_items_count: strategicItems.length,
                compliance_details: complianceDetails
            };
            
        } catch (error) {
            console.error('❌ Compliance check failed:', error);
            throw error;
        }
    }

    /**
     * Log compliance check result
     */
    async logComplianceCheck(shipmentId, complianceResult) {
        try {
            await this.createAuditTrail(shipmentId, 'COMPLIANCE_CHECK', complianceResult);
        } catch (error) {
            console.error('❌ Failed to log compliance check:', error);
        }
    }

    /**
     * Get permit status for shipment
     */
    async getPermitStatus(shipmentId) {
        try {
            // Get required permits for strategic items
            const requiredPermitsQuery = `
                SELECT DISTINCT unnest(required_permits) as permit_type
                FROM strategic_detection_results
                WHERE shipment_id = $1 AND is_strategic = true
            `;
            
            const { rows: requiredPermits } = await this.db.query(requiredPermitsQuery, [shipmentId]);
            
            // Get uploaded permits
            const uploadedPermitsQuery = `
                SELECT permit_type, is_valid, uploaded_at, validation_result
                FROM permit_uploads
                WHERE shipment_id = $1
                ORDER BY permit_type, uploaded_at DESC
            `;
            
            const { rows: uploadedPermits } = await this.db.query(uploadedPermitsQuery, [shipmentId]);
            
            const permitStatus = {
                shipment_id: shipmentId,
                required_permits: [],
                uploaded_permits: uploadedPermits,
                missing_permits: [],
                invalid_permits: [],
                compliance_status: 'unknown'
            };
            
            // Process required permits
            for (const { permit_type } of requiredPermits) {
                const permitConfig = this.permitTypes[permit_type];
                const uploaded = uploadedPermits.find(p => p.permit_type === permit_type && p.is_valid);
                
                const permitInfo = {
                    permit_type: permit_type,
                    name: permitConfig?.name || permit_type,
                    authority: permitConfig?.authority || 'Unknown',
                    deadline_days: permitConfig?.deadline_days || 30,
                    mandatory: permitConfig?.mandatory || true,
                    status: uploaded ? 'valid' : 'missing',
                    uploaded_at: uploaded?.uploaded_at || null
                };
                
                permitStatus.required_permits.push(permitInfo);
                
                if (!uploaded) {
                    permitStatus.missing_permits.push(permit_type);
                }
            }
            
            // Check for invalid permits
            permitStatus.invalid_permits = uploadedPermits
                .filter(p => !p.is_valid)
                .map(p => ({
                    permit_type: p.permit_type,
                    uploaded_at: p.uploaded_at,
                    validation_errors: p.validation_result?.validation_errors || []
                }));
            
            // Determine compliance status
            if (permitStatus.missing_permits.length === 0 && permitStatus.invalid_permits.length === 0) {
                permitStatus.compliance_status = 'compliant';
            } else if (permitStatus.missing_permits.length > 0) {
                permitStatus.compliance_status = 'missing_permits';
            } else {
                permitStatus.compliance_status = 'invalid_permits';
            }
            
            return permitStatus;
            
        } catch (error) {
            console.error('❌ Failed to get permit status:', error);
            throw error;
        }
    }

    /**
     * Create audit trail entry
     */
    async createAuditTrail(shipmentId, actionType, actionDetails) {
        try {
            await this.db.query(`
                INSERT INTO strategic_audit_trail (
                    shipment_id, action_type, action_details
                ) VALUES ($1, $2, $3)
            `, [shipmentId, actionType, JSON.stringify(actionDetails)]);
            
        } catch (error) {
            console.error('❌ Failed to create audit trail:', error);
        }
    }

    /**
     * Get MIME type from filename
     */
    getMimeType(filename) {
        const extension = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        };
        
        return mimeTypes[extension] || 'application/octet-stream';
    }

    /**
     * Clean up expired permits (maintenance function)
     */
    async cleanupExpiredPermits() {
        try {
            const query = `
                UPDATE permit_uploads 
                SET is_valid = false, upload_status = 'expired'
                WHERE expiry_date < NOW() AND is_valid = true
                RETURNING shipment_id, permit_type
            `;
            
            const { rows: expiredPermits } = await this.db.query(query);
            
            // Re-check compliance for affected shipments
            const affectedShipments = [...new Set(expiredPermits.map(p => p.shipment_id))];
            
            for (const shipmentId of affectedShipments) {
                await this.checkShipmentCompliance(shipmentId);
            }
            
            console.log(`🧹 Cleaned up ${expiredPermits.length} expired permits across ${affectedShipments.length} shipments`);
            
        } catch (error) {
            console.error('❌ Failed to cleanup expired permits:', error);
        }
    }
}

export default PermitEnforcementSystem;
