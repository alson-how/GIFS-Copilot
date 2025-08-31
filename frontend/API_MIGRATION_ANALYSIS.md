# API Migration Analysis - Phase 1

## Current State Analysis

This document provides a comprehensive analysis of all existing API calls in the frontend codebase and their migration path to v2 endpoints.

## 📊 API Endpoint Inventory

### Core API Patterns

#### 1. **Shipments API**
| Current v1 Endpoint | Usage Location | Purpose | v2 Equivalent |
|---|---|---|---|
| `GET /api/shipments` | `ShipmentOrdersList.jsx:50` | List all shipments with query params | `GET /api/v2/shipments` |
| `GET /api/shipments/{id}` | `ShipmentDetails.jsx:33` | Get shipment details | `GET /api/v2/shipments/{id}` |
| `POST /api/shipments/basics` | `services/api.js:23`, `StepBasics.jsx` (via service) | Create/update shipment basics | `POST /api/v2/shipments` |

#### 2. **Upload/Files API**
| Current v1 Endpoint | Usage Location | Purpose | v2 Equivalent |
|---|---|---|---|
| `POST /api/uploads` | `services/api.js:32`, multiple components | Generic file upload | *Needs v2 route* |
| `GET /api/uploads?shipment_id={id}` | `services/api.js:39` | List files for shipment | *Needs v2 route* |
| `POST /api/uploads/permit/{shipmentId}/{permitType}` | `StrategicItemPermitInterface.jsx:213` | Upload permit document | *Needs v2 route* |
| `POST /api/uploads/insurance/{shipmentId}` | `StrategicItemPermitInterface.jsx:249` | Upload insurance document | *Needs v2 route* |

#### 3. **Strategic Items/Compliance API**
| Current v1 Endpoint | Usage Location | Purpose | v2 Equivalent |
|---|---|---|---|
| `GET /api/strategic/status/{shipmentId}` | `StrategicItemPermitInterface.jsx:89` | Get strategic status | `GET /api/v2/compliance/{shipmentId}` |
| `GET /api/strategic/export/validation/{shipmentId}` | `StrategicItemPermitInterface.jsx:97` | Export validation | *Needs mapping* |
| `POST /api/strategic/detect` | `StepBasics.jsx:200` | Detect strategic items | *Needs v2 route* |
| `POST /api/strategic/permits/upload` | `StrategicItemPermitInterface.jsx:135` | Upload permits | *Needs v2 route* |

#### 4. **Compliance/Screening API**
| Current v1 Endpoint | Usage Location | Purpose | v2 Equivalent |
|---|---|---|---|
| `GET /api/comprehensive-screening/{shipmentId}` | `StepScreening.jsx:19` | Get screening results | `POST /api/v2/compliance/screening` |
| `POST /api/comprehensive-screening/initialize` | `ComprehensiveScreening.jsx:22` | Initialize screening | `POST /api/v2/compliance/screening` |
| `POST /api/comprehensive-screening/save` | `ComprehensiveScreening.jsx:58` | Save screening data | *Needs v2 route* |
| `POST /api/comprehensive-screening/screen-lists` | `ComprehensiveScreening.jsx:84` | Screen against lists | `POST /api/v2/compliance/screening` |

#### 5. **Documents API**
| Current v1 Endpoint | Usage Location | Purpose | v2 Equivalent |
|---|---|---|---|
| `POST /api/documents/upload` | `DocumentOCR.jsx:34`, `StepBasics.jsx:544` | Upload documents | *Needs v2 route* |
| `POST /api/documents/upload-supporting` | `StepBasics.jsx:461` | Upload supporting docs | *Needs v2 route* |

#### 6. **Document Generation API**
| Current v1 Endpoint | Usage Location | Purpose | v2 Equivalent |
|---|---|---|---|
| `GET /api/document-generation/{shipmentId}` | `StepDocs.jsx:32` | Get generated docs | *Needs v2 route* |
| `POST /api/document-generation/generate` | `StepBasics.jsx:121` | Generate documents | *Needs v2 route* |

#### 7. **Invoice Detection API**
| Current v1 Endpoint | Usage Location | Purpose | v2 Equivalent |
|---|---|---|---|
| `GET /api/invoice-detection/{id}` | `ShipmentDetails.jsx:34` | Get invoice data | *Needs v2 route* |
| `POST /api/invoice-detection/upload` | `AIQuery.jsx:67` | Upload invoice for OCR | *Needs v2 route* |

#### 8. **Miscellaneous APIs**
| Current v1 Endpoint | Usage Location | Purpose | v2 Equivalent |
|---|---|---|---|
| `POST /api/policy/process-files` | `AIQuery.jsx:251` | Process policy files | *Needs v2 route* |
| `POST /api/k2/render` | `FormK2.jsx:165` | Render K2 form | *Needs v2 route* |
| `GET /api/permit-documents` | `PermitDocument.jsx:21` | Get permit docs | *Needs v2 route* |
| `POST /api/batch-processing/initialize` | `BatchUploadInterface.jsx:151` | Initialize batch | *Needs v2 route* |

## 🔍 Component-API Mapping

### Heavy API Users (Priority for Migration)

#### 1. **StepBasics.jsx** (7 API calls)
- `POST /api/document-generation/generate`
- `POST /api/strategic/detect`
- `POST /api/documents/upload-supporting`
- `POST /api/documents/upload`
- `POST /api/shipments/basics` (via service)

#### 2. **StrategicItemPermitInterface.jsx** (4 API calls)
- `GET /api/strategic/status/{shipmentId}`
- `GET /api/strategic/export/validation/{shipmentId}`
- `POST /api/strategic/permits/upload`
- `POST /api/uploads/permit/{shipmentId}/{permitType}`
- `POST /api/uploads/insurance/{shipmentId}`

#### 3. **ComprehensiveScreening.jsx** (4 API calls)
- `POST /api/comprehensive-screening/initialize`
- `POST /api/comprehensive-screening/save`
- `POST /api/comprehensive-screening/screen-lists`
- `POST /api/comprehensive-screening/upload-document`

### Medium API Users

#### 4. **AIQuery.jsx** (2 API calls)
- `POST /api/invoice-detection/upload`
- `POST /api/policy/process-files`

#### 5. **ShipmentDetails.jsx** (2 API calls)
- `GET /api/shipments/{id}`
- `GET /api/invoice-detection/{id}`

### Light API Users (1 API call each)
- `StepScreening.jsx`
- `StepDocs.jsx`
- `DocumentOCR.jsx`
- `ShipmentOrdersList.jsx`
- `PermitDocument.jsx`
- `FormK2.jsx`
- `BatchUploadInterface.jsx`

## 🚨 Critical Issues Identified

### 1. **Missing v2 Endpoints**
Many v1 endpoints don't have direct v2 equivalents:
- File upload endpoints
- Document generation
- Invoice detection
- Strategic items detection
- Policy processing
- K2 form rendering
- Batch processing

### 2. **API Service Layer Incomplete**
Current `services/api.js` only covers 3 functions:
- `postBasics()` 
- `uploadFiles()`
- `listFiles()`

Most components make direct fetch calls instead of using the service layer.

### 3. **No Error Handling Standardization**
Each component implements its own error handling patterns.

### 4. **Mixed API Patterns**
- Some use service functions
- Some use direct fetch calls
- Inconsistent base URL handling
- No request/response interceptors

## 📋 Migration Strategy

### Phase 1A: Extend Backend v2 Routes
1. Add missing endpoints to backend v2 routes
2. Ensure feature parity with v1 endpoints
3. Test all new v2 endpoints

### Phase 1B: Create Comprehensive API Service
1. Create new `services/apiV2.js` with all endpoints
2. Implement consistent error handling
3. Add request/response interceptors
4. Include TypeScript types

### Phase 1C: Component Migration
1. Start with light users (1 API call each)
2. Progress to medium users (2-3 API calls)
3. Finish with heavy users (4+ API calls)
4. Update imports to use new service

### Phase 1D: Cleanup
1. Remove old API service functions
2. Remove direct fetch calls
3. Remove v1 endpoint references
4. Update documentation

## 🎯 Next Steps

1. **Immediate**: Create v2 endpoint mapping file
2. **Backend**: Extend v2 routes with missing endpoints
3. **Frontend**: Build comprehensive API service layer
4. **Testing**: Create API integration tests
5. **Migration**: Start with low-risk components

---

*This analysis forms the foundation for systematic API migration to v2 architecture while maintaining application stability.*