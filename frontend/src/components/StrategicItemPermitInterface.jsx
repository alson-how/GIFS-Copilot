/**
 * Strategic Item Permit Interface
 * Malaysian Strategic Trade Act 2010 Compliance Component
 * 
 * Features:
 * - Strategic items detection display
 * - Required permits management
 * - Permit upload interface
 * - Export blocking notifications
 * - Real-time compliance status
 */

import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiMigration.js';

const StrategicItemPermitInterface = ({ 
    shipmentId, 
    onComplianceChange,
    strategicItemsDetected = false,
    exportBlocked = false,
    complianceScore = 100,
    missingPermits = [],
    strategicDetectionComplete = false,
    strategicDetectionLoading = false,
    strategicItemsCount = 0,
    canvasData = null // Add canvas data to know if we're waiting for upload response
}) => {
    const [strategicStatus, setStrategicStatus] = useState(null);
    const [permitStatus, setPermitStatus] = useState(null);
    const [exportValidation, setExportValidation] = useState(null);
    const [loading, setLoading] = useState(false); // Changed to false since we get data from props
    const [error, setError] = useState(null);
    const [hasLoadedFromAPI, setHasLoadedFromAPI] = useState(false);
    const [uploadingPermit, setUploadingPermit] = useState(null);
    const [uploadingInsurance, setUploadingInsurance] = useState(false);
    const [uploadedPermits, setUploadedPermits] = useState({});
    const [insuranceInfo, setInsuranceInfo] = useState(null);

    // Reset all state when shipmentId changes to prevent stale data
    useEffect(() => {
        console.log('🆔 StrategicItemPermitInterface: shipmentId changed to:', shipmentId);
        console.log('🆔 StrategicItemPermitInterface: Previous API loaded flag:', hasLoadedFromAPI);
        
        // Reset the API loaded flag when shipment ID changes
        // This allows the component to make a new API call with the correct ID
        setHasLoadedFromAPI(false);
        setStrategicStatus(null);
        setPermitStatus(null);
        setExportValidation(null);
        setError(null);
        setUploadedPermits({});
        setInsuranceInfo(null);
        
        console.log('🆔 StrategicItemPermitInterface: Reset API loaded flag to false');
    }, [shipmentId]);

    // Also reset when canvas data changes (indicating new upload)
    useEffect(() => {
        if (canvasData?.shipmentId && canvasData.shipmentId !== shipmentId) {
            console.log('🆔 StrategicItemPermitInterface: Canvas shipment ID changed, resetting API flag');
            console.log('🆔 StrategicItemPermitInterface: Canvas ID:', canvasData.shipmentId);
            console.log('🆔 StrategicItemPermitInterface: Component ID:', shipmentId);
            setHasLoadedFromAPI(false);
        }
    }, [canvasData?.shipmentId, shipmentId]);

    useEffect(() => {
        // Update local state when props change
        if (strategicDetectionComplete) {
            console.log('✅ StrategicItemPermitInterface: Strategic detection complete, using prop data');
            setStrategicStatus({
                has_strategic_items: strategicItemsDetected,
                is_blocked: exportBlocked,
                compliance_score: complianceScore,
                missing_permits: missingPermits
            });

            // Set export validation status for bottom section
            setExportValidation({
                export_permitted: !exportBlocked,
                compliance_score: complianceScore,
                missing_permits: missingPermits,
                is_blocked: exportBlocked
            });
            
            // Call the parent's compliance change handler
            if (onComplianceChange) {
                onComplianceChange({
                    hasStrategicItems: strategicItemsDetected,
                    exportBlocked: exportBlocked,
                    complianceScore: complianceScore,
                    missingPermits: missingPermits
                });
            }
        } else if (shipmentId && !hasLoadedFromAPI && !loading && shouldMakeAPICall(shipmentId)) {
            // DEFINITIVE FIX: Only proceed if we have confirmed upload completion
            console.log('🎯 StrategicItemPermitInterface: Upload confirmed complete, proceeding with API calls');
            console.log('🎯 Current shipmentId:', shipmentId);
            console.log('🎯 Canvas shipmentId:', canvasData?.shipmentId);
            console.log('🎯 Upload completed:', canvasData?.uploadCompleted);
            console.log('🎯 Product items available:', canvasData?.invoiceData?.product_items?.length || 0);
            
            // Add small delay for final state synchronization
            const timeoutId = setTimeout(() => {
                console.log('🚀 StrategicItemPermitInterface: Making validated API calls for shipment:', shipmentId);
                
                // Triple-check all conditions before API call
                if (!hasLoadedFromAPI && shouldMakeAPICall(shipmentId) && canvasData?.uploadCompleted) {
                    console.log('✅ All conditions verified - starting strategic processing');
                    setHasLoadedFromAPI(true);
                    
                    // If we have product items from canvas/invoice data, run detection first
                    if (canvasData?.invoiceData?.product_items && canvasData.invoiceData.product_items.length > 0) {
                        console.log('🔍 StrategicItemPermitInterface: Product items found, running detection first');
                        runStrategicDetection(shipmentId, canvasData.invoiceData.product_items);
                    } else {
                        console.log('📊 StrategicItemPermitInterface: No product items, loading status directly');
                        loadStrategicStatus();
                    }
                } else {
                    console.log('❌ Conditions changed during delay or upload not completed');
                    console.log('  hasLoadedFromAPI:', hasLoadedFromAPI);
                    console.log('  shouldMakeAPICall:', shouldMakeAPICall(shipmentId));
                    console.log('  uploadCompleted:', canvasData?.uploadCompleted);
                }
            }, 200); // Increased delay to 200ms for better reliability
            
            return () => clearTimeout(timeoutId);
        } else {
            // Enhanced debugging for when API call is not made
            console.log('🔍 StrategicItemPermitInterface: API call conditions:');
            console.log('  shipmentId:', shipmentId);
            console.log('  hasLoadedFromAPI:', hasLoadedFromAPI);
            console.log('  loading:', loading);
            console.log('  shouldMakeAPICall:', shouldMakeAPICall(shipmentId));
            console.log('  strategicDetectionComplete:', strategicDetectionComplete);
            console.log('  canvasData?.shipmentId:', canvasData?.shipmentId);
        }
    }, [shipmentId, strategicItemsDetected, exportBlocked, complianceScore, missingPermits, strategicDetectionComplete, hasLoadedFromAPI, loading, canvasData]);

    // Helper function to validate shipment ID and determine if we should make API call
    const shouldMakeAPICall = (id) => {
        if (!id) {
            console.log('⚠️ shouldMakeAPICall: No shipment ID provided');
            return false;
        }
        
        // Check if shipment ID is a valid UUID format
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        if (!isUUID) {
            console.log('⚠️ shouldMakeAPICall: Invalid shipment ID format:', id);
            return false;
        }
        
        // DEFINITIVE RACE CONDITION FIX: Check for upload completion flag
        if (canvasData) {
            // If we have canvas data, upload MUST be completed
            if (!canvasData.uploadCompleted) {
                console.log('❌ shouldMakeAPICall: Upload not completed yet, blocking API call');
                return false;
            }
            
            // Upload completed - now check shipment ID match
            if (canvasData.shipmentId !== id) {
                console.log('❌ shouldMakeAPICall: Shipment ID mismatch after upload completion');
                console.log('   Canvas ID (from upload):', canvasData.shipmentId);
                console.log('   Component ID:', id);
                console.log('   Upload timestamp:', new Date(canvasData.uploadTimestamp));
                return false;
            }
            
            console.log('✅ shouldMakeAPICall: Upload completed AND shipment IDs match perfectly');
            console.log('✅ Using shipment ID from upload response:', id);
            console.log('✅ Upload timestamp:', new Date(canvasData.uploadTimestamp));
            return true;
        }
        
        // No canvas data - standalone usage (allow but with warning)
        console.log('⚠️ shouldMakeAPICall: No canvas data - standalone usage, allowing API call:', id);
        return true;
    };

    // Run strategic detection on product items
    const runStrategicDetection = async (shipmentId, productItems) => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🔍 StrategicItemPermitInterface: Running detection for shipment:', shipmentId, 'with', productItems?.length, 'items');
            
            if (!productItems || productItems.length === 0) {
                console.log('⚠️ StrategicItemPermitInterface: No product items found for detection');
                return;
            }
            
            // Format product items for the API
            const formattedItems = productItems.map(item => ({
                product_description: item.product_description || item.description || item.item_description,
                hs_code: item.hs_code,
                quantity: item.quantity || 1,
                value: item.value || item.unit_price || 0,
                item_id: item.id || item.item_id
            })).filter(item => item.product_description); // Only include items with descriptions
            
            if (formattedItems.length === 0) {
                console.log('⚠️ StrategicItemPermitInterface: No valid product items for detection (no descriptions found)');
                return;
            }
            
            const requestBody = {
                shipment_id: shipmentId,
                product_items: formattedItems
            };
            
            console.log('🔍 StrategicItemPermitInterface: Detection request:', requestBody);
            
            const result = await apiService.strategic.detect(requestBody);
            console.log('✅ StrategicItemPermitInterface: Detection completed:', result);
            
            if (result.success) {
                // After detection, load the strategic status to get updated data
                setTimeout(() => {
                    loadStrategicStatus();
                }, 1000); // Small delay to ensure database is updated
            } else {
                throw new Error(result.error || 'Strategic detection failed');
            }
            
        } catch (err) {
            console.error('❌ StrategicItemPermitInterface: Error running detection:', err);
            setError(`Strategic detection failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadStrategicStatus = async () => {
        try {
            setLoading(true);
            setError(null);

            // Final safety check before making API call
            if (!shouldMakeAPICall(shipmentId)) {
                console.log('❌ loadStrategicStatus: Safety check failed, aborting API call');
                setLoading(false);
                return;
            }

            console.log('🚀 loadStrategicStatus: Making API call with shipment ID:', shipmentId);

            // Get strategic items status (includes validation data)
            const statusData = await apiService.strategic.getShipmentStatus(shipmentId);

            if (statusData.success) {
                setStrategicStatus(statusData.data.strategic_status);
                setPermitStatus(statusData.data.permit_status);
                
                // Set export validation from the same response
                setExportValidation({
                    export_permitted: !statusData.data.strategic_status.export_blocked,
                    compliance_score: statusData.data.strategic_status.compliance_score || 100,
                    missing_permits: statusData.data.permit_status.missing_permits || [],
                    is_blocked: statusData.data.strategic_status.export_blocked || false
                });
                
                // Notify parent component of compliance status
                if (onComplianceChange) {
                    onComplianceChange({
                        hasStrategicItems: statusData.data.strategic_status.has_strategic_items || statusData.data.strategic_status.strategic_items > 0,
                        exportBlocked: statusData.data.strategic_status.export_blocked || false,
                        complianceScore: statusData.data.strategic_status.compliance_score || 100,
                        missingPermits: statusData.data.permit_status.missing_permits || []
                    });
                }
            } else {
                setError(statusData.error || 'Failed to load strategic items status');
            }
        } catch (err) {
            console.error('Failed to load strategic status:', err);
            setError('Failed to load strategic items status');
        } finally {
            setLoading(false);
        }
    };

    const handlePermitUpload = async (permitType, file) => {
        try {
            setUploadingPermit(permitType);
            setError(null);

            const formData = new FormData();
            formData.append('permit', file);
            formData.append('shipment_id', shipmentId);
            formData.append('permit_type', permitType);
            formData.append('uploaded_by', 'user');

            const response = await fetch('/api/strategic/permits/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Reload status to reflect changes
                await loadStrategicStatus();
                alert(`✅ ${permitType} permit uploaded and validated successfully!`);
            } else {
                setError(data.error || 'Permit upload failed');
            }
        } catch (err) {
            console.error('Permit upload failed:', err);
            setError('Permit upload failed');
        } finally {
            setUploadingPermit(null);
        }
    };

    const getPermitTypeInfo = (permitType) => {
        const permitTypes = {
            'STA_2010': {
                name: 'Strategic Trade Authorization 2010',
                authority: 'MITI',
                description: 'Required for all strategic items under Malaysian Strategic Trade Act 2010',
                urgency: 'HIGH',
                deadline: '30 days'
            },
            'AICA': {
                name: 'Artificial Intelligence Control Authorization',
                authority: 'MCMC',
                description: 'Required for AI/ML hardware and high-performance computing equipment',
                urgency: 'HIGH',
                deadline: '14 days'
            },
            'TechDocs': {
                name: 'Technical Documentation',
                authority: 'Internal',
                description: 'Technical specifications and compliance documentation',
                urgency: 'MEDIUM',
                deadline: '7 days'
            },
            'SIRIM': {
                name: 'SIRIM Certification',
                authority: 'SIRIM',
                description: 'Product certification for electronic and telecommunication equipment',
                urgency: 'MEDIUM',
                deadline: '21 days'
            },
            'CyberSecurity': {
                name: 'Cybersecurity Clearance',
                authority: 'CyberSecurity Malaysia',
                description: 'Security clearance for cybersecurity and encryption products',
                urgency: 'HIGH',
                deadline: '21 days'
            }
        };

        return permitTypes[permitType] || {
            name: permitType,
            authority: 'Unknown',
            description: 'Required permit',
            urgency: 'MEDIUM',
            deadline: 'TBD'
        };
    };

    // Upload permit function
    const uploadPermit = async (permitType, file) => {
        try {
            setUploadingPermit(permitType);
            
            const formData = new FormData();
            formData.append('permit', file);
            
            const result = await apiService.strategic.uploadPermits(formData);
            
            if (result.success) {
                setUploadedPermits(prev => ({
                    ...prev,
                    [permitType]: result.data
                }));
                console.log(`✅ Permit ${permitType} uploaded successfully`);
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error(`❌ Error uploading permit ${permitType}:`, error);
            setError(`Failed to upload ${permitType}: ${error.message}`);
        } finally {
            setUploadingPermit(null);
        }
    };

    // Upload insurance document function
    const uploadInsurance = async (file, insuranceValue = null) => {
        try {
            setUploadingInsurance(true);
            
            const formData = new FormData();
            formData.append('insurance', file);
            if (insuranceValue) {
                formData.append('insuranceValue', insuranceValue);
                formData.append('currency', 'USD');
            }
            
            const result = await apiService.uploads.upload({
                shipment_id: shipmentId,
                tag: 'insurance',
                files: [file]
            });
            
            if (result.success) {
                setInsuranceInfo(result.data);
                console.log('✅ Insurance document uploaded successfully');
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('❌ Error uploading insurance document:', error);
            setError(`Failed to upload insurance document: ${error.message}`);
        } finally {
            setUploadingInsurance(false);
        }
    };

    // Check if insurance is required (based on OCR data or commercial value)
    const checkInsuranceRequired = () => {
        if (typeof window !== 'undefined' && window.canvasData?.ocrData?.fieldSuggestions) {
            const fieldSuggestions = window.canvasData.ocrData.fieldSuggestions;
            const commercialValue = fieldSuggestions.commercial_value?.value || 0;
            return commercialValue > 10000; // Insurance required for shipments > $10,000
        }
        return false;
    };

    if (loading || strategicDetectionLoading) {
        return (
            <div style={{ 
                padding: '2rem', 
                textAlign: 'center',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9',
                marginBottom: '2rem'
            }}>
                <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '1rem' }}>
                    🔍 Analyzing strategic items and compliance requirements...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '2rem',
                border: '2px solid #ff6b6b',
                borderRadius: '8px',
                backgroundColor: '#ffe0e0',
                marginBottom: '2rem'
            }}>
                <h3 style={{ color: '#d63031', margin: '0 0 1rem 0' }}>
                    ❌ Strategic Items Analysis Error
                </h3>
                <p style={{ color: '#d63031', margin: 0 }}>
                    {error}
                </p>
                <button
                    onClick={loadStrategicStatus}
                    style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#d63031',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Retry Analysis
                </button>
            </div>
        );
    }

    // If no strategic items detected
    if (!strategicItemsDetected && strategicDetectionComplete) {
        return (
            <div style={{
                padding: '2rem',
                border: '2px solid #00b894',
                borderRadius: '8px',
                backgroundColor: '#e8f5f0',
                marginBottom: '2rem'
            }}>
                <h3 style={{ color: '#00b894', margin: '0 0 1rem 0' }}>
                    ✅ No Strategic Items Detected
                </h3>
                <p style={{ color: '#00b894', margin: 0 }}>
                    Your shipment does not contain any items subject to Malaysian Strategic Trade Act 2010 controls. 
                    You may proceed with the export process without additional permits.
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    <strong>Analysis Summary:</strong>
                    <ul style={{ margin: '0.5rem 0 0 1rem' }}>
                        <li>Total items analyzed: {strategicStatus?.total_items || 0}</li>
                        <li>Strategic items found: 0</li>
                        <li>Average detection confidence: {strategicStatus?.avg_confidence || 0}%</li>
                    </ul>
                </div>
            </div>
        );
    }

    console.log('🔍 StrategicItemPermitInterface rendering with:', {
        shipmentId,
        strategicItemsDetected,
        strategicItemsCount,
        complianceScore,
        exportBlocked
    });

    return (
        <div style={{ marginBottom: '2rem' }}>
            {/* Strategic Items Alert */}
            <div style={{
                padding: '2rem',
                border: '3px solid #e17055',
                borderRadius: '8px',
                backgroundColor: '#ffeaa7',
                marginBottom: '2rem'
            }}>
                <h3 style={{ color: '#d63031', margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                    🚨 STRATEGIC ITEMS DETECTED - EXPORT RESTRICTED
                </h3>
                <div style={{ color: '#2d3436', marginBottom: '1rem' }}>
                    <strong>Malaysian Strategic Trade Act 2010 Compliance Required</strong>
                </div>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '1rem',
                    marginBottom: '1rem'
                }}>
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d63031' }}>
                            {strategicItemsDetected ? (strategicItemsCount || 1) : 0}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>Strategic Items</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: complianceScore < 50 ? '#d63031' : complianceScore < 80 ? '#e17055' : '#00b894' }}>
                            {complianceScore}%
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>Compliance Score</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: exportBlocked ? '#d63031' : '#00b894' }}>
                            {exportBlocked ? '🚫' : '✅'}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>Export Status</div>
                    </div>
                </div>

                {exportBlocked && (
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#ff7675',
                        color: 'white',
                        borderRadius: '4px',
                        marginBottom: '1rem'
                    }}>
                        <strong>🚫 EXPORT BLOCKED</strong>
                        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Export cannot proceed until all required permits are uploaded and validated.
                            <br />
                            Missing permits: {missingPermits.join(', ')}
                        </div>
                    </div>
                )}
            </div>

            {/* Required Permits Section */}
            {permitStatus?.required_permits && permitStatus.required_permits.length > 0 && (
                <div style={{
                    border: '2px solid #74b9ff',
                    borderRadius: '8px',
                    backgroundColor: '#e8f4f8',
                    marginBottom: '2rem'
                }}>
                    <div style={{ 
                        padding: '1.5rem', 
                        borderBottom: '1px solid #74b9ff',
                        backgroundColor: '#74b9ff',
                        color: 'white'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                            📋 Required Permits ({permitStatus.required_permits.length})
                        </h3>
                        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.9 }}>
                            All permits must be uploaded and validated before export
                        </div>
                    </div>
                    
                    <div style={{ padding: '1.5rem' }}>
                        {permitStatus.required_permits.map((permit, index) => (
                            <PermitUploadCard
                                key={permit.permit_type}
                                permit={permit}
                                permitInfo={getPermitTypeInfo(permit.permit_type)}
                                onUpload={(file) => handlePermitUpload(permit.permit_type, file)}
                                isUploading={uploadingPermit === permit.permit_type}
                                style={{ marginBottom: index < permitStatus.required_permits.length - 1 ? '1rem' : 0 }}
                            />
                        ))}
                    </div>
                </div>
            )}


            {/* Insurance Document Section */}
            {checkInsuranceRequired() && (
                <div style={{
                    padding: '1.5rem',
                    border: '2px solid #74b9ff',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9ff',
                    marginTop: '1rem'
                }}>
                    <h4 style={{ 
                        margin: '0 0 1rem 0',
                        color: '#2d3436',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🛡️ Insurance Document Required
                    </h4>
                    
                    <p style={{ 
                        margin: '0 0 1rem 0', 
                        color: '#636e72',
                        fontSize: '0.9rem'
                    }}>
                        High-value shipments require insurance documentation for export compliance.
                    </p>
                    
                    {insuranceInfo ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            backgroundColor: '#e8f5e8',
                            borderRadius: '4px',
                            border: '1px solid #00b894'
                        }}>
                            <span style={{ color: '#00b894', fontWeight: 'bold' }}>
                                ✅ Insurance Document Uploaded
                            </span>
                            <span style={{ color: '#636e72', fontSize: '0.8rem' }}>
                                {insuranceInfo.filename} • {insuranceInfo.insurance_value ? `$${insuranceInfo.insurance_value} ${insuranceInfo.currency}` : 'No value specified'}
                            </span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="file"
                                id="insurance-upload"
                                style={{ display: 'none' }}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        uploadInsurance(file);
                                    }
                                }}
                            />
                            <button
                                onClick={() => document.getElementById('insurance-upload').click()}
                                disabled={uploadingInsurance}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: uploadingInsurance ? '#ccc' : '#74b9ff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: uploadingInsurance ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {uploadingInsurance ? (
                                    <>⏳ Uploading...</>
                                ) : (
                                    <>📄 Upload Insurance Document</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Permit Upload Card Component
const PermitUploadCard = ({ permit, permitInfo, onUpload, isUploading, style }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragOver(false);
        const file = event.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = () => {
        if (selectedFile && onUpload) {
            onUpload(selectedFile);
            setSelectedFile(null);
        }
    };

    const isValid = permit.status === 'valid';
    const isMissing = permit.status === 'missing';

    return (
        <div style={{
            border: `2px solid ${isValid ? '#00b894' : isMissing ? '#e17055' : '#74b9ff'}`,
            borderRadius: '8px',
            backgroundColor: 'white',
            ...style
        }}>
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: isValid ? '#e8f5f0' : isMissing ? '#ffeaa7' : '#f8f9fa'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#2d3436' }}>
                            {isValid ? '✅' : isMissing ? '🚫' : '⏳'} {permitInfo.name}
                        </h5>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                            Authority: {permitInfo.authority} | Deadline: {permitInfo.deadline}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            {permitInfo.description}
                        </div>
                    </div>
                    <div style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: permitInfo.urgency === 'HIGH' ? '#d63031' : 
                                        permitInfo.urgency === 'MEDIUM' ? '#e17055' : '#74b9ff',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                    }}>
                        {permitInfo.urgency}
                    </div>
                </div>
            </div>

            {isMissing && (
                <div style={{ padding: '1rem' }}>
                    <div
                        style={{
                            border: `2px dashed ${dragOver ? '#74b9ff' : '#ddd'}`,
                            borderRadius: '8px',
                            padding: '2rem',
                            textAlign: 'center',
                            backgroundColor: dragOver ? '#f0f8ff' : '#f9f9f9',
                            cursor: 'pointer',
                            marginBottom: '1rem'
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById(`file-${permit.permit_type}`).click()}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                        <div style={{ marginBottom: '1rem', color: '#666' }}>
                            {selectedFile ? selectedFile.name : 'Drop permit file here or click to browse'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#999' }}>
                            Supported formats: PDF, DOC, DOCX, Excel, JPG, PNG (Max 50MB)
                        </div>
                        <input
                            id={`file-${permit.permit_type}`}
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {selectedFile && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ flex: 1, fontSize: '0.9rem', color: '#666' }}>
                                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                            </div>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: isUploading ? '#ddd' : '#74b9ff',
                                    color: isUploading ? '#666' : 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isUploading ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {isUploading ? '⏳ Uploading...' : '📤 Upload Permit'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isValid && permit.uploaded_at && (
                <div style={{ padding: '1rem', backgroundColor: '#e8f5f0', fontSize: '0.9rem', color: '#00b894' }}>
                    ✅ Permit uploaded and validated on {new Date(permit.uploaded_at).toLocaleDateString()}
                </div>
            )}
        </div>
    );
};

export default StrategicItemPermitInterface;
