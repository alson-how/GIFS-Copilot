# Component Migration Guide - API v2

## 📋 Migration Process Overview

This guide provides step-by-step instructions for migrating components from v1 to v2 API endpoints.

## 🎯 Phase 1: Ready for Immediate Migration

These components can be migrated immediately as their v2 endpoints are ready:

### **Low-Risk Components (1 API call each)**

#### 1. **ShipmentOrdersList.jsx** 
**Current API**: `GET /api/shipments`
**New API**: `GET /api/v2/shipments`

**Migration Steps**:
```javascript
// BEFORE (Line 50)
const response = await fetch(`/api/shipments?${params}`);

// AFTER
import { apiService } from '../services/apiV2.js';

const response = await apiService.shipments.list(params);
```

#### 2. **ShipmentDetails.jsx** (Partial migration)
**Current API**: `GET /api/shipments/{id}`
**New API**: `GET /api/v2/shipments/{id}`

**Migration Steps**:
```javascript
// BEFORE (Line 33)
fetch(`/api/shipments/${id}`),

// AFTER
import { apiService } from '../services/apiV2.js';

apiService.shipments.getById(id),
```

**Note**: This component also uses `/api/invoice-detection/${id}` which needs to stay as legacy for now.

### **Medium-Risk Components (Partial migration possible)**

#### 3. **StepBasics.jsx** (1 out of 5 API calls)
**Ready for migration**: `POST /api/shipments/basics` → `POST /api/v2/shipments`

**Migration Steps**:
```javascript
// Update src/services/api.js
// BEFORE
export async function postBasics(data) {
  return postJSON('/api/shipments/basics', data);
}

// AFTER
import { apiService } from './apiV2.js';

export async function postBasics(data) {
  return apiService.shipments.create(data);
}
```

## 📝 Detailed Migration Instructions

### **Step 1: Import the New API Service**

Add this import to the top of your component:
```javascript
import { apiService } from '../services/apiV2.js';
// or for specific services:
import { shipmentsAPI, complianceAPI } from '../services/apiV2.js';
```

### **Step 2: Replace Direct Fetch Calls**

**Pattern 1: Simple GET requests**
```javascript
// BEFORE
const response = await fetch(`/api/shipments/${id}`);
if (!response.ok) throw new Error(await response.text());
const data = await response.json();

// AFTER  
const data = await apiService.shipments.getById(id);
```

**Pattern 2: POST requests with JSON body**
```javascript
// BEFORE
const response = await fetch('/api/shipments/basics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
if (!response.ok) throw new Error(await response.text());
const result = await response.json();

// AFTER
const result = await apiService.shipments.create(data);
```

**Pattern 3: Queries with parameters**
```javascript
// BEFORE
const params = new URLSearchParams({ page: 1, limit: 10 }).toString();
const response = await fetch(`/api/shipments?${params}`);

// AFTER
const result = await apiService.shipments.list({ page: 1, limit: 10 });
```

### **Step 3: Update Error Handling**

The new API service provides consistent error handling:

```javascript
// BEFORE
try {
  const response = await fetch('/api/shipments');
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data = await response.json();
} catch (error) {
  console.error('API Error:', error.message);
}

// AFTER
try {
  const data = await apiService.shipments.list();
} catch (error) {
  console.error('API Error:', error.message);
  
  // Enhanced error information available:
  if (error.isClientError) {
    console.log('Client error (4xx):', error.status);
  } else if (error.isServerError) {
    console.log('Server error (5xx):', error.status);
  } else if (error.isNetworkError) {
    console.log('Network error');
  }
}
```

### **Step 4: Test the Migration**

1. **Run the API test script**:
   ```bash
   node test-api-migration.js
   ```

2. **Test the component manually**:
   - Verify the component still works as expected
   - Check browser console for any API errors
   - Confirm data is displaying correctly

3. **Check error handling**:
   - Test with network disconnected
   - Test with invalid data
   - Verify error messages are user-friendly

## 📅 Migration Schedule

### **Week 1: Low-Risk Components**
- [x] Set up v2 API service layer
- [ ] Migrate `ShipmentOrdersList.jsx`
- [ ] Migrate `ShipmentDetails.jsx` (partial)
- [ ] Test and validate migrations

### **Week 2: Service Layer Updates**
- [ ] Update `src/services/api.js` to use v2 for ready endpoints
- [ ] Migrate `StepBasics.jsx` (partial - shipments only)
- [ ] Test existing components that use the service layer

### **Week 3: Backend v2 Implementation**
- [ ] Work with backend team to implement missing v2 endpoints
- [ ] Priority: File uploads, strategic detection, document generation

### **Week 4: Heavy Components Migration**
- [ ] Migrate remaining `StepBasics.jsx` API calls
- [ ] Migrate `StrategicItemPermitInterface.jsx`
- [ ] Migrate `ComprehensiveScreening.jsx`

## ⚠️ Migration Gotchas

### **1. Payload Structure Changes**
Some v2 endpoints may expect different payload structures:

```javascript
// v1 payload
const v1Data = {
  export_date: '2024-03-15',
  destination_country: 'China'
};

// v2 payload (camelCase, nested structure)
const v2Data = {
  exportDate: '2024-03-15',
  destination: 'China',
  shipment: {
    priority: 'Standard'
  }
};
```

### **2. Response Structure Changes**
v2 endpoints may return enhanced response structures:

```javascript
// v1 response
{
  shipments: [...],
  total: 100
}

// v2 response
{
  success: true,
  data: [...],
  meta: {
    pagination: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10
    }
  }
}
```

### **3. Error Response Format**
v2 provides standardized error responses:

```javascript
// v2 error response
{
  success: false,
  message: "Validation failed",
  errors: [
    {
      field: "exportDate",
      message: "Export date is required"
    }
  ]
}
```

## 🔍 Testing Checklist

For each migrated component:

- [ ] **Functionality**: Component works the same as before
- [ ] **Data Loading**: All data displays correctly
- [ ] **Error Handling**: Errors are handled gracefully
- [ ] **Loading States**: Loading indicators work properly
- [ ] **User Interactions**: All buttons/forms function correctly
- [ ] **Network Issues**: Component handles offline/timeout scenarios
- [ ] **Performance**: No noticeable performance degradation

## 📚 Reference Examples

### **Complete Migration Example: ShipmentOrdersList.jsx**

```javascript
// BEFORE
const fetchShipments = async () => {
  try {
    setLoading(true);
    const params = new URLSearchParams({ 
      page: currentPage, 
      limit: 10 
    }).toString();
    const response = await fetch(`/api/shipments?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch shipments');
    }
    
    const data = await response.json();
    setShipments(data.shipments || []);
    setTotal(data.total || 0);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

// AFTER
import { apiService } from '../services/apiV2.js';

const fetchShipments = async () => {
  try {
    setLoading(true);
    const result = await apiService.shipments.list({ 
      page: currentPage, 
      limit: 10 
    });
    
    // Handle v2 response structure
    const shipments = result.data || result.shipments || [];
    const total = result.meta?.pagination?.total || result.total || 0;
    
    setShipments(shipments);
    setTotal(total);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

## 🎆 Migration Success Criteria

**Component is successfully migrated when**:
1. ✅ All functionality works exactly as before
2. ✅ Uses v2 API endpoints where available
3. ✅ Has proper error handling with new API service
4. ✅ Passes all manual and automated tests
5. ✅ Performance is maintained or improved
6. ✅ Code is cleaner and more maintainable

---

*This guide will be updated as more components are migrated and patterns are established.*