# Deprecated Endpoints Analysis

## 🚨 Critical Deprecated Endpoints Requiring Immediate Backend Implementation

### **Priority 1: Essential Business Functions**

These endpoints are heavily used and critical for core application functionality:

#### 1. **File Upload System** (Used in 6+ components)
- `POST /api/uploads` → **NEEDS v2 implementation**
- `GET /api/uploads?shipment_id={id}` → **NEEDS v2 implementation**  
- `POST /api/uploads/permit/{shipmentId}/{permitType}` → **NEEDS v2 implementation**
- `POST /api/uploads/insurance/{shipmentId}` → **NEEDS v2 implementation**

**Impact**: File uploads are core functionality used across multiple components
**Required v2 Routes**: 
- `POST /api/v2/files/upload`
- `GET /api/v2/files?shipment_id={id}`
- `POST /api/v2/files/permits/{shipmentId}/{permitType}`
- `POST /api/v2/files/insurance/{shipmentId}`

#### 2. **Strategic Items Detection** (Used in 3 components)
- `POST /api/strategic/detect` → **NEEDS v2 implementation**
- `GET /api/strategic/status/{shipmentId}` → **CAN map to** `GET /api/v2/compliance/{shipmentId}`
- `GET /api/strategic/export/validation/{shipmentId}` → **NEEDS v2 implementation**
- `POST /api/strategic/permits/upload` → **NEEDS v2 implementation**

**Impact**: Strategic items compliance is mandatory for exports
**Required v2 Routes**:
- `POST /api/v2/compliance/strategic-detect`
- `POST /api/v2/compliance/export-validation`
- `POST /api/v2/compliance/permits-upload`

### **Priority 2: Document Management** (Used in 4+ components)

#### 3. **Document Generation**
- `GET /api/document-generation/{shipmentId}` → **NEEDS v2 implementation**
- `POST /api/document-generation/generate` → **NEEDS v2 implementation**

**Impact**: Document generation is essential for export documentation
**Required v2 Routes**:
- `GET /api/v2/documents/generated/{shipmentId}`
- `POST /api/v2/documents/generate`

#### 4. **Document Upload & OCR**
- `POST /api/documents/upload` → **CAN map to** `POST /api/v2/compliance/docs`
- `POST /api/documents/upload-supporting` → **CAN map to** `POST /api/v2/compliance/docs`

**Impact**: Document processing is core to compliance workflow
**Status**: ✅ **Can use existing v2 endpoint with parameter differences**

### **Priority 3: Advanced Processing** (Used in 2-3 components each)

#### 5. **Invoice Detection/OCR**
- `GET /api/invoice-detection/{id}` → **NEEDS v2 implementation**
- `POST /api/invoice-detection/upload` → **NEEDS v2 implementation**

**Impact**: OCR functionality for automated data extraction
**Required v2 Routes**:
- `GET /api/v2/ocr/invoice/{id}`
- `POST /api/v2/ocr/invoice/upload`

#### 6. **Comprehensive Screening** 
- `GET /api/comprehensive-screening/{shipmentId}` → **CAN map to** `POST /api/v2/compliance/sta-screening`
- `POST /api/comprehensive-screening/initialize` → **CAN map to** `POST /api/v2/compliance/screening`
- `POST /api/comprehensive-screening/save` → **NEEDS v2 implementation**
- `POST /api/comprehensive-screening/screen-lists` → **CAN map to** `POST /api/v2/compliance/screening`
- `POST /api/comprehensive-screening/upload-document` → **NEEDS v2 implementation**

**Impact**: Compliance screening is mandatory for export approval
**Status**: 🔶 **Partial v2 coverage - needs extension**
**Required v2 Extensions**:
- `POST /api/v2/compliance/screening/save`
- `POST /api/v2/compliance/screening/upload-document`

### **Priority 4: Specialized Features** (Used in 1-2 components each)

#### 7. **Policy Processing**
- `POST /api/policy/process-files` → **NEEDS v2 implementation**

**Impact**: AI-powered policy analysis
**Required v2 Routes**:
- `POST /api/v2/ai/policy/process`

#### 8. **Form K2 Rendering**
- `POST /api/k2/render` → **NEEDS v2 implementation**

**Impact**: Specialized form generation
**Required v2 Routes**:
- `POST /api/v2/forms/k2/render`

#### 9. **Permit Document Management**
- `GET /api/permit-documents` → **NEEDS v2 implementation**
- `POST /api/permit-documents/upload` → **NEEDS v2 implementation**

**Impact**: Permit documentation workflow
**Required v2 Routes**:
- `GET /api/v2/permits/documents`
- `POST /api/v2/permits/documents/upload`

#### 10. **Batch Processing**
- `POST /api/batch-processing/initialize` → **NEEDS v2 implementation**

**Impact**: Bulk operations for efficiency
**Required v2 Routes**:
- `POST /api/v2/batch/initialize`

## 🔄 Migration Strategy by Priority

### **Phase 1A: Ready for Immediate Migration** (✅ v2 endpoints exist)
1. `GET /api/shipments` → `GET /api/v2/shipments`
2. `GET /api/shipments/{id}` → `GET /api/v2/shipments/{id}`
3. `POST /api/shipments/basics` → `POST /api/v2/shipments`
4. `GET /api/strategic/status/{shipmentId}` → `GET /api/v2/compliance/{shipmentId}`

### **Phase 1B: Needs Backend v2 Implementation** (🔴 Critical)
1. **File Upload System** (4 endpoints) - **CRITICAL**
2. **Strategic Items Advanced** (3 endpoints) - **CRITICAL**
3. **Document Generation** (2 endpoints) - **HIGH**
4. **OCR/Invoice Detection** (2 endpoints) - **HIGH**

### **Phase 1C: Needs Backend v2 Extension** (🔶 Partial coverage)
1. **Comprehensive Screening** - Extend existing v2 compliance routes
2. **Document Processing** - Use existing v2 routes with payload adjustments

### **Phase 1D: Specialized Features** (🔵 Lower priority)
1. **Policy Processing**
2. **Form K2**
3. **Permit Documents**
4. **Batch Processing**

## 📝 Backend Implementation Requirements

To complete the v2 migration, the backend needs these additional routes:

```javascript
// Required v2 route additions

// File Upload System
app.use('/api/v2/files', fileUploadRouter);

// Strategic Items Advanced
app.use('/api/v2/compliance/strategic', strategicItemsRouter);

// Document Generation
app.use('/api/v2/documents', documentGenerationRouter);

// OCR/Invoice Processing
app.use('/api/v2/ocr', ocrProcessingRouter);

// AI/Policy Processing
app.use('/api/v2/ai', aiProcessingRouter);

// Forms
app.use('/api/v2/forms', formsRouter);

// Permits
app.use('/api/v2/permits', permitsRouter);

// Batch Operations
app.use('/api/v2/batch', batchRouter);
```

## ⚡ Immediate Action Items

1. **Backend Team**: Implement Priority 1 & 2 v2 endpoints (8 total endpoints)
2. **Frontend Team**: Begin Phase 1A migration (4 ready endpoints)
3. **Testing Team**: Create v2 API integration tests
4. **DevOps Team**: Update API documentation for v2 endpoints

---

**Total Deprecated Endpoints**: 24
**Ready for Migration**: 4 ✅
**Need Backend Implementation**: 16 🔴
**Need Backend Extension**: 4 🔶

*Priority should be given to implementing the critical business function endpoints (file uploads and strategic items) before proceeding with frontend migration.*