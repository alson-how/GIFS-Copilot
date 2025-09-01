/**
 * Status Timeline Component
 * Displays shipment status progression with visual timeline
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { StatusBadge } from '../../atoms/StatusBadge/StatusBadge';
import './StatusTimeline.scss';

const STATUS_CONFIG = {
  'DRAFT': { 
    label: 'Draft', 
    color: 'gray', 
    icon: '📝',
    description: 'Shipment being prepared'
  },
  'PENDING_QUOTE': { 
    label: 'Pending Quote', 
    color: 'orange', 
    icon: '💰',
    description: 'Awaiting quote generation'
  },
  'UNDER_REVIEW': { 
    label: 'Under Review', 
    color: 'blue', 
    icon: '👀',
    description: 'Admin reviewing shipment'
  },
  'QUOTED': { 
    label: 'Quoted', 
    color: 'purple', 
    icon: '📋',
    description: 'Quote provided to customer'
  },
  'CONFIRMED': { 
    label: 'Confirmed', 
    color: 'green', 
    icon: '✅',
    description: 'Customer accepted quote'
  },
  'PICKUP_SCHEDULED': { 
    label: 'Pickup Scheduled', 
    color: 'blue', 
    icon: '📅',
    description: 'Pickup appointment confirmed'
  },
  'PICKED_UP': { 
    label: 'Picked Up', 
    color: 'green', 
    icon: '📦',
    description: 'Goods collected from origin'
  },
  'AT_WAREHOUSE': { 
    label: 'At Warehouse', 
    color: 'blue', 
    icon: '🏢',
    description: 'Goods received at warehouse'
  },
  'CUSTOMS_EXPORT': { 
    label: 'Customs Export', 
    color: 'yellow', 
    icon: '🛃',
    description: 'Export customs processing'
  },
  'IN_TRANSIT': { 
    label: 'In Transit', 
    color: 'blue', 
    icon: '🚚',
    description: 'Goods in transit to destination'
  },
  'ARRIVED_DESTINATION': { 
    label: 'Arrived Destination', 
    color: 'green', 
    icon: '🎯',
    description: 'Arrived at destination country'
  },
  'CUSTOMS_IMPORT': { 
    label: 'Customs Import', 
    color: 'yellow', 
    icon: '🛂',
    description: 'Import customs processing'
  },
  'OUT_FOR_DELIVERY': { 
    label: 'Out for Delivery', 
    color: 'orange', 
    icon: '🚛',
    description: 'Out for final delivery'
  },
  'DELIVERED': { 
    label: 'Delivered', 
    color: 'green', 
    icon: '✨',
    description: 'Successfully delivered'
  },
  'CANCELLED': { 
    label: 'Cancelled', 
    color: 'red', 
    icon: '❌',
    description: 'Shipment cancelled'
  },
  'EXPIRED': { 
    label: 'Expired', 
    color: 'red', 
    icon: '⏰',
    description: 'Quote expired'
  }
};

const StatusTimeline = ({ 
  timeline = [], 
  currentStatus, 
  showTabView = true,
  interactive = false,
  onStatusClick,
  className = '' 
}) => {
  const statusOrder = useMemo(() => [
    'DRAFT', 'PENDING_QUOTE', 'UNDER_REVIEW', 'QUOTED', 
    'CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE',
    'CUSTOMS_EXPORT', 'IN_TRANSIT', 'ARRIVED_DESTINATION',
    'CUSTOMS_IMPORT', 'OUT_FOR_DELIVERY', 'DELIVERED'
  ], []);

  const processedTimeline = useMemo(() => {
    if (timeline && timeline.length > 0) {
      // Use provided timeline data
      return timeline.map(item => ({
        ...item,
        config: STATUS_CONFIG[item.status] || STATUS_CONFIG['DRAFT']
      }));
    }

    // Generate timeline from status order
    return statusOrder.map(status => {
      const config = STATUS_CONFIG[status];
      const isCompleted = statusOrder.indexOf(currentStatus) > statusOrder.indexOf(status);
      const isCurrent = currentStatus === status;
      
      return {
        status,
        completed: isCompleted,
        current: isCurrent,
        config,
        timestamp: isCurrent ? new Date().toISOString() : null,
        changedBy: null,
        notes: null
      };
    });
  }, [timeline, currentStatus, statusOrder]);

  const handleStatusClick = (status) => {
    if (interactive && onStatusClick) {
      onStatusClick(status);
    }
  };

  if (showTabView) {
    return (
      <div className={`status-timeline status-timeline--tabs ${className}`}>
        <div className="status-timeline__tabs">
          {processedTimeline.map((item, index) => {
            const isClickable = interactive && (item.completed || item.current);
            
            return (
              <div
                key={item.status}
                className={`status-timeline__tab ${
                  item.completed ? 'status-timeline__tab--completed' : ''
                } ${
                  item.current ? 'status-timeline__tab--current' : ''
                } ${
                  !item.completed && !item.current ? 'status-timeline__tab--pending' : ''
                } ${
                  isClickable ? 'status-timeline__tab--clickable' : ''
                }`}
                onClick={() => handleStatusClick(item.status)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                <div className="status-timeline__tab-content">
                  <div className="status-timeline__tab-icon">
                    {item.config.icon}
                  </div>
                  <div className="status-timeline__tab-label">
                    {item.config.label}
                  </div>
                  {item.completed && (
                    <div className="status-timeline__tab-badge">
                      <StatusBadge status="completed" size="small" />
                    </div>
                  )}
                  {item.current && (
                    <div className="status-timeline__tab-badge">
                      <StatusBadge status="in_progress" size="small" />
                    </div>
                  )}
                </div>
                
                {index < processedTimeline.length - 1 && (
                  <div className={`status-timeline__connector ${
                    item.completed ? 'status-timeline__connector--completed' : ''
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`status-timeline status-timeline--vertical ${className}`}>
      <div className="status-timeline__track">
        {processedTimeline.map((item, index) => (
          <div
            key={item.status}
            className={`status-timeline__item ${
              item.completed ? 'status-timeline__item--completed' : ''
            } ${
              item.current ? 'status-timeline__item--current' : ''
            } ${
              !item.completed && !item.current ? 'status-timeline__item--pending' : ''
            }`}
          >
            <div className="status-timeline__marker">
              <div className="status-timeline__marker-icon">
                {item.config.icon}
              </div>
            </div>
            
            <div className="status-timeline__content">
              <div className="status-timeline__header">
                <h4 className="status-timeline__title">
                  {item.config.label}
                </h4>
                <div className="status-timeline__badges">
                  {item.completed && <StatusBadge status="completed" size="small" />}
                  {item.current && <StatusBadge status="in_progress" size="small" />}
                  {!item.completed && !item.current && <StatusBadge status="pending" size="small" />}
                </div>
              </div>
              
              <p className="status-timeline__description">
                {item.config.description}
              </p>
              
              {item.timestamp && (
                <div className="status-timeline__meta">
                  <span className="status-timeline__timestamp">
                    {new Date(item.timestamp).toLocaleDateString()} at{' '}
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  {item.changedBy && (
                    <span className="status-timeline__user">
                      by {item.changedBy}
                    </span>
                  )}
                </div>
              )}
              
              {item.notes && (
                <div className="status-timeline__notes">
                  <strong>Notes:</strong> {item.notes}
                </div>
              )}
            </div>
            
            {index < processedTimeline.length - 1 && (
              <div className={`status-timeline__line ${
                item.completed ? 'status-timeline__line--completed' : ''
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

StatusTimeline.propTypes = {
  timeline: PropTypes.arrayOf(PropTypes.shape({
    status: PropTypes.string.isRequired,
    completed: PropTypes.bool,
    current: PropTypes.bool,
    timestamp: PropTypes.string,
    changedBy: PropTypes.string,
    notes: PropTypes.string
  })),
  currentStatus: PropTypes.string.isRequired,
  showTabView: PropTypes.bool,
  interactive: PropTypes.bool,
  onStatusClick: PropTypes.func,
  className: PropTypes.string
};

export default StatusTimeline;