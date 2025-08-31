/**
 * Accessibility utilities and helpers
 */

// Focus management utilities
export const focusManagement = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements: (container) => {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');
    
    return container.querySelectorAll(focusableSelectors);
  },
  
  /**
   * Trap focus within a container (useful for modals)
   */
  trapFocus: (container) => {
    const focusableElements = focusManagement.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    // Focus the first element initially
    firstElement?.focus();
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },
  
  /**
   * Store and restore focus (useful for modals and overlays)
   */
  createFocusRestore: () => {
    const previousFocus = document.activeElement;
    
    return {
      restore: () => {
        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
      }
    };
  }
};

// ARIA utilities
export const ariaUtils = {
  /**
   * Generate unique IDs for ARIA attributes
   */
  generateId: (prefix = 'aria') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Set up ARIA live region for announcements
   */
  createLiveRegion: (politeness = 'polite') => {
    const existing = document.getElementById('aria-live-region');
    if (existing) return existing;
    
    const liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('aria-live', politeness);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    
    document.body.appendChild(liveRegion);
    return liveRegion;
  },
  
  /**
   * Announce message to screen readers
   */
  announce: (message, politeness = 'polite') => {
    const liveRegion = ariaUtils.createLiveRegion(politeness);
    
    // Clear previous message
    liveRegion.textContent = '';
    
    // Use setTimeout to ensure screen readers pick up the change
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 100);
    
    // Clear message after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 5000);
  },
  
  /**
   * Set up proper ARIA attributes for form validation
   */
  setupFormValidation: (input, errorElement) => {
    const errorId = ariaUtils.generateId('error');
    
    if (errorElement) {
      errorElement.id = errorId;
      input.setAttribute('aria-describedby', errorId);
    }
    
    return {
      setValid: () => {
        input.setAttribute('aria-invalid', 'false');
        input.removeAttribute('aria-describedby');
      },
      setInvalid: (message) => {
        input.setAttribute('aria-invalid', 'true');
        if (errorElement) {
          errorElement.textContent = message;
          input.setAttribute('aria-describedby', errorId);
        }
      }
    };
  }
};

// Keyboard navigation utilities
export const keyboardUtils = {
  /**
   * Handle arrow key navigation for lists/menus
   */
  handleArrowNavigation: (items, currentIndex, direction) => {
    const total = items.length;
    if (total === 0) return 0;
    
    let nextIndex;
    
    switch (direction) {
      case 'up':
      case 'left':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : total - 1;
        break;
      case 'down':
      case 'right':
        nextIndex = currentIndex < total - 1 ? currentIndex + 1 : 0;
        break;
      case 'first':
        nextIndex = 0;
        break;
      case 'last':
        nextIndex = total - 1;
        break;
      default:
        nextIndex = currentIndex;
    }
    
    return nextIndex;
  },
  
  /**
   * Common keyboard event handlers
   */
  handlers: {
    escape: (callback) => (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        callback(e);
      }
    },
    
    enter: (callback) => (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        callback(e);
      }
    },
    
    space: (callback) => (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        callback(e);
      }
    },
    
    enterOrSpace: (callback) => (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        callback(e);
      }
    }
  }
};

// Color contrast utilities
export const contrastUtils = {
  /**
   * Calculate color contrast ratio
   */
  getContrastRatio: (color1, color2) => {
    const getLuminance = (color) => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      // Calculate relative luminance
      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },
  
  /**
   * Check if color combination meets WCAG guidelines
   */
  meetsWCAG: (color1, color2, level = 'AA') => {
    const ratio = contrastUtils.getContrastRatio(color1, color2);
    
    switch (level) {
      case 'AA':
        return ratio >= 4.5;
      case 'AAA':
        return ratio >= 7;
      case 'AA-large':
        return ratio >= 3;
      default:
        return false;
    }
  }
};

// Reduced motion utilities
export const motionUtils = {
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  /**
   * Conditionally apply animation based on motion preference
   */
  respectMotionPreference: (animation, fallback = 'none') => {
    return motionUtils.prefersReducedMotion() ? fallback : animation;
  }
};

// Form accessibility helpers
export const formA11y = {
  /**
   * Create accessible form field with proper labeling and error handling
   */
  createAccessibleField: (fieldConfig) => {
    const {
      id,
      label,
      type = 'text',
      required = false,
      helpText,
      errorMessage
    } = fieldConfig;
    
    const fieldId = id || ariaUtils.generateId('field');
    const helpId = helpText ? `${fieldId}-help` : null;
    const errorId = errorMessage ? `${fieldId}-error` : null;
    
    const describedBy = [helpId, errorId].filter(Boolean).join(' ');
    
    return {
      fieldId,
      helpId,
      errorId,
      fieldProps: {
        id: fieldId,
        'aria-required': required,
        'aria-invalid': !!errorMessage,
        'aria-describedby': describedBy || undefined
      },
      labelProps: {
        htmlFor: fieldId
      }
    };
  }
};