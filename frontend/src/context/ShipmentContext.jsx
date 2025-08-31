import React, { createContext, useContext, useReducer } from 'react';

// Action types
const SHIPMENT_ACTIONS = {
  SET_SHIPMENT_DATA: 'SET_SHIPMENT_DATA',
  UPDATE_SHIPMENT_FIELD: 'UPDATE_SHIPMENT_FIELD',
  SET_PRODUCT_ITEMS: 'SET_PRODUCT_ITEMS',
  ADD_PRODUCT_ITEM: 'ADD_PRODUCT_ITEM',
  UPDATE_PRODUCT_ITEM: 'UPDATE_PRODUCT_ITEM',
  REMOVE_PRODUCT_ITEM: 'REMOVE_PRODUCT_ITEM',
  SET_COMPLIANCE_DATA: 'SET_COMPLIANCE_DATA',
  SET_LOADING_STATE: 'SET_LOADING_STATE',
  RESET_FORM: 'RESET_FORM'
};

// Initial state
const initialState = {
  // Shipment data
  shipment: {
    shipmentId: crypto?.randomUUID?.() || '',
    exportDate: '',
    mode: 'air',
    destination: 'China',
    endUser: '',
    currency: 'USD',
    incoterms: 'FOB',
    insuranceRequired: true,
    consigneeRegistration: '',
    shipmentPriority: 'Standard'
  },
  
  // Product items
  productItems: [{
    id: crypto?.randomUUID?.() || Date.now().toString(),
    semiconductorCategory: 'standard_ic_asics',
    technologyOrigin: 'malaysia',
    hsCode: '',
    quantity: '',
    unit: 'PCS',
    unitPrice: '',
    endUsePurpose: '',
    productDescription: '',
    commercialValue: '',
    isStrategic: false,
    isAIChip: false
  }],
  
  // Compliance data
  compliance: {
    strategicItemsDetected: false,
    strategicDetectionComplete: false,
    strategicDetectionLoading: false,
    exportBlocked: false,
    complianceScore: 100,
    missingPermits: [],
    complianceIssues: []
  },
  
  // UI state
  ui: {
    loading: false,
    error: null,
    status: '',
    currentStep: 0,
    isSubmitting: false
  }
};

// Reducer function
const shipmentReducer = (state, action) => {
  switch (action.type) {
    case SHIPMENT_ACTIONS.SET_SHIPMENT_DATA:
      return {
        ...state,
        shipment: { ...state.shipment, ...action.payload }
      };
      
    case SHIPMENT_ACTIONS.UPDATE_SHIPMENT_FIELD:
      return {
        ...state,
        shipment: {
          ...state.shipment,
          [action.payload.field]: action.payload.value
        }
      };
      
    case SHIPMENT_ACTIONS.SET_PRODUCT_ITEMS:
      return {
        ...state,
        productItems: action.payload
      };
      
    case SHIPMENT_ACTIONS.ADD_PRODUCT_ITEM:
      return {
        ...state,
        productItems: [...state.productItems, action.payload]
      };
      
    case SHIPMENT_ACTIONS.UPDATE_PRODUCT_ITEM:
      return {
        ...state,
        productItems: state.productItems.map(item =>
          item.id === action.payload.id
            ? { ...item, [action.payload.field]: action.payload.value }
            : item
        )
      };
      
    case SHIPMENT_ACTIONS.REMOVE_PRODUCT_ITEM:
      return {
        ...state,
        productItems: state.productItems.filter(item => item.id !== action.payload.id)
      };
      
    case SHIPMENT_ACTIONS.SET_COMPLIANCE_DATA:
      return {
        ...state,
        compliance: { ...state.compliance, ...action.payload }
      };
      
    case SHIPMENT_ACTIONS.SET_LOADING_STATE:
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };
      
    case SHIPMENT_ACTIONS.RESET_FORM:
      return {
        ...initialState,
        shipment: {
          ...initialState.shipment,
          shipmentId: crypto?.randomUUID?.() || ''
        }
      };
      
    default:
      return state;
  }
};

// Create contexts
const ShipmentStateContext = createContext();
const ShipmentDispatchContext = createContext();

// Provider component
export const ShipmentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(shipmentReducer, initialState);
  
  return (
    <ShipmentStateContext.Provider value={state}>
      <ShipmentDispatchContext.Provider value={dispatch}>
        {children}
      </ShipmentDispatchContext.Provider>
    </ShipmentStateContext.Provider>
  );
};

// Custom hooks for using context
export const useShipmentState = () => {
  const context = useContext(ShipmentStateContext);
  if (!context) {
    throw new Error('useShipmentState must be used within a ShipmentProvider');
  }
  return context;
};

export const useShipmentDispatch = () => {
  const context = useContext(ShipmentDispatchContext);
  if (!context) {
    throw new Error('useShipmentDispatch must be used within a ShipmentProvider');
  }
  return context;
};

// Combined hook for convenience
export const useShipmentContext = () => {
  return {
    state: useShipmentState(),
    dispatch: useShipmentDispatch()
  };
};

// Action creators
export const shipmentActions = {
  setShipmentData: (data) => ({
    type: SHIPMENT_ACTIONS.SET_SHIPMENT_DATA,
    payload: data
  }),
  
  updateShipmentField: (field, value) => ({
    type: SHIPMENT_ACTIONS.UPDATE_SHIPMENT_FIELD,
    payload: { field, value }
  }),
  
  setProductItems: (items) => ({
    type: SHIPMENT_ACTIONS.SET_PRODUCT_ITEMS,
    payload: items
  }),
  
  addProductItem: (item) => ({
    type: SHIPMENT_ACTIONS.ADD_PRODUCT_ITEM,
    payload: item
  }),
  
  updateProductItem: (id, field, value) => ({
    type: SHIPMENT_ACTIONS.UPDATE_PRODUCT_ITEM,
    payload: { id, field, value }
  }),
  
  removeProductItem: (id) => ({
    type: SHIPMENT_ACTIONS.REMOVE_PRODUCT_ITEM,
    payload: { id }
  }),
  
  setComplianceData: (data) => ({
    type: SHIPMENT_ACTIONS.SET_COMPLIANCE_DATA,
    payload: data
  }),
  
  setLoadingState: (state) => ({
    type: SHIPMENT_ACTIONS.SET_LOADING_STATE,
    payload: state
  }),
  
  resetForm: () => ({
    type: SHIPMENT_ACTIONS.RESET_FORM
  })
};

export { SHIPMENT_ACTIONS };