// Dynamic timezone resolver that handles browser-specific timezone resolutions
/* global module */

(function(global) {
  'use strict';

  // Cache for resolved timezones to avoid repeated calculations
  const resolvedTimezoneCache = new Map();

  /**
   * Get the browser's resolved timezone name for a given timezone
   * @param {string} timezone - The timezone to resolve (e.g., "Asia/Kolkata")
   * @returns {string} - The browser's resolved timezone (e.g., "Asia/Calcutta")
   */
  function getBrowserResolvedTimezone(timezone) {
    // Check cache first
    if (resolvedTimezoneCache.has(timezone)) {
      return resolvedTimezoneCache.get(timezone);
    }

    try {
      // Create a DateTimeFormat with the specified timezone
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      // Get the resolved timezone that the browser actually uses
      const resolved = formatter.resolvedOptions().timeZone;

      // Cache the result
      resolvedTimezoneCache.set(timezone, resolved);

      return resolved;
    } catch (error) {
      // If timezone is invalid, return the original
      console.warn(`Failed to resolve timezone "${timezone}":`, error);
      return timezone;
    }
  }

  /**
   * Check if two timezones are equivalent (resolve to the same timezone)
   * @param {string} tz1 - First timezone
   * @param {string} tz2 - Second timezone
   * @returns {boolean} - True if timezones are equivalent
   */
  function areTimezonesEquivalent(tz1, tz2) {
    if (tz1 === tz2) return true;

    try {
      const resolved1 = getBrowserResolvedTimezone(tz1);
      const resolved2 = getBrowserResolvedTimezone(tz2);
      return resolved1 === resolved2;
    } catch (error) {
      return false;
    }
  }

  /**
   * Find a timezone entry that matches the browser's timezone
   * @param {Array} timezones - Array of timezone objects
   * @param {string} browserTimezone - The browser's reported timezone
   * @returns {Object|null} - Matching timezone object or null
   */
  function findMatchingTimezone(timezones, browserTimezone) {
    // Direct match first (fastest)
    let match = timezones.find(tz => tz.ianaTimezone === browserTimezone);
    if (match) return match;

    // Check if any timezone resolves to the browser timezone
    match = timezones.find(tz => {
      const resolved = getBrowserResolvedTimezone(tz.ianaTimezone || tz.value);
      return resolved === browserTimezone;
    });
    if (match) return match;

    // Check by value field
    match = timezones.find(tz => {
      const resolved = getBrowserResolvedTimezone(tz.value);
      return resolved === browserTimezone;
    });
    if (match) return match;

    // Final attempt: check if browser timezone resolves to any of our timezones
    const resolvedBrowserTz = getBrowserResolvedTimezone(browserTimezone);
    match = timezones.find(tz => {
      const ourResolved = getBrowserResolvedTimezone(tz.ianaTimezone || tz.value);
      return ourResolved === resolvedBrowserTz;
    });

    return match || null;
  }

  /**
   * Get common timezone aliases and their resolutions
   * @returns {Object} - Map of timezone aliases
   */
  function getCommonAliases() {
    return {
      // These are common aliases that browsers might resolve differently
      'Asia/Kolkata': ['Asia/Calcutta', 'Asia/Kolkata'],
      'Asia/Yangon': ['Asia/Rangoon', 'Asia/Yangon'],
      'Asia/Ho_Chi_Minh': ['Asia/Saigon', 'Asia/Ho_Chi_Minh'],
      'Asia/Kathmandu': ['Asia/Katmandu', 'Asia/Kathmandu'],
      'Asia/Dhaka': ['Asia/Dacca', 'Asia/Dhaka'],
      'Africa/Asmara': ['Africa/Asmera', 'Africa/Asmara'],
      'America/Argentina/Buenos_Aires': ['America/Buenos_Aires', 'America/Argentina/Buenos_Aires'],
      'America/Indiana/Indianapolis': ['America/Indianapolis', 'America/Indiana/Indianapolis'],
      'America/Kentucky/Louisville': ['America/Louisville', 'America/Kentucky/Louisville'],
      'Pacific/Chuuk': ['Pacific/Truk', 'Pacific/Yap', 'Pacific/Chuuk'],
      'Pacific/Pohnpei': ['Pacific/Ponape', 'Pacific/Pohnpei']
    };
  }

  /**
   * Normalize timezone data to include all possible browser resolutions
   * @param {Array} timezones - Original timezone array
   * @returns {Array} - Enhanced timezone array
   */
  function normalizeTimezoneData(timezones) {
    const aliases = getCommonAliases();

    return timezones.map(tz => {
      // Get the browser's resolved name for this timezone
      const resolved = getBrowserResolvedTimezone(tz.value);

      // Check if this timezone has known aliases
      let possibleNames = [tz.value];
      Object.entries(aliases).forEach(([modern, aliasList]) => {
        if (aliasList.includes(tz.value) || tz.value === modern) {
          possibleNames = [...new Set([...possibleNames, ...aliasList, modern])];
        }
      });

      return {
        ...tz,
        ianaTimezone: resolved, // Use browser-resolved name
        alternateNames: possibleNames // Keep all possible names
      };
    });
  }

  // Export functions
  const TimezoneResolver = {
    getBrowserResolvedTimezone,
    areTimezonesEquivalent,
    findMatchingTimezone,
    normalizeTimezoneData,
    getCommonAliases
  };

  // Export for different environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimezoneResolver;
  } else {
    global.TimezoneResolver = TimezoneResolver;
  }

})(typeof window !== 'undefined' ? window : this);
