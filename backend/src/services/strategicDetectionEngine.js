/**
 * Strategic Items Detection Engine
 * Multi-layer analysis system for Malaysian Strategic Trade Act 2010 compliance
 * 
 * Detection Layers:
 * 1. RAG Exact Match (95% confidence) - Direct lookup
 * 2. RAG Semantic Search (85% confidence) - Vector similarity
 * 3. Technical Specs (90% confidence) - TPP, process node analysis
 * 4. HS Code + RAG (70% confidence) - Enhanced HS analysis
 * 5. Keywords + RAG (60% confidence) - Strategic terms validation
 */

import StrategicItemsRAG from './strategicItemsRAG.js';

class StrategicDetectionEngine {
    constructor(db) {
        this.db = db;
        this.ragService = new StrategicItemsRAG(db);
        this.initialized = false;
    }

    /**
     * Initialize the detection engine
     */
    async initialize() {
        if (!this.initialized) {
            console.log('🚀 Initializing Strategic Detection Engine...');
            await this.ragService.initialize();
            this.initialized = true;
            console.log('✅ Strategic Detection Engine ready');
        }
    }

    /**
     * Process shipment for strategic items detection
     */
    async processShipment(shipmentId, productItems) {
        try {
            await this.initialize();
            
            console.log(`🔍 Processing shipment ${shipmentId} with ${productItems.length} items`);
            
            const shipmentResults = {
                shipment_id: shipmentId,
                total_items: productItems.length,
                strategic_items_found: 0,
                export_blocked: false,
                overall_compliance_score: 100,
                detection_results: [],
                required_permits: new Set(),
                compliance_actions: []
            };

            // Process each product item
            for (let i = 0; i < productItems.length; i++) {
                const item = productItems[i];
                console.log(`\n📦 Processing item ${i + 1}/${productItems.length}: ${item.description}`);
                
                try {
                    // Run multi-layer detection
                    const detectionResult = await this.ragService.detectStrategicItems(item);
                    
                    // Store detection result in database
                    const storedResult = await this.storeDetectionResult(
                        shipmentId, 
                        item, 
                        detectionResult
                    );
                    
                    shipmentResults.detection_results.push(storedResult);
                    
                    // Update shipment-level statistics
                    if (detectionResult.is_strategic) {
                        shipmentResults.strategic_items_found++;
                        shipmentResults.export_blocked = true; // Block export if any strategic items found
                        
                        // Collect required permits
                        detectionResult.required_permits.forEach(permit => {
                            shipmentResults.required_permits.add(permit);
                        });
                        
                        // Add compliance actions
                        shipmentResults.compliance_actions.push({
                            item_description: item.description,
                            strategic_codes: detectionResult.strategic_codes,
                            required_permits: detectionResult.required_permits,
                            action: 'UPLOAD_PERMITS',
                            priority: 'HIGH',
                            deadline_days: 30
                        });
                    }
                    
                } catch (itemError) {
                    console.error(`❌ Failed to process item ${i + 1}:`, itemError);
                    
                    // Store error result
                    await this.storeErrorResult(shipmentId, item, itemError);
                }
            }

            // Convert Set to Array for JSON serialization
            shipmentResults.required_permits = Array.from(shipmentResults.required_permits);
            
            // Calculate overall compliance score
            shipmentResults.overall_compliance_score = this.calculateComplianceScore(shipmentResults);
            
            // Log shipment summary
            this.logShipmentSummary(shipmentResults);
            
            // Create audit trail entry
            await this.createAuditTrail(shipmentId, 'STRATEGIC_DETECTION', {
                total_items: shipmentResults.total_items,
                strategic_items_found: shipmentResults.strategic_items_found,
                export_blocked: shipmentResults.export_blocked,
                required_permits: shipmentResults.required_permits,
                compliance_score: shipmentResults.overall_compliance_score
            });
            
            return shipmentResults;
            
        } catch (error) {
            console.error('❌ Strategic detection processing failed:', error);
            throw error;
        }
    }

    /**
     * Store detection result in database
     */
    async storeDetectionResult(shipmentId, productItem, detectionResult) {
        try {
            // First check if the shipment exists to avoid foreign key constraint violation
            const shipmentExists = await this.db.query(
                'SELECT 1 FROM shipments WHERE shipment_id = $1', 
                [shipmentId]
            );
            
            if (shipmentExists.rows.length === 0) {
                console.log(`⚠️ Skipping detection result storage - shipment ${shipmentId} does not exist`);
                // Return a mock result for API response consistency
                return {
                    detection_result_id: 'mock-' + Date.now(),
                    created_at: new Date().toISOString(),
                    product_description: productItem.description,
                    hs_code: productItem.hs_code,
                    detection_layers: detectionResult.detection_layers,
                    final_confidence: detectionResult.final_confidence,
                    is_strategic: detectionResult.is_strategic,
                    strategic_codes: detectionResult.strategic_codes || [],
                    required_permits: detectionResult.required_permits || [],
                    detection_summary: detectionResult.detection_summary || []
                };
            }
            
            const query = `
                INSERT INTO strategic_detection_results (
                    shipment_id, item_description, hs_code, detection_layers,
                    final_confidence_score, is_strategic, strategic_codes,
                    export_blocked, required_permits, compliance_actions,
                    can_proceed_without_permits, manual_review_required,
                    detection_method
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id, created_at
            `;
            
            const complianceActions = detectionResult.is_strategic ? [
                {
                    action_type: 'UPLOAD_PERMITS',
                    required_permits: detectionResult.required_permits,
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    priority: 'HIGH',
                    description: 'Upload all required permits for strategic items'
                }
            ] : [];
            
            const { rows } = await this.db.query(query, [
                shipmentId,
                productItem.description,
                productItem.hs_code || null,
                JSON.stringify(detectionResult.detection_layers),
                detectionResult.final_confidence,
                detectionResult.is_strategic,
                detectionResult.strategic_codes,
                detectionResult.is_strategic, // export_blocked = is_strategic
                detectionResult.required_permits,
                JSON.stringify(complianceActions),
                false, // can_proceed_without_permits
                detectionResult.final_confidence < 70 && detectionResult.is_strategic, // manual_review_required
                'multi_layer_rag'
            ]);
            
            const storedResult = {
                detection_result_id: rows[0].id,
                created_at: rows[0].created_at,
                ...detectionResult
            };
            
            console.log(`✅ Stored detection result: ${detectionResult.is_strategic ? 'STRATEGIC' : 'NON-STRATEGIC'} (${detectionResult.final_confidence}%)`);
            
            // Add to manual review queue if needed
            if (detectionResult.final_confidence < 70 && detectionResult.is_strategic) {
                await this.addToManualReviewQueue(rows[0].id, shipmentId, 'Low confidence strategic detection');
            }
            
            return storedResult;
            
        } catch (error) {
            console.error('❌ Failed to store detection result:', error);
            throw error;
        }
    }

    /**
     * Store error result for failed detections
     */
    async storeErrorResult(shipmentId, productItem, error) {
        try {
            const query = `
                INSERT INTO strategic_detection_results (
                    shipment_id, item_description, hs_code, detection_layers,
                    final_confidence_score, is_strategic, strategic_codes,
                    export_blocked, required_permits, manual_review_required,
                    detection_method
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `;
            
            await this.db.query(query, [
                shipmentId,
                productItem.description,
                productItem.hs_code || null,
                JSON.stringify({ error: error.message }),
                0, // final_confidence_score
                false, // is_strategic
                [], // strategic_codes
                false, // export_blocked
                [], // required_permits
                true, // manual_review_required
                'multi_layer_rag_error'
            ]);
            
            console.log(`⚠️ Stored error result for item: ${productItem.description}`);
            
        } catch (storeError) {
            console.error('❌ Failed to store error result:', storeError);
        }
    }

    /**
     * Add item to manual review queue
     */
    async addToManualReviewQueue(detectionResultId, shipmentId, reason) {
        try {
            await this.db.query(`
                INSERT INTO strategic_manual_review_queue (
                    detection_result_id, shipment_id, review_reason, priority
                ) VALUES ($1, $2, $3, $4)
            `, [detectionResultId, shipmentId, reason, 'normal']);
            
            console.log(`📋 Added to manual review queue: ${reason}`);
            
        } catch (error) {
            console.error('❌ Failed to add to manual review queue:', error);
        }
    }

    /**
     * Calculate overall compliance score for shipment
     */
    calculateComplianceScore(shipmentResults) {
        if (shipmentResults.strategic_items_found === 0) {
            return 100; // No strategic items = 100% compliant
        }
        
        // Base score reduction for having strategic items
        let score = 70;
        
        // Further reduction based on confidence levels
        const avgConfidence = shipmentResults.detection_results
            .filter(r => r.is_strategic)
            .reduce((sum, r) => sum + r.final_confidence, 0) / shipmentResults.strategic_items_found;
        
        if (avgConfidence >= 90) {
            score -= 30; // High confidence strategic items
        } else if (avgConfidence >= 70) {
            score -= 20; // Medium confidence
        } else {
            score -= 10; // Low confidence (needs manual review)
        }
        
        // Minimum score is 0
        return Math.max(0, score);
    }

    /**
     * Log shipment processing summary
     */
    logShipmentSummary(shipmentResults) {
        console.log('\n📊 SHIPMENT DETECTION SUMMARY');
        console.log('================================');
        console.log(`Shipment ID: ${shipmentResults.shipment_id}`);
        console.log(`Total Items: ${shipmentResults.total_items}`);
        console.log(`Strategic Items Found: ${shipmentResults.strategic_items_found}`);
        console.log(`Export Blocked: ${shipmentResults.export_blocked ? '🚫 YES' : '✅ NO'}`);
        console.log(`Compliance Score: ${shipmentResults.overall_compliance_score}%`);
        
        if (shipmentResults.required_permits.length > 0) {
            console.log(`Required Permits: ${shipmentResults.required_permits.join(', ')}`);
        }
        
        console.log('================================\n');
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
     * Validate export permissions for a shipment
     */
    async validateExportPermissions(shipmentId) {
        try {
            console.log(`🔒 Validating export permissions for shipment ${shipmentId}`);
            
            // Get all strategic items for this shipment
            const strategicItemsQuery = `
                SELECT 
                    id, item_description, strategic_codes, required_permits,
                    is_strategic, export_blocked
                FROM strategic_detection_results
                WHERE shipment_id = $1 AND is_strategic = true
            `;
            
            const { rows: strategicItems } = await this.db.query(strategicItemsQuery, [shipmentId]);
            
            const validationResult = {
                shipment_id: shipmentId,
                export_permitted: true,
                blocking_reasons: [],
                missing_permits: [],
                strategic_items_count: strategicItems.length,
                compliance_score: 0,
                validation_details: []
            };
            
            if (strategicItems.length === 0) {
                validationResult.compliance_score = 100;
                validationResult.validation_details.push('No strategic items detected - export permitted');
                
                // Log validation result
                await this.logExportValidation(shipmentId, validationResult);
                return validationResult;
            }
            
            // Check permits for each strategic item
            for (const item of strategicItems) {
                const itemValidation = {
                    item_description: item.item_description,
                    strategic_codes: item.strategic_codes,
                    required_permits: item.required_permits,
                    missing_permits: [],
                    has_all_permits: true
                };
                
                // Check each required permit
                for (const permitType of item.required_permits) {
                    const permitQuery = `
                        SELECT id, permit_number, is_valid, expiry_date
                        FROM permit_uploads
                        WHERE shipment_id = $1 AND permit_type = $2 AND is_valid = true
                        ORDER BY uploaded_at DESC
                        LIMIT 1
                    `;
                    
                    const { rows: permits } = await this.db.query(permitQuery, [shipmentId, permitType]);
                    
                    if (permits.length === 0) {
                        itemValidation.missing_permits.push(permitType);
                        itemValidation.has_all_permits = false;
                        
                        if (!validationResult.missing_permits.includes(permitType)) {
                            validationResult.missing_permits.push(permitType);
                        }
                    } else {
                        // Check if permit is expired
                        const permit = permits[0];
                        if (permit.expiry_date && new Date(permit.expiry_date) < new Date()) {
                            itemValidation.missing_permits.push(`${permitType} (EXPIRED)`);
                            itemValidation.has_all_permits = false;
                            
                            if (!validationResult.missing_permits.includes(`${permitType} (EXPIRED)`)) {
                                validationResult.missing_permits.push(`${permitType} (EXPIRED)`);
                            }
                        }
                    }
                }
                
                validationResult.validation_details.push(itemValidation);
                
                // If any item is missing permits, block export
                if (!itemValidation.has_all_permits) {
                    validationResult.export_permitted = false;
                    validationResult.blocking_reasons.push(
                        `Item "${item.item_description}" missing permits: ${itemValidation.missing_permits.join(', ')}`
                    );
                }
            }
            
            // Calculate compliance score
            const itemsWithAllPermits = validationResult.validation_details.filter(
                item => item.has_all_permits
            ).length;
            
            validationResult.compliance_score = strategicItems.length > 0 
                ? Math.round((itemsWithAllPermits / strategicItems.length) * 100)
                : 100;
            
            // Log validation result
            await this.logExportValidation(shipmentId, validationResult);
            
            console.log(`🔒 Export validation complete: ${validationResult.export_permitted ? '✅ PERMITTED' : '🚫 BLOCKED'}`);
            
            return validationResult;
            
        } catch (error) {
            console.error('❌ Export validation failed:', error);
            throw error;
        }
    }

    /**
     * Log export validation result
     */
    async logExportValidation(shipmentId, validationResult) {
        try {
            // First check if the shipment exists to avoid foreign key constraint violation
            const shipmentExists = await this.db.query(
                'SELECT 1 FROM shipments WHERE shipment_id = $1', 
                [shipmentId]
            );
            
            if (shipmentExists.rows.length === 0) {
                console.log(`⚠️ Skipping export validation log - shipment ${shipmentId} does not exist`);
                return;
            }
            
            await this.db.query(`
                INSERT INTO export_validation_log (
                    shipment_id, validation_result, export_permitted,
                    blocking_reasons, missing_permits, compliance_score
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                shipmentId,
                JSON.stringify(validationResult),
                validationResult.export_permitted,
                validationResult.blocking_reasons,
                validationResult.missing_permits,
                validationResult.compliance_score
            ]);
            
            // Create audit trail
            await this.createAuditTrail(shipmentId, 'EXPORT_VALIDATION', validationResult);
            
        } catch (error) {
            console.error('❌ Failed to log export validation:', error);
        }
    }

    /**
     * Get shipment strategic items status
     */
    async getShipmentStrategicStatus(shipmentId) {
        try {
            // First get the basic stats
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_items,
                    COUNT(CASE WHEN is_strategic = true THEN 1 END) as strategic_items,
                    COUNT(CASE WHEN export_blocked = true THEN 1 END) as blocked_items,
                    AVG(final_confidence_score) as avg_confidence
                FROM strategic_detection_results
                WHERE shipment_id = $1
            `;
            
            // Then get all required permits separately
            const permitsQuery = `
                SELECT DISTINCT permit_type
                FROM strategic_detection_results, unnest(required_permits) as permit_type
                WHERE shipment_id = $1 AND array_length(required_permits, 1) > 0
            `;
            
            const [statsResult, permitsResult] = await Promise.all([
                this.db.query(statsQuery, [shipmentId]),
                this.db.query(permitsQuery, [shipmentId])
            ]);
            
            const stats = statsResult.rows[0];
            const allRequiredPermits = permitsResult.rows.map(row => row.permit_type);
            
            return {
                shipment_id: shipmentId,
                total_items: parseInt(stats.total_items) || 0,
                strategic_items: parseInt(stats.strategic_items) || 0,
                blocked_items: parseInt(stats.blocked_items) || 0,
                avg_confidence: Math.round(parseFloat(stats.avg_confidence) || 0),
                required_permits: allRequiredPermits || [],
                has_strategic_items: parseInt(stats.strategic_items) > 0,
                export_blocked: parseInt(stats.blocked_items) > 0
            };
            
        } catch (error) {
            console.error('❌ Failed to get shipment strategic status:', error);
            throw error;
        }
    }
}

export default StrategicDetectionEngine;
