import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiMigration.js';
import FormK2 from './FormK2.jsx';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function StepDocs({ shipmentId, onSaved, isCanvas }){
  const [hsCode, setHsCode] = useState('85423110');
  const [hsValidated, setHsValidated] = useState(false);
  const [pco, setPco] = useState('');
  const [k2, setK2] = useState(false);
  const [permits, setPermits] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showK2Form, setShowK2Form] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  // Fetch generated documents
  const fetchGeneratedDocuments = async () => {
    if (!shipmentId) return;
    
    setDocsLoading(true);
    try {
              const result = await apiService.getDocumentStatus(shipmentId);
      
      if (result.success && result.data && result.data.documents) {
        const docs = [];
        const docTypes = [
          { key: 'packingList', name: 'Packing List', icon: '📦', downloadKey: 'packing_list' },
          { key: 'bookingConfirmation', name: 'Booking Confirmation', icon: '🚢', downloadKey: 'booking_confirmation' },
          { key: 'customsDeclaration', name: 'Customs Declaration', icon: '🏛️', downloadKey: 'customs_declaration' },
          { key: 'billOfLading', name: 'Bill of Lading', icon: '📋', downloadKey: 'bill_of_lading' }
        ];
        
        docTypes.forEach(docType => {
          if (result.data.documents[docType.key]) {
            docs.push({
              name: docType.name,
              icon: docType.icon,
              path: result.data.documents[docType.key],
                              url: `/api/document-generation/download/${shipmentId}/${docType.downloadKey}`
            });
          }
        });
        
        console.log('📄 Found generated documents:', docs);
        setGeneratedDocs(docs);
      }
    } catch (error) {
      console.error('Error fetching generated documents:', error);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchGeneratedDocuments();
  }, [shipmentId]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  async function submit(){
    setLoading(true);
    setStatus('');
    try{
      const res = await apiService.compliance.docs({
        shipment_id: shipmentId,
        hs_code: hsCode,
        hs_validated: hsValidated,
        pco_number: pco || null,
        k2_ready: k2,
        permit_refs: permits ? permits.split(',').map(s=>s.trim()) : []
      });
      setStatus('✅ Documentation and classification status saved successfully');
      
      // Call onSaved callback if provided (for canvas mode)
      if (onSaved) {
        setTimeout(() => onSaved(), 1500); // Brief delay to show success message
      }
    }catch(e){
      setStatus('❌ Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusClass = () => {
    if (!status) return '';
    if (status.includes('Error')) return 'status status-error show';
    return 'status status-success show';
  };

  const getCompletionStatus = () => {
    const checklist = [
      { label: 'HS Code Entered', completed: hsCode.length >= 8 },
      { label: 'HS Code Validated', completed: hsValidated },
      { label: 'K2 Form Ready', completed: k2 },
      { label: 'Permits Referenced', completed: permits.length > 0 }
    ];
    
    const completedCount = checklist.filter(item => item.completed).length;
    return { checklist, completedCount, total: checklist.length };
  };

  const completion = getCompletionStatus();

  return (
    <section className="card fade-in">
      <div className="card-header">
        <div className="step-indicator">
          <div className="step-number">4</div>
          <div className="step-title">Documentation & Classification</div>
        </div>
        <div className="card-icon">📋</div>
      </div>
      
      <div className="card-content">
        <p className="text-secondary mb-3">
          Finalize customs documentation and export classification
        </p>

        <div className="mb-4" style={{
          background: 'rgba(90, 140, 179, 0.1)', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div className="flex-between mb-2">
            <span className="form-label">Completion Status</span>
            <span style={{color: 'var(--primary)'}}>{completion.completedCount}/{completion.total}</span>
          </div>
          <div className="checklist">
            {completion.checklist.map((item, index) => (
              <div key={index} className="flex gap-2" style={{marginBottom: '0.5rem'}}>
                <span style={{color: item.completed ? 'var(--success)' : 'var(--text-muted)'}}>
                  {item.completed ? '✅' : '⏳'}
                </span>
                <span style={{color: item.completed ? 'var(--text-primary)' : 'var(--text-muted)'}}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">HS Classification Code</label>
            <input 
              className="form-input"
              value={hsCode} 
              onChange={e=>setHsCode(e.target.value)}
              placeholder="Enter 8-digit HS code"
              pattern="[0-9]{8}"
            />
          </div>
          
          <div className="checkbox-field">
            <input 
              type="checkbox" 
              className="checkbox"
              checked={hsValidated} 
              onChange={e=>setHsValidated(e.target.checked)}
              id="hs-validated"
            />
            <label htmlFor="hs-validated">HS Code Validated by Expert</label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">PCO Number (Optional)</label>
            <input 
              className="form-input"
              value={pco} 
              onChange={e=>setPco(e.target.value)}
              placeholder="Pre-shipment Control Order number"
            />
          </div>
          
          <div className="checkbox-field">
            <input 
              type="checkbox" 
              className="checkbox"
              checked={k2} 
              onChange={e=>setK2(e.target.checked)}
              id="k2-ready"
            />
            <label htmlFor="k2-ready">K2 Customs Form Prepared</label>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Export Permit References</label>
          <input 
            className="form-input"
            value={permits} 
            onChange={e=>setPermits(e.target.value)}
            placeholder="Enter permit numbers (comma-separated): STA-XXXX, US-BIS-YYYY"
          />
          <small style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>
            Include all relevant permit and license numbers
          </small>
        </div>

        {/* Generated Documents Section */}
        <div className="mt-4" style={{
          background: 'rgba(34, 197, 94, 0.05)', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
          <div className="flex-between mb-3">
            <div>
              <h4 style={{color: 'var(--success)', margin: 0, fontSize: '1rem'}}>
                📄 Generated Shipping Documents
              </h4>
              <p style={{color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.5rem 0 0 0'}}>
                Auto-generated documents from your commercial invoice
              </p>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={fetchGeneratedDocuments}
              disabled={docsLoading}
              style={{minWidth: '120px'}}
            >
              {docsLoading ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
          </div>
          
          {generatedDocs.length > 0 ? (
            <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem'}}>
              {generatedDocs.map((doc, index) => (
                <div 
                  key={index} 
                  className="card-mini" 
                  style={{
                    padding: '1rem',
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedDoc(doc)}
                  onMouseEnter={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.target.style.borderColor = 'var(--border)'}
                >
                  <div className="flex gap-3 align-center">
                    <span style={{fontSize: '1.5rem'}}>{doc.icon}</span>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: '500', color: 'var(--text-primary)'}}>{doc.name}</div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Click to preview</div>
                    </div>
                    <span style={{color: 'var(--success)', fontSize: '0.8rem'}}>✅</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--text-muted)',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: '8px'
            }}>
              {docsLoading ? (
                <div>🔄 Loading documents...</div>
              ) : (
                <div>
                  <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📄</div>
                  <div>No generated documents found</div>
                  <div style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                    Documents will appear here after uploading a commercial invoice in Step 1
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PDF Viewer Modal */}
        {selectedDoc && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}
            onClick={() => setSelectedDoc(null)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '12px',
                width: '90%',
                height: '90%',
                maxWidth: '1200px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{margin: 0, color: 'var(--text-primary)'}}>
                    {selectedDoc.icon} {selectedDoc.name}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={selectedDoc.url} 
                    download 
                    className="btn btn-secondary"
                    style={{textDecoration: 'none'}}
                  >
                    📥 Download
                  </a>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setSelectedDoc(null)}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
              <div style={{flex: 1, overflow: 'auto', padding: '1rem', background: '#f5f5f5'}}>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <Document
                    file={selectedDoc.url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div style={{padding: '2rem', textAlign: 'center'}}>
                        <div>🔄 Loading PDF...</div>
                      </div>
                    }
                    error={
                      <div style={{padding: '2rem', textAlign: 'center', color: 'red'}}>
                        <div>❌ Failed to load PDF</div>
                        <div style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                          Please try downloading the document instead
                        </div>
                      </div>
                    }
                  >
                    <Page 
                      pageNumber={pageNumber} 
                      width={Math.min(800, window.innerWidth * 0.7)}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                  
                  {numPages && numPages > 1 && (
                    <div style={{
                      marginTop: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      background: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}>
                      <button 
                        onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                        disabled={pageNumber <= 1}
                        className="btn btn-secondary"
                        style={{minWidth: 'auto', padding: '0.25rem 0.5rem'}}
                      >
                        ◀
                      </button>
                      <span style={{fontSize: '0.9rem'}}>
                        Page {pageNumber} of {numPages}
                      </span>
                      <button 
                        onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                        disabled={pageNumber >= numPages}
                        className="btn btn-secondary"
                        style={{minWidth: 'auto', padding: '0.25rem 0.5rem'}}
                      >
                        ▶
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* K2 Form Generation Section */}
        <div className="mt-4" style={{
          background: 'rgba(90, 140, 179, 0.05)', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div className="flex-between mb-3">
            <div>
              <h4 style={{color: 'var(--primary)', margin: 0, fontSize: '1rem'}}>
                📋 K2 Customs Export Declaration Form
              </h4>
              <p style={{color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.5rem 0 0 0'}}>
                Generate the official Malaysian Customs K2 form for export declaration
              </p>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowK2Form(!showK2Form)}
              style={{minWidth: '120px'}}
            >
              {showK2Form ? '🔼 Hide Form' : '📝 Generate K2'}
            </button>
          </div>
          
          {showK2Form && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <FormK2 />
            </div>
          )}
        </div>

        <div className="flex-between mt-4">
          <button 
            className="btn btn-primary" 
            onClick={submit}
            disabled={loading}
            style={{flex: 1}}
          >
            {loading && <div className="loading"></div>}
            {loading ? 'Saving...' : '📄 Finalize Documentation'}
          </button>
        </div>

        {status && (
          <div className={getStatusClass()}>
            {status}
          </div>
        )}
        
        <div className="mt-3" style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
          <p>📋 Required forms: K2 (Export Declaration), PCO (if applicable), Export Permits</p>
        </div>
      </div>
    </section>
  );
}
