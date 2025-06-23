/**
 * Single Responsibility Time Calculator
 * Unified time calculation component for all timezone operations
 * 
 * @author Time Converter Extension
 * @version 1.0.0
 * @license MIT
 */

'use strict';

/**
 * Centralized time calculation service
 * Provides consistent time calculations across all components
 */
class TimeCalculator {
  /**
   * Get current time for a specific timezone
   * @param {string} ianaTimezone - IANA timezone identifier
   * @param {string} format - Time format ('HH:mm' or 'HH:mm:ss')
   * @returns {string} Formatted time string
   */
  static getCurrentTime(ianaTimezone, format = 'HH:mm') {
    try {
      const now = new Date();

      // Primary method: Use date-fns-tz if available
      if (typeof dateFnsTz !== 'undefined' && dateFnsTz.formatInTimeZone) {
        return dateFnsTz.formatInTimeZone(now, ianaTimezone, format);
      }

      // Fallback: Use Intl API
      const hour12 = false;
      const options = {
        timeZone: ianaTimezone,
        hour12: hour12,
        hour: '2-digit',
        minute: '2-digit'
      };

      if (format.includes('ss')) {
        options.second = '2-digit';
      }

      return now.toLocaleTimeString('en-US', options);
    } catch (error) {
      console.warn(`Failed to get time for ${ianaTimezone}:`, error);
      return '--:--';
    }
  }

  /**
   * Get timezone offset string
   * @param {string} ianaTimezone - IANA timezone identifier
   * @returns {string} Offset string like '+05:30' or '-08:00'
   */
  static getTimezoneOffset(ianaTimezone) {
    try {
      const now = new Date();

      // Method 1: Try using Intl.DateTimeFormat with longOffset
      try {
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: ianaTimezone,
          timeZoneName: 'longOffset'
        });
        const parts = formatter.formatToParts(now);
        const offsetPart = parts.find(part => part.type === 'timeZoneName');
        
        if (offsetPart && offsetPart.value.match(/GMT[+-]\d{2}:\d{2}/)) {
          return offsetPart.value.replace('GMT', '');
        }
      } catch (e) {
        // Continue to fallback method
      }

      // Method 2: Calculate offset using date comparison
      const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: ianaTimezone }));
      
      const offsetMs = localTime.getTime() - utcTime.getTime();
      const offsetMinutes = Math.round(offsetMs / (1000 * 60));
      
      const hours = Math.floor(Math.abs(offsetMinutes) / 60);
      const mins = Math.abs(offsetMinutes) % 60;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      
      return `${sign}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    } catch (error) {
      console.warn(`Failed to calculate offset for ${ianaTimezone}:`, error);
      return '+00:00';
    }
  }

  /**
   * Get formatted date string for timezone
   * @param {string} ianaTimezone - IANA timezone identifier
   * @param {string} locale - Locale for formatting (default: 'en-GB')
   * @returns {string} Formatted date string
   */
  static getFormattedDate(ianaTimezone, locale = 'en-GB') {
    try {
      const now = new Date();
      return now.toLocaleDateString(locale, { 
        weekday: 'short', 
        day: '2-digit', 
        timeZone: ianaTimezone 
      });
    } catch (error) {
      console.warn(`Failed to get date for ${ianaTimezone}:`, error);
      return 'Mon 01';
    }
  }

  /**
   * Get IANA timezone from timezone code
   * @param {string} timezoneCode - Timezone code (e.g., 'UTC', 'GMT', 'EST')
   * @returns {string} IANA timezone identifier
   */
  static getIANATimezone(timezoneCode) {
    // Try enhanced timezone data first
    if (window.enhancedTimezones) {
      const enhancedTz = window.enhancedTimezones.find(tz => tz.value === timezoneCode);
      if (enhancedTz?.ianaTimezone) {
        return enhancedTz.ianaTimezone;
      }
    }

    // Try getAllTimezones data
    if (typeof getAllTimezones === 'function') {
      const allTz = getAllTimezones();
      const tzData = allTz.find(tz => tz.value === timezoneCode);
      if (tzData?.ianaTimezone) {
        return tzData.ianaTimezone;
      }
    }

    // Return as-is if it might already be an IANA timezone
    return timezoneCode;
  }

  /**
   * Get complete timezone information
   * @param {string} timezoneCode - Timezone code
   * @returns {Object} Complete timezone data with time, offset, date
   */
  static getTimezoneInfo(timezoneCode) {
    const ianaTimezone = this.getIANATimezone(timezoneCode);
    
    return {
      code: timezoneCode,
      iana: ianaTimezone,
      time: this.getCurrentTime(ianaTimezone, 'HH:mm'),
      timeWithSeconds: this.getCurrentTime(ianaTimezone, 'HH:mm:ss'),
      offset: this.getTimezoneOffset(ianaTimezone),
      date: this.getFormattedDate(ianaTimezone),
      timestamp: new Date().getTime()
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeCalculator;
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.TimeCalculator = TimeCalculator;
}