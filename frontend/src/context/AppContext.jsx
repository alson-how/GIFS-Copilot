import React, { createContext, useContext, useReducer } from 'react';

// Action types
const APP_ACTIONS = {
  SET_THEME: 'SET_THEME',
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_NOTIFICATION: 'SET_NOTIFICATION',
  CLEAR_NOTIFICATION: 'CLEAR_NOTIFICATION',
  SET_GLOBAL_LOADING: 'SET_GLOBAL_LOADING',
  SET_SIDEBAR_OPEN: 'SET_SIDEBAR_OPEN',
  SET_USER: 'SET_USER',
  LOGOUT: 'LOGOUT'
};

// Initial state
const initialState = {
  theme: 'dark',
  language: 'en',
  user: null,
  notifications: [],
  ui: {
    sidebarOpen: false,
    globalLoading: false
  }
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case APP_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload
      };
      
    case APP_ACTIONS.SET_LANGUAGE:
      return {
        ...state,
        language: action.payload
      };
      
    case APP_ACTIONS.SET_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, {
          id: Date.now(),
          ...action.payload
        }]
      };
      
    case APP_ACTIONS.CLEAR_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
      
    case APP_ACTIONS.SET_GLOBAL_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          globalLoading: action.payload
        }
      };
      
    case APP_ACTIONS.SET_SIDEBAR_OPEN:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: action.payload
        }
      };
      
    case APP_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload
      };
      
    case APP_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null
      };
      
    default:
      return state;
  }
};

// Create contexts
const AppStateContext = createContext();
const AppDispatchContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

// Custom hooks for using context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
};

// Combined hook for convenience
export const useAppContext = () => {
  return {
    state: useAppState(),
    dispatch: useAppDispatch()
  };
};

// Action creators
export const appActions = {
  setTheme: (theme) => ({
    type: APP_ACTIONS.SET_THEME,
    payload: theme
  }),
  
  setLanguage: (language) => ({
    type: APP_ACTIONS.SET_LANGUAGE,
    payload: language
  }),
  
  setNotification: (notification) => ({
    type: APP_ACTIONS.SET_NOTIFICATION,
    payload: notification
  }),
  
  clearNotification: (id) => ({
    type: APP_ACTIONS.CLEAR_NOTIFICATION,
    payload: id
  }),
  
  setGlobalLoading: (loading) => ({
    type: APP_ACTIONS.SET_GLOBAL_LOADING,
    payload: loading
  }),
  
  setSidebarOpen: (open) => ({
    type: APP_ACTIONS.SET_SIDEBAR_OPEN,
    payload: open
  }),
  
  setUser: (user) => ({
    type: APP_ACTIONS.SET_USER,
    payload: user
  }),
  
  logout: () => ({
    type: APP_ACTIONS.LOGOUT
  })
};

export { APP_ACTIONS };