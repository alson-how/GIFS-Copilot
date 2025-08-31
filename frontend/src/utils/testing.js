/**
 * Testing utilities and helpers
 */

// Mock data generators
export const mockData = {
  /**
   * Generate mock product item
   */
  productItem: (overrides = {}) => ({
    id: `mock-${Date.now()}`,
    semiconductorCategory: 'standard_ic_asics',
    technologyOrigin: 'malaysia',
    hsCode: '8542310000',
    quantity: '100',
    unit: 'PCS',
    unitPrice: '1.50',
    endUsePurpose: 'Consumer electronics manufacturing',
    productDescription: 'Standard integrated circuit',
    commercialValue: '150.00',
    isStrategic: false,
    isAIChip: false,
    ...overrides
  }),
  
  /**
   * Generate mock shipment data
   */
  shipment: (overrides = {}) => ({
    shipmentId: `SHIP-${Date.now()}`,
    exportDate: '2024-03-15',
    mode: 'air',
    destination: 'China',
    endUser: 'Tech Manufacturing Co.',
    currency: 'USD',
    incoterms: 'FOB',
    insuranceRequired: true,
    consigneeRegistration: 'REG123456789',
    shipmentPriority: 'Standard',
    ...overrides
  }),
  
  /**
   * Generate mock user data
   */
  user: (overrides = {}) => ({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'operator',
    permissions: ['read', 'write'],
    company: {
      id: 'company-123',
      name: 'Test Company',
      registrationNumber: 'REG123',
      country: 'Malaysia'
    },
    preferences: {
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: false,
        sms: false
      }
    },
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  }),
  
  /**
   * Generate mock API response
   */
  apiResponse: (data, overrides = {}) => ({
    success: true,
    data,
    message: 'Operation completed successfully',
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req-${Date.now()}`
    },
    ...overrides
  })
};

// Test helpers for React components
export const testHelpers = {
  /**
   * Custom render function with providers
   */
  renderWithProviders: (ui, options = {}) => {
    // This would typically import from @testing-library/react
    // For now, it's a placeholder structure
    const {
      initialState = {},
      ...renderOptions
    } = options;
    
    // Mock implementation - in real testing, this would wrap with providers
    return {
      ...ui, // Placeholder - would use actual render function
      store: { getState: () => initialState }
    };
  },
  
  /**
   * Wait for element with timeout
   */
  waitForElement: async (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  },
  
  /**
   * Simulate user events
   */
  userEvents: {
    type: (element, text) => {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    },
    
    click: (element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    },
    
    keyDown: (element, key) => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    },
    
    focus: (element) => {
      element.focus();
      element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    },
    
    blur: (element) => {
      element.blur();
      element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    }
  },
  
  /**
   * Mock API responses
   */
  mockApi: {
    success: (data) => Promise.resolve(mockData.apiResponse(data)),
    
    error: (message = 'API Error', status = 400) => 
      Promise.reject(new Error(message)),
    
    delay: (response, ms = 1000) => 
      new Promise(resolve => setTimeout(() => resolve(response), ms))
  },
  
  /**
   * Accessibility testing helpers
   */
  a11y: {
    /**
     * Check if element is focusable
     */
    isFocusable: (element) => {
      const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');
      
      return element.matches(focusableSelectors);
    },
    
    /**
     * Check if element has proper ARIA attributes
     */
    hasProperAria: (element, requiredAttributes = []) => {
      return requiredAttributes.every(attr => element.hasAttribute(attr));
    },
    
    /**
     * Simulate screen reader navigation
     */
    simulateScreenReader: (container) => {
      const walkDOM = (node, callback) => {
        callback(node);
        node = node.firstChild;
        while (node) {
          walkDOM(node, callback);
          node = node.nextSibling;
        }
      };
      
      const content = [];
      walkDOM(container, (node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          content.push(node.textContent.trim());
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const ariaLabel = node.getAttribute('aria-label');
          const altText = node.getAttribute('alt');
          if (ariaLabel) content.push(ariaLabel);
          if (altText) content.push(altText);
        }
      });
      
      return content.join(' ');
    }
  }
};

// Performance testing utilities
export const performanceHelpers = {
  /**
   * Measure component render time
   */
  measureRenderTime: (componentName, renderFn) => {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    console.log(`${componentName} render time: ${end - start}ms`);
    return result;
  },
  
  /**
   * Check if component re-renders unnecessarily
   */
  checkUnnecessaryRenders: (component) => {
    let renderCount = 0;
    
    // Mock implementation - would integrate with React DevTools in real testing
    const observer = {
      onRender: () => {
        renderCount++;
      }
    };
    
    return {
      getRenderCount: () => renderCount,
      reset: () => { renderCount = 0; }
    };
  }
};

// Mock implementations for common dependencies
export const mocks = {
  fetch: {
    success: (data) => jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData.apiResponse(data))
      })
    ),
    
    error: (status = 400, message = 'API Error') => jest.fn(() => 
      Promise.resolve({
        ok: false,
        status,
        text: () => Promise.resolve(message)
      })
    )
  },
  
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  
  matchMedia: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  })
};