/**
 * Apple Calendar-style Shipment Calendar
 * Replicates Apple Calendar's clean aesthetic and functionality
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AdminShipmentDetails from './AdminShipmentDetails';
import { authenticatedApiRequest } from '../../config/api.js';
import './AdminShipmentCalendar.css';

// Status color system (Apple Calendar style with light backgrounds and colored borders)
const STATUS_COLORS = {
  CREATED: { bg: '#F3F4F6', border: '#6B7280', icon: '📋' },
  PENDING_QUOTE: { bg: '#EBF8FF', border: '#3182CE', icon: '💰' },
  UNDER_REVIEW: { bg: '#F3E8FF', border: '#9333EA', icon: '🔍' },
  QUOTED: { bg: '#F3E8FF', border: '#9333EA', icon: '📊' },
  CONFIRMED: { bg: '#D1FAE5', border: '#10B981', icon: '✅' },
  PICKUP_SCHEDULED: { bg: '#FED7AA', border: '#F97316', icon: '🚚' },
  PICKED_UP: { bg: '#E0E7FF', border: '#6366F1', icon: '📦' },
  AT_WAREHOUSE: { bg: '#CFFAFE', border: '#06B6D4', icon: '🏢' },
  CUSTOMS_EXPORT: { bg: '#FEF3C7', border: '#F59E0B', icon: '🛃' },
  IN_TRANSIT: { bg: '#CFFAFE', border: '#06B6D4', icon: '✈️' },
  ARRIVED_DESTINATION: { bg: '#FEF3C7', border: '#F59E0B', icon: '🌍' },
  CUSTOMS_IMPORT: { bg: '#FEF3C7', border: '#F59E0B', icon: '🛃' },
  OUT_FOR_DELIVERY: { bg: '#ECFCCB', border: '#84CC16', icon: '🚛' },
  DELIVERED: { bg: '#D1FAE5', border: '#059669', icon: '🎉' },
  DELAYED: { bg: '#FEE2E2', border: '#EF4444', icon: '⚠️' },
  CANCELLED: { bg: '#F9FAFB', border: '#1F2937', icon: '❌' },
  EXPIRED: { bg: '#F9FAFB', border: '#1F2937', icon: '⏰' }
};

// Priority indicators
const PRIORITY_COLORS = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Standard: '#6B7280',
  Low: '#10B981'
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ShipmentEventCard = React.memo(({ shipment, onClick }) => {
  const statusStyle = STATUS_COLORS[shipment.status] || STATUS_COLORS.CREATED;
  const priorityColor = PRIORITY_COLORS[shipment.priority] || PRIORITY_COLORS.Standard;

  return (
    <div
      className="calendar-event-card"
      onClick={() => onClick(shipment)}
      style={{
        backgroundColor: statusStyle.bg,
        borderLeft: `3px solid ${statusStyle.border}`
      }}
    >
      {/* Status icon */}
      <div className="status-icon">
        {statusStyle.icon || '📦'}
      </div>
      
      {/* Content */}
      <div className="event-content">
        <div className="event-card-title">
          {shipment.endUser}
        </div>
        <div className="event-card-status">
          {shipment.status}
        </div>
        <div className="event-card-subtitle">
          {shipment.destination} • {shipment.currency}{shipment.value?.toLocaleString()}
        </div>
      </div>

      {/* Priority indicator dot */}
      <div
        className="priority-dot"
        style={{ backgroundColor: priorityColor }}
      />

      {/* Hover overlay */}
      <div className="hover-overlay" />
    </div>
  );
});

const CalendarDay = React.memo(({ date, shipments, isToday, isWeekend, onShipmentClick }) => {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 5;
  const hasMore = shipments.length > maxVisible;
  const visibleShipments = showAll ? shipments : shipments.slice(0, maxVisible);

  return (
    <div className={`calendar-day ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}>
      {/* Day number */}
      <div className="day-number">
        {date.getDate()}
      </div>

      {/* Shipments container */}
      <div className="shipments-container">
        <div className={`shipments-list ${!showAll && hasMore ? 'limited' : ''}`}>
          {visibleShipments.map((shipment) => (
            <ShipmentEventCard
              key={shipment.id}
              shipment={shipment}
              onClick={onShipmentClick}
            />
          ))}
        </div>

        {/* Show more indicator */}
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="show-more-button"
          >
            +{shipments.length - maxVisible} more
          </button>
        )}

        {hasMore && showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="show-more-button"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
});

const AdminShipmentCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showCanvas, setShowCanvas] = useState(false);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (days.length < 42) { // 6 weeks * 7 days
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      console.log('🔍 Fetching calendar data for:', { month, year });
      
      const response = await authenticatedApiRequest(`admin/shipments/calendar?month=${month}&year=${year}`, {
        method: 'GET'
      }, 'admin');
      
      console.log('🔍 Calendar API raw response:', response);
      
      if (!response.ok) {
        console.error('❌ API call failed with status:', response.status);
        setCalendarData(null);
        return;
      }
      
      const result = await response.json();
      console.log('🔍 Calendar API parsed response:', result);
      console.log('🔍 Calendar data structure:', result.data);
      console.log('🔍 shipmentsByDate keys:', Object.keys(result.data?.shipmentsByDate || {}));
      console.log('🔍 Result success:', result.success);
      console.log('🔍 Result error:', result.error);
      
      if (result.success && result.data) {
        setCalendarData(result.data);
      } else {
        console.error('❌ API call failed or returned no data:', result);
        setCalendarData(null);
      }
    } catch (error) {
      console.error('❌ Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Shipment handlers
  const handleShipmentClick = useCallback((shipment) => {
    setSelectedShipment(shipment);
    setShowCanvas(true);
  }, []);

  const handleCanvasClose = useCallback(() => {
    setShowCanvas(false);
    setTimeout(() => setSelectedShipment(null), 300); // Wait for animation
  }, []);

  // Get shipments for a specific date
  const getShipmentsForDate = (date) => {
    console.log('🔍 getShipmentsForDate called for date:', date);
    console.log('🔍 calendarData:', calendarData);
    console.log('🔍 calendarData?.shipmentsByDate:', calendarData?.shipmentsByDate);
    
    if (!calendarData?.shipmentsByDate) {
      console.log('🔍 No shipmentsByDate found, returning empty array');
      return [];
    }
    
    const dateKey = date.toISOString().split('T')[0];
    console.log('🔍 Looking for dateKey:', dateKey);
    
    const shipments = calendarData.shipmentsByDate[dateKey] || [];
    console.log('🔍 Found shipments for date:', dateKey, shipments);
    
    return shipments;
  };

  const today = new Date();
  const isToday = (date) => {
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="calendar-container">
      {/* Navigation Header - Apple Calendar Style */}
      <div className="calendar-header">
        <div className="header-left">
          {/* Month navigation */}
          <div className="month-navigation">
            <button
              onClick={goToPreviousMonth}
              className="nav-arrow"
            >
              <ChevronLeftIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
            </button>
            <button
              onClick={goToNextMonth}
              className="nav-arrow"
            >
              <ChevronRightIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
            </button>
          </div>

          {/* Current month/year */}
          <h1 className="apple-calendar-title">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
        </div>

        {/* Right controls */}
        <div className="header-right">
          <button
            onClick={goToToday}
            className="today-button"
          >
            Today
          </button>
          
          <button className="apple-button">
            <MagnifyingGlassIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
          </button>
          
          <button className="apple-button">
            <PlusIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
          </button>

          <div className="view-selector">
            <span>Month</span>
            <ChevronRightIcon style={{ width: '16px', height: '16px', color: '#6b7280' }} className="chevron" />
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day headers */}
        <div className="day-headers">
          {DAY_NAMES.map((day) => (
            <div key={day} className="day-header">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-text">Loading calendar...</div>
          </div>
        ) : (
          <div className="calendar-days">
            {calendarDays.map((date, index) => (
              <CalendarDay
                key={index}
                date={date}
                shipments={getShipmentsForDate(date)}
                isToday={isToday(date)}
                isWeekend={isWeekend(date)}
                onShipmentClick={handleShipmentClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Canvas Side Panel */}
      <div className={`
        canvas-panel fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50
        ${showCanvas ? 'open' : 'closed'}
      `}>
        {selectedShipment && (
          <div className="h-full flex flex-col">
            {/* Canvas header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Shipment Details</h2>
              <button
                onClick={handleCanvasClose}
                className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Canvas content - Load AdminShipmentDetails */}
            <div className="flex-1 overflow-auto">
              <AdminShipmentDetails 
                shipmentId={selectedShipment.id}
                onClose={handleCanvasClose}
                isCanvas={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Overlay when canvas is open */}
      {showCanvas && (
        <div 
          className="canvas-overlay fixed inset-0 z-40"
          onClick={handleCanvasClose}
        />
      )}
    </div>
  );
};

export default AdminShipmentCalendar;