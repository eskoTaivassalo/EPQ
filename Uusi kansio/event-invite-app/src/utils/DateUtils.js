/**
 * Date utility functions for consistent date handling across the application
 */

/**
 * Format a date object or timestamp into a readable date string
 * @param {Date|number|string|Object} date - Date to format (Date object, timestamp, ISO string, or Firestore timestamp)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';
    
    // Handle Firestore Timestamp objects
    const dateObj = date && date.toDate ? date.toDate() : new Date(date);
    
    // Default options
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: options.includeTime !== false ? '2-digit' : undefined,
      minute: options.includeTime !== false ? '2-digit' : undefined,
    };
    
    try {
      return dateObj.toLocaleDateString(
        options.locale || undefined, 
        { ...defaultOptions, ...options }
      );
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };
  
  /**
   * Format a time from a date object
   * @param {Date|number|string|Object} date - Date containing the time to format
   * @returns {string} Formatted time string (e.g., "7:30 PM")
   */
  export const formatTime = (date) => {
    if (!date) return '';
    
    const dateObj = date && date.toDate ? date.toDate() : new Date(date);
    
    try {
      return dateObj.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      console.error('Error formatting time:', err);
      return 'Invalid time';
    }
  };
  
  /**
   * Get relative time string (e.g., "2 days ago" or "in 3 hours")
   * @param {Date|number|string|Object} date - Date to compare against now
   * @returns {string} Relative time string
   */
  export const getRelativeTimeString = (date) => {
    if (!date) return '';
    
    const dateObj = date && date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffMs = dateObj - now;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    const isInFuture = diffMs > 0;
    const absDay = Math.abs(diffDay);
    const absHour = Math.abs(diffHour);
    const absMin = Math.abs(diffMin);
    
    // Future
    if (isInFuture) {
      if (absDay > 30) return formatDate(dateObj);
      if (absDay > 1) return `in ${absDay} days`;
      if (absDay === 1) return 'tomorrow';
      if (absHour >= 1) return `in ${absHour} ${absHour === 1 ? 'hour' : 'hours'}`;
      if (absMin >= 1) return `in ${absMin} ${absMin === 1 ? 'minute' : 'minutes'}`;
      return 'just now';
    }
    
    // Past
    if (absDay > 30) return formatDate(dateObj);
    if (absDay > 1) return `${absDay} days ago`;
    if (absDay === 1) return 'yesterday';
    if (absHour >= 1) return `${absHour} ${absHour === 1 ? 'hour' : 'hours'} ago`;
    if (absMin >= 1) return `${absMin} ${absMin === 1 ? 'minute' : 'minutes'} ago`;
    return 'just now';
  };
  
  /**
   * Check if a date is in the future
   * @param {Date|number|string|Object} date - Date to check
   * @returns {boolean} True if the date is in the future
   */
  export const isDateInFuture = (date) => {
    if (!date) return false;
    
    const dateObj = date && date.toDate ? date.toDate() : new Date(date);
    return dateObj > new Date();
  };
  
  /**
   * Check if a date is in the past
   * @param {Date|number|string|Object} date - Date to check
   * @returns {boolean} True if the date is in the past
   */
  export const isDateInPast = (date) => {
    if (!date) return false;
    
    const dateObj = date && date.toDate ? date.toDate() : new Date(date);
    return dateObj < new Date();
  };
  
  /**
   * Format a date range (e.g., "Jan 1 - Jan 5, 2023" or "Jan 1, 2023 7:30 PM - 9:30 PM")
   * @param {Date|number|string|Object} startDate - Start date of the range
   * @param {Date|number|string|Object} endDate - End date of the range
   * @param {Object} options - Formatting options
   * @returns {string} Formatted date range
   */
  export const formatDateRange = (startDate, endDate, options = {}) => {
    if (!startDate || !endDate) return formatDate(startDate || endDate, options);
    
    const startObj = startDate && startDate.toDate ? startDate.toDate() : new Date(startDate);
    const endObj = endDate && endDate.toDate ? endDate.toDate() : new Date(endDate);
    
    // Same day - just show different times
    if (startObj.toDateString() === endObj.toDateString()) {
      return `${formatDate(startObj, { includeTime: true })} - ${formatTime(endObj)}`;
    }
    
    // Different days
    return `${formatDate(startObj, options)} - ${formatDate(endObj, options)}`;
  };
  
  /**
   * Get a human-readable duration string from milliseconds
   * @param {number} durationMs - Duration in milliseconds
   * @returns {string} Formatted duration string (e.g., "2h 30m" or "45m")
   */
  export const formatDuration = (durationMs) => {
    if (!durationMs || durationMs <= 0) return '';
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    
    if (minutes > 0) {
      return `${minutes}m`;
    }
    
    return 'Less than a minute';
  };
  
  /**
   * Convert a local date string to an ISO string for storage
   * @param {string} dateString - Local date string (e.g., from date input)
   * @returns {string} ISO date string
   */
  export const dateInputToISOString = (dateString) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch (err) {
      console.error('Error converting date:', err);
      return null;
    }
  };
  
  /**
   * Get the current date as an ISO string without time component
   * @returns {string} Today's date in ISO format
   */
  export const getTodayISOString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  
  /**
   * Format a date suitable for a datetime-local input element
   * @param {Date|number|string|Object} date - Date to format
   * @returns {string} Formatted date suitable for datetime-local input
   */
  export const formatForDateTimeInput = (date) => {
    if (!date) return '';
    
    try {
      const dateObj = date && date.toDate ? date.toDate() : new Date(date);
      
      // Format: YYYY-MM-DDThh:mm
      return `${dateObj.getFullYear()}-${
        String(dateObj.getMonth() + 1).padStart(2, '0')}-${
        String(dateObj.getDate()).padStart(2, '0')}T${
        String(dateObj.getHours()).padStart(2, '0')}:${
        String(dateObj.getMinutes()).padStart(2, '0')}`;
    } catch (err) {
      console.error('Error formatting date for input:', err);
      return '';
    }
  };