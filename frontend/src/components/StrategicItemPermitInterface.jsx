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

const StrategicItemPermitInterface = ({ 
    shipmentId, 
    onComplianceChange,
    strategicItemsDetected = false,
    exportBlocked = false,
    complianceScore = 100,
    missingPermits = [],
    strategicDetectionComplete = false,
    strategicDetectionLoading = false
}) => {
    const [strategicStatus, setStrategicStatus] = useState(null);
    const [permitStatus, setPermitStatus] = useState(null);
    const [exportValidation, setExportValidation] = useState(null);
    const [loading, setLoading] = useState(false); // Changed to false since we get data from props
    const [uploadingPermit, setUploadingPermit] = useState(null);
    const [error, setError] = useState(null);
    const [hasLoadedFromAPI, setHasLoadedFromAPI] = useState(false);

    // Reset hasLoadedFromAPI when shipmentId changes
    useEffect(() => {
        setHasLoadedFromAPI(false);
    }, [shipmentId]);

    useEffect(() => {
        // Update local state when props change
        if (strategicDetectionComplete) {
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
        } else if (shipmentId && !hasLoadedFromAPI && !loading) {
            // Only load from API if detection hasn't completed yet and we haven't already loaded
            console.log('🔍 Loading strategic status from API for shipment:', shipmentId);
            setHasLoadedFromAPI(true);
            loadStrategicStatus();
        }
    }, [shipmentId, strategicItemsDetected, exportBlocked, complianceScore, missingPermits, strategicDetectionComplete, hasLoadedFromAPI, loading]);

    const loadStrategicStatus = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get strategic items status
            const statusResponse = await fetch(`/api/strategic/status/${shipmentId}`);
            const statusData = await statusResponse.json();

            if (statusData.success) {
                setStrategicStatus(statusData.data.strategic_status);
                setPermitStatus(statusData.data.permit_status);
                
                // Get export validation
                const validationResponse = await fetch(`/api/strategic/export/validation/${shipmentId}`);
                const validationData = await validationResponse.json();
                
                if (validationData.success) {
                    setExportValidation(validationData.data);
                    
                    // Notify parent component of compliance status
                    if (onComplianceChange) {
                        onComplianceChange({
                            hasStrategicItems: statusData.data.strategic_status.has_strategic_items,
                            exportBlocked: !validationData.data.export_permitted,
                            complianceScore: validationData.data.compliance_score,
                            missingPermits: validationData.data.missing_permits
                        });
                    }
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
                            {strategicItemsDetected ? '4' : '0'}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>Strategic Items</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e17055' }}>
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

            {/* Compliance Status Summary */}
            {exportValidation && (
                <div style={{
                    padding: '1.5rem',
                    border: `2px solid ${exportValidation.export_permitted ? '#00b894' : '#e17055'}`,
                    borderRadius: '8px',
                    backgroundColor: exportValidation.export_permitted ? '#e8f5f0' : '#ffeaa7'
                }}>
                    <h4 style={{ 
                        margin: '0 0 1rem 0',
                        color: exportValidation.export_permitted ? '#00b894' : '#d63031'
                    }}>
                        📊 Compliance Status: {exportValidation.compliance_score}%
                    </h4>
                    
                    {exportValidation.missing_permits.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                            <strong style={{ color: '#d63031' }}>Missing Permits:</strong>
                            <ul style={{ margin: '0.5rem 0 0 1rem', color: '#d63031' }}>
                                {exportValidation.missing_permits.map((permit, index) => (
                                    <li key={index}>{permit}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        <strong>Next Steps:</strong>
                        {exportValidation.export_permitted ? (
                            <span style={{ color: '#00b894' }}> All permits validated - export approved</span>
                        ) : (
                            <span style={{ color: '#d63031' }}> Upload and validate all required permits above</span>
                        )}
                    </div>
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
