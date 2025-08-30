import React, { useState, useRef, useEffect } from 'react';
import { getJSON } from '../services/api.js';

export default function AIQuery({ onOpenCanvas }) {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const sampleQueries = [
    "What is the Strategic Trade Act 2010?",
    "What are the export procedures in Malaysia?",
    "What customs forms are required for export?",
    "What are the requirements for AI chip exports?"
  ];

  const canvasQueries = [
    "I want to export this order to China",
    "I need to ship this to USA on March 15",
    "I want to send this to Singapore next week",
    "Export these items to Germany"
  ];

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  async function askAI() {
    if (!query.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query.trim(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : null,
      timestamp: new Date()
    };

    // Add user message to conversation
    setConversation(prev => [...prev, userMessage]);
    setLoading(true);
    setQuery(''); // Clear input immediately
    
    try {
        console.log(uploadedFiles.length);
        console.log(detectExportIntent(userMessage.content));
      // Check if user has files and wants to export/ship
      if (uploadedFiles.length > 0 && detectExportIntent(userMessage.content)) {
        // Use new Invoice Detection API
        let invoiceProcessingResult = null;
        try {
          console.log('🔍 Processing uploaded files with Invoice Detection API...');
          
          // Only process the first file for now (Commercial Invoice detection)
          const firstFile = uploadedFiles[0];
          const formData = new FormData();
          formData.append('document', firstFile.file);
          formData.append('intent', userMessage.content);
          
          // Call new Invoice Detection API
          const invoiceResponse = await fetch(`${import.meta.env.VITE_API || 'http://localhost:8080'}/api/invoice-detection/upload`, {
            method: 'POST',
            body: formData
          });
          
          if (invoiceResponse.ok) {
            invoiceProcessingResult = await invoiceResponse.json();
            console.log('✅ Invoice processing completed:', invoiceProcessingResult);
          } else {
            const errorData = await invoiceResponse.json();
            console.warn('⚠️ Invoice processing failed:', errorData);
            
            // If it's not a Commercial Invoice or wrong intent, show error to user
            if (errorData.error) {
              const botResponse = {
                id: Date.now() + 1,
                content: `❌ **${errorData.error}**\n\n${errorData.details?.reason || ''}\n\nPlease upload a valid Commercial Invoice and ensure your intent is to export/ship goods.`,
                isUser: false,
                timestamp: new Date()
              };
              setConversation(prev => [...prev, botResponse]);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('❌ Invoice processing error:', error);
          const botResponse = {
            id: Date.now() + 1,
            content: '❌ **Error processing document**\n\nThere was an error processing your document. Please try again with a valid Commercial Invoice.',
            isUser: false,
            timestamp: new Date()
          };
          setConversation(prev => [...prev, botResponse]);
          setLoading(false);
          return;
        }
        
        // Extract information from query
        const extractedDate = extractDateFromQuery(userMessage.content);
        const extractedDestination = extractDestination(userMessage.content);
        
        // Create canvas data with invoice processing results
        const canvasData = {
          extractedDate,
          extractedDestination,
          files: uploadedFiles,
          originalQuery: userMessage.content,
          invoiceData: invoiceProcessingResult, // Include invoice processing results
          shipmentId: invoiceProcessingResult?.data?.shipment_id, // Include shipment ID for tracking
          // Map OCR data to expected format for frontend
          ocrData: invoiceProcessingResult?.data?.extracted_fields ? {
            fieldSuggestions: invoiceProcessingResult.data.extracted_fields
          } : null
        };
        
        // Debug logging for OCR data structure
        if (invoiceProcessingResult?.data?.extracted_fields) {
          console.log('🔍 Invoice OCR extracted_fields:', invoiceProcessingResult.data.extracted_fields);
          console.log('🔍 Consignee name in extracted fields:', invoiceProcessingResult.data.extracted_fields.consignee_name);
          console.log('🔍 Mapped to canvasData.ocrData.fieldSuggestions:', canvasData.ocrData.fieldSuggestions);
        }

        // Create AI response with invoice processing summary
        let invoiceSummary = '';
        if (invoiceProcessingResult && invoiceProcessingResult.success) {
          if (invoiceProcessingResult.type === 'chatbot_response') {
            // RAG chatbot fallback response
            const docClass = invoiceProcessingResult.document_classification;
            invoiceSummary = `\n\n**🤖 AI Assistant Response**
📄 **Document Status**: ${docClass?.is_commercial_invoice ? 'Commercial Invoice' : 'Not a Commercial Invoice'} (${Math.round(docClass?.confidence * 100)}% confidence)
💬 **Response**: ${invoiceProcessingResult.message}

**AI Answer:**
${invoiceProcessingResult.chatbot_response}`;
          } else if (invoiceProcessingResult.type === 'general_response') {
            // General response for non-export intents
            invoiceSummary = `\n\n**🤖 General Inquiry Response**
💬 **Message**: ${invoiceProcessingResult.message}

**Suggestions:**
${invoiceProcessingResult.suggestions?.map(suggestion => `• ${suggestion}`).join('\n') || ''}`;
          } else {
            // Successful Commercial Invoice processing
            const data = invoiceProcessingResult.data;
            invoiceSummary = `\n\n**✅ Commercial Invoice Processed Successfully!**
📄 **Document**: Commercial Invoice (${data.classification?.confidence * 100}% confidence)
🆔 **Shipment ID**: ${data.shipment_id}
🌍 **Destination**: ${data.destination}
💰 **Value**: ${data.extracted_fields?.currency} ${data.extracted_fields?.commercial_value?.toLocaleString()}
🏢 **Consignee**: ${data.extracted_fields?.consignee_name}
📦 **Items**: ${data.product_items?.length || 0} product(s)

**Next Steps:**
${data.next_steps?.map(step => `• ${step}`).join('\n') || '• Review and proceed with shipment processing'}`;
          }
        } else if (invoiceProcessingResult && !invoiceProcessingResult.success) {
          // Error response
          invoiceSummary = `\n\n**❌ Processing Error**
**Error**: ${invoiceProcessingResult.error}
${invoiceProcessingResult.details ? `**Details**: ${typeof invoiceProcessingResult.details === 'string' ? invoiceProcessingResult.details : JSON.stringify(invoiceProcessingResult.details)}` : ''}`;
        }

        // Determine if this should open the workflow canvas (only for successful Commercial Invoice processing)
        const shouldOpenCanvas = invoiceProcessingResult?.success && 
                                 invoiceProcessingResult?.data && 
                                 !invoiceProcessingResult?.type; // type exists for chatbot responses, not for successful processing

        let aiMessage;
        
        if (shouldOpenCanvas) {
          // Successful Commercial Invoice processing - open workflow canvas
          aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: `🎯 **Export Request Detected!**

I see you want to export/ship items${extractedDestination ? ` to **${extractedDestination}**` : ''}${extractedDate ? ` on **${extractedDate}**` : ''}.${invoiceSummary}

I've opened the **Shipment Canvas** on the right where you can:
✅ Configure your shipment details
✅ Auto-filled information from your documents
✅ Review extracted data and make corrections
✅ Ensure compliance requirements

The canvas will guide you through the complete export process step by step.`,
            sources: [{
              title: 'Export Intent Detected',
              section: 'Workflow Automation',
              similarity_score: 1.0,
              preview: `Detected export intent with ${uploadedFiles.length} file(s) - Document processed successfully`
            }],
            timestamp: new Date(),
            isCanvasOpener: true,
            invoiceData: invoiceProcessingResult
          };
        } else {
          // RAG chatbot response or error - don't open workflow canvas
          aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: `🤖 **AI Assistant Response**

${invoiceProcessingResult?.message || 'I\'ve processed your query and provided information below.'}${invoiceSummary}

${invoiceProcessingResult?.chatbot_response ? `**Answer:**\n${invoiceProcessingResult.chatbot_response}` : ''}

${invoiceProcessingResult?.suggestions ? `**Suggestions:**\n${invoiceProcessingResult.suggestions.map(s => `• ${s}`).join('\n')}` : ''}`,
            sources: invoiceProcessingResult?.sources || [{
              title: 'AI Assistant',
              section: 'General Inquiry',
              similarity_score: 1.0,
              preview: `Processed query with ${uploadedFiles.length} file(s)`
            }],
            timestamp: new Date(),
            isCanvasOpener: false,
            invoiceData: invoiceProcessingResult
          };
        }

        setConversation(prev => [...prev, aiMessage]);
        
        // Only open canvas for successful Commercial Invoice processing
        if (shouldOpenCanvas && onOpenCanvas) {
          onOpenCanvas(canvasData);
        }
        
        // Clear uploaded files
        setUploadedFiles([]);
        setLoading(false);
        return;
      }
      
      let result;
      
      // Check if user wants to process files with specific prompt
      if (uploadedFiles.length > 0 && userMessage.content.toLowerCase().includes('process this order')) {
        // Send files to processing endpoint
        const formData = new FormData();
        formData.append('query', userMessage.content);
        uploadedFiles.forEach(fileData => {
          formData.append('files', fileData.file);
        });
        
        const response = await fetch(`${import.meta.env.VITE_API || 'http://localhost:8080'}/api/policy/process-files`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error(await response.text());
        result = await response.json();
      } else {
        // Regular RAG query
        result = await getJSON(`/api/policy/answer?q=${encodeURIComponent(userMessage.content)}`);
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: result.answer || 'No response received',
        sources: result.sources || [],
        processedData: result.processedData || null,
        timestamp: new Date()
      };

      setConversation(prev => [...prev, aiMessage]);
      
      // Clear uploaded files after processing
      if (uploadedFiles.length > 0) {
        setUploadedFiles([]);
      }
    } catch (e) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: '❌ Error: ' + e.message,
        sources: [],
        timestamp: new Date(),
        isError: true
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  };

  const clearChat = () => {
    setConversation([]);
    setQuery('');
    setUploadedFiles([]);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const fileData = files.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setUploadedFiles(prev => [...prev, ...fileData]);
    setShowUploadModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Detect export intent from query
  const detectExportIntent = (query) => {
    const exportKeywords = [
      'export', 'ship', 'send', 'deliver', 'transport',
      'I want to export', 'I need to ship', 'I want to send'
    ];
    
    const queryLower = query.toLowerCase();
    return exportKeywords.some(keyword => queryLower.includes(keyword));
  };

  // Extract date from query
  const extractDateFromQuery = (query) => {
    // Look for various date formats
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,           // MM/DD/YYYY or DD/MM/YYYY
      /(\d{4}-\d{1,2}-\d{1,2})/g,             // YYYY-MM-DD
      /(\d{1,2}-\d{1,2}-\d{4})/g,             // DD-MM-YYYY or MM-DD-YYYY
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/gi,
      /(\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/gi,
      /(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4})/gi
    ];

    for (const pattern of datePatterns) {
      const matches = query.match(pattern);
      if (matches && matches.length > 0) {
        try {
          const date = new Date(matches[0]);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }
    return null;
  };

  // Extract destination from query
  const extractDestination = (query) => {
    const countries = [
      'china', 'usa', 'united states', 'singapore', 'thailand', 'vietnam',
      'japan', 'korea', 'south korea', 'taiwan', 'philippines', 'indonesia',
      'india', 'australia', 'germany', 'uk', 'united kingdom', 'france'
    ];
    
    const queryLower = query.toLowerCase();
    for (const country of countries) {
      if (queryLower.includes(country)) {
        // Normalize country names
        if (country === 'usa' || country === 'united states') return 'United States';
        if (country === 'uk' || country === 'united kingdom') return 'United Kingdom';
        if (country === 'south korea') return 'South Korea';
        return country.charAt(0).toUpperCase() + country.slice(1);
      }
    }
    return null;
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <section className="card fade-in" style={{
      background: 'linear-gradient(135deg, var(--surface), rgba(127, 179, 211, 0.1))',
      border: '1px solid rgba(127, 179, 211, 0.3)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="card-header" style={{flexShrink: 0}}>
        <div className="card-icon">🤖</div>
        <h2 className="card-title">AI Compliance Assistant</h2>
        {conversation.length > 0 && (
          <button 
            className="btn btn-secondary"
            onClick={clearChat}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              marginLeft: 'auto'
            }}
          >
            🗑️ Clear Chat
          </button>
        )}
      </div>
      
      <div className="card-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 0
      }}>
        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(90, 140, 179, 0.05)'
          }}>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
              {uploadedFiles.map(file => (
                <div key={file.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--surface-light)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  gap: '0.5rem',
                  fontSize: '0.8rem'
                }}>
                  <span>📎</span>
                  <span style={{color: 'var(--text-primary)'}}>{file.name}</span>
                  <span style={{color: 'var(--text-muted)'}}>({formatFileSize(file.size)})</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--error)',
                      cursor: 'pointer',
                      padding: '0',
                      fontSize: '1rem',
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Chat Messages Area */}
        <div 
          ref={chatContainerRef}
          className="chat-container"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minHeight: '500px',
            maxHeight: 'calc(80vh - 200px)'
          }}
        >
          {conversation.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🤖</div>
              <h3 style={{color: 'var(--primary-light)', marginBottom: '0.5rem'}}>
                Welcome to AI Compliance Assistant
              </h3>
              <p style={{marginBottom: '2rem', maxWidth: '400px'}}>
                Ask questions about Malaysian logistics compliance, export procedures, and regulations
              </p>
              
              {/* Sample Queries */}
              <div>
                <p style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>
                  {uploadedFiles.length > 0 ? 'Try export phrases:' : 'Try asking:'}
                </p>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '500px'}}>
                  {(uploadedFiles.length > 0 ? canvasQueries : sampleQueries).map((sample, index) => (
                    <button
                      key={index}
                      className="btn btn-secondary"
                      onClick={() => setQuery(sample)}
                      style={{
                        fontSize: '0.9rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(90, 140, 179, 0.1)',
                        border: '1px solid rgba(90, 140, 179, 0.3)',
                        color: 'var(--primary-light)',
                        textAlign: 'left'
                      }}
                    >
                      💬 {sample}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Chat Messages
            conversation.map((message, index) => (
              <div key={message.id} style={{
                display: 'flex',
                flexDirection: message.type === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '1rem'
              }}>
                {/* Avatar */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: message.type === 'user' 
                    ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                    : message.isError 
                      ? 'linear-gradient(135deg, var(--error), #ff6b6b)'
                      : 'linear-gradient(135deg, var(--secondary), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  flexShrink: 0
                }}>
                  {message.type === 'user' ? '👤' : '🤖'}
                </div>

                {/* Message Bubble */}
                <div style={{
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    background: message.type === 'user' 
                      ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
                      : message.isError
                        ? 'rgba(244, 67, 54, 0.1)'
                        : 'var(--surface-light)',
                    color: message.type === 'user' ? 'white' : 'var(--text-primary)',
                    padding: '1rem',
                    borderRadius: message.type === 'user' 
                      ? '20px 20px 5px 20px'
                      : '20px 20px 20px 5px',
                    border: message.type === 'user' 
                      ? 'none' 
                      : message.isError
                        ? '1px solid rgba(244, 67, 54, 0.3)'
                        : '1px solid var(--border)',
                    boxShadow: message.type === 'user' 
                      ? '0 4px 15px rgba(90, 140, 179, 0.3)'
                      : '0 2px 10px rgba(0, 0, 0, 0.1)'
                  }}>
                    {/* User files display */}
                    {message.type === 'user' && message.files && message.files.length > 0 && (
                      <div style={{marginBottom: '0.5rem'}}>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.25rem'}}>
                          {message.files.map(file => (
                            <span key={file.id} style={{
                              background: 'rgba(255, 255, 255, 0.2)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              📎 {file.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      fontSize: '0.95rem'
                    }}>
                      {message.content}
                    </div>
                  </div>

                  {/* Processed Data Display */}
                  {message.type === 'ai' && message.processedData && (
                    <div style={{
                      background: 'rgba(76, 175, 80, 0.05)',
                      border: '1px solid rgba(76, 175, 80, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      fontSize: '0.85rem',
                      marginTop: '0.5rem'
                    }}>
                      <h5 style={{
                        color: 'var(--success)', 
                        marginBottom: '0.75rem',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        📊 Extracted Data Structure
                      </h5>
                      <pre style={{
                        background: 'var(--surface-light)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '1rem',
                        fontSize: '0.8rem',
                        overflow: 'auto',
                        color: 'var(--text-primary)',
                        margin: 0,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {JSON.stringify(message.processedData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Sources (only for AI messages) */}
                  {message.type === 'ai' && message.sources && message.sources.length > 0 && (
                    <div style={{
                      background: 'rgba(90, 140, 179, 0.05)',
                      border: '1px solid rgba(90, 140, 179, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem',
                      fontSize: '0.85rem'
                    }}>
                      <h5 style={{
                        color: 'var(--primary-light)', 
                        marginBottom: '0.75rem',
                        fontSize: '0.9rem'
                      }}>
                        📚 Sources ({message.sources.length})
                      </h5>
                      <div style={{display: 'grid', gap: '0.5rem'}}>
                        {message.sources.map((source, sourceIndex) => (
                          <div key={sourceIndex} style={{
                            background: 'rgba(90, 140, 179, 0.1)',
                            border: '1px solid rgba(90, 140, 179, 0.2)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            fontSize: '0.8rem'
                          }}>
                            <div className="flex-between mb-1">
                              <strong style={{color: 'var(--text-primary)', fontSize: '0.85rem'}}>
                                {source.title}
                              </strong>
                              {source.similarity_score && (
                                <span style={{
                                  color: 'var(--primary-light)',
                                  fontSize: '0.7rem',
                                  background: 'rgba(90, 140, 179, 0.2)',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '12px'
                                }}>
                                  {(parseFloat(source.similarity_score) * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                            {source.section && (
                              <div style={{color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem'}}>
                                Section: {source.section}
                              </div>
                            )}
                            {source.preview && (
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                fontStyle: 'italic'
                              }}>
                                "{source.preview}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    textAlign: message.type === 'user' ? 'right' : 'left',
                    marginTop: '0.25rem'
                  }}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--secondary), var(--accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>
                🤖
              </div>
              <div style={{
                background: 'var(--surface-light)',
                border: '1px solid var(--border)',
                borderRadius: '20px 20px 20px 5px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div className="loading"></div>
                <span style={{color: 'var(--text-secondary)'}}>AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Always at bottom */}
        <div style={{
          padding: '1.5rem',
          borderTop: '2px solid var(--border)',
          background: 'linear-gradient(135deg, var(--surface), var(--surface-light))',
          flexShrink: 0,
          minHeight: '120px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
            {/* Plus button for file upload */}
            <button
              className="btn btn-secondary"
              onClick={() => setShowUploadModal(true)}
              style={{
                padding: '0.75rem',
                minWidth: '50px',
                height: '50px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
              title="Upload Files"
            >
              +
            </button>
            
            <div style={{flex: 1}}>
              <textarea 
                className="form-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={uploadedFiles.length > 0 
                  ? "Try: 'I want to export this order to China' or 'I want to ship this to USA on March 15'" 
                  : "Ask about export procedures, strategic trade act, customs forms, etc..."
                }
                rows="3"
                style={{
                  resize: 'vertical',
                  minHeight: '70px',
                  maxHeight: '150px',
                  fontSize: '1rem',
                  lineHeight: '1.5',
                  padding: '1rem',
                  width: '100%'
                }}
                disabled={loading}
              />
            </div>
            <button 
              className="btn btn-primary" 
              onClick={askAI}
              disabled={loading || !query.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                height: 'fit-content',
                minWidth: '120px'
              }}
            >
              {loading ? (
                <>
                  <div className="loading"></div>
                  Thinking...
                </>
              ) : (
                <>🚀 Send</>
              )}
            </button>
          </div>
        </div>
        
        {/* File Upload Modal */}
        {showUploadModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h3 style={{color: 'var(--primary-light)', margin: 0}}>📎 Upload Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
              
              <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
                Upload files to analyze with AI. Supported formats: PDF, TXT, CSV, JSON, Images
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  background: 'var(--surface-light)',
                  cursor: 'pointer'
                }}
              />
              
              <div style={{marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                <p>💡 Try asking: "I want to export these items" or "I want to ship this order" after uploading customs documents</p>
                <p>🔍 Supported documents: Commercial Invoice, Bill of Lading, Packing List, Certificate of Origin, Insurance, etc.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
