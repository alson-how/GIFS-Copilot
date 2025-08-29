import React, { useState } from 'react';

/**
 * Sidebar Navigation Component
 * Provides navigation between different workflow modes and features
 */
export default function Sidebar({ currentView, onViewChange, isCollapsed, onToggleCollapse }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const navigationItems = [
    {
      id: 'enhanced-workflow',
      title: 'Enhanced Workflow',
      icon: '🚀',
      description: 'Batch processing with OCR',
      badge: 'New',
      badgeColor: '#4caf50'
    },
    {
      id: 'traditional-workflow',
      title: 'Traditional Workflow',
      icon: '📋',
      description: 'Step-by-step manual entry',
      badge: null
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '📊',
      description: 'Overview and analytics',
      badge: null
    },
    {
      id: 'shipments',
      title: 'Shipments',
      icon: '📦',
      description: 'Manage all shipments',
      badge: null
    },
    {
      id: 'documents',
      title: 'Documents',
      icon: '📄',
      description: 'Document library',
      badge: null
    },
    {
      id: 'compliance',
      title: 'Compliance',
      icon: '🛡️',
      description: 'Compliance tools',
      badge: null
    }
  ];

  const utilityItems = [
    {
      id: 'settings',
      title: 'Settings',
      icon: '⚙️',
      description: 'App configuration'
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: '❓',
      description: 'Documentation and support'
    }
  ];

  const handleItemClick = (itemId) => {
    onViewChange(itemId);
    
    // Auto-expand if collapsed when item is clicked
    if (isCollapsed) {
      onToggleCollapse();
    }
  };

  const renderNavItem = (item, isUtility = false) => (
    <div
      key={item.id}
      className={`nav-item ${currentView === item.id ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      onClick={() => handleItemClick(item.id)}
      onMouseEnter={() => setHoveredItem(item.id)}
      onMouseLeave={() => setHoveredItem(null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
        margin: '0.25rem 0',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        background: currentView === item.id 
          ? 'linear-gradient(135deg, rgba(90, 140, 179, 0.15), rgba(90, 140, 179, 0.05))'
          : hoveredItem === item.id 
            ? 'rgba(90, 140, 179, 0.08)'
            : 'transparent',
        border: currentView === item.id 
          ? '1px solid rgba(90, 140, 179, 0.3)'
          : '1px solid transparent',
        justifyContent: isCollapsed ? 'center' : 'flex-start'
      }}
    >
      {/* Icon */}
      <div style={{
        fontSize: '1.2rem',
        minWidth: '24px',
        textAlign: 'center',
        marginRight: isCollapsed ? 0 : '0.75rem'
      }}>
        {item.icon}
      </div>
      
      {/* Text content - hidden when collapsed */}
      {!isCollapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: currentView === item.id ? '600' : '500',
            fontSize: '0.9rem',
            color: currentView === item.id ? 'var(--primary)' : 'var(--text)',
            marginBottom: '0.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {item.title}
            {item.badge && (
              <span style={{
                background: item.badgeColor || '#ff9800',
                color: 'white',
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '10px',
                fontWeight: 'bold'
              }}>
                {item.badge}
              </span>
            )}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            opacity: currentView === item.id ? 1 : 0.8
          }}>
            {item.description}
          </div>
        </div>
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && hoveredItem === item.id && (
        <div style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: '0.5rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.1rem' }}>{item.title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.description}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="sidebar" style={{
      width: isCollapsed ? '60px' : '280px',
      height: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: isCollapsed ? '1rem 0.5rem' : '1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between'
      }}>
        {!isCollapsed && (
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.1rem', 
              color: 'var(--primary)',
              fontWeight: '700'
            }}>
              GIFS Copilot
            </h2>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)' 
            }}>
              Export Compliance Suite
            </p>
          </div>
        )}
        
        <button
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '4px',
            fontSize: '1rem',
            transition: 'color 0.2s ease'
          }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation Items */}
      <div style={{
        flex: 1,
        padding: isCollapsed ? '1rem 0.5rem' : '1rem',
        overflowY: 'auto'
      }}>
        {/* Main Navigation */}
        <div style={{ marginBottom: '2rem' }}>
          {!isCollapsed && (
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.75rem',
              paddingLeft: '0.25rem'
            }}>
              Workflows
            </div>
          )}
          {navigationItems.map(item => renderNavItem(item))}
        </div>

        {/* Separator */}
        {!isCollapsed && (
          <div style={{
            height: '1px',
            background: 'var(--border)',
            margin: '1rem 0'
          }} />
        )}

        {/* Utility Items */}
        <div>
          {!isCollapsed && (
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.75rem',
              paddingLeft: '0.25rem'
            }}>
              Tools
            </div>
          )}
          {utilityItems.map(item => renderNavItem(item, true))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: isCollapsed ? '0.5rem' : '1rem',
        borderTop: '1px solid var(--border)',
        textAlign: 'center'
      }}>
        {!isCollapsed && (
          <div style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            lineHeight: '1.4'
          }}>
            <div>Version 2.0</div>
            <div>© 2024 GIFS Logistics</div>
          </div>
        )}
        {isCollapsed && (
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            v2.0
          </div>
        )}
      </div>
    </div>
  );
}
