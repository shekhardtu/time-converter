// selection-feature/selection-date-parser.js
// Extended date/time parser specifically for text selection

(function() {
    'use strict';

    // Extended date/time parser specifically for text selection
    function parseSelectedDateTime(text) {
        const trimmedText = text.trim();
        
        // Try Unix timestamp first (10 or 13 digits)
        const unixTimestamp = parseUnixTimestamp(trimmedText);
        if (unixTimestamp) return unixTimestamp;
        
        // Try time-only formats
        const timeOnly = parseTimeOnly(trimmedText);
        if (timeOnly) return timeOnly;
        
        // Try the standard date parser from the main module
        const standardDate = window.TimeConverter?.parseDateTime?.(trimmedText);
        if (standardDate) return standardDate;
        
        // Try more aggressive patterns for selection
        return parseAggressiveDateTime(trimmedText);
    }

    function parseUnixTimestamp(text) {
        // Match 10-digit (seconds) or 13-digit (milliseconds) numbers
        const match = text.match(/^\d{10}$|^\d{13}$/);
        if (!match) return null;
        
        const timestamp = parseInt(text);
        
        // Validate reasonable date range (2000-2100)
        const minTimestamp = 946684800; // Jan 1, 2000
        const maxTimestamp = 4102444800; // Jan 1, 2100
        const minTimestampMs = minTimestamp * 1000;
        const maxTimestampMs = maxTimestamp * 1000;
        
        let date;
        if (text.length === 10) {
            // Unix timestamp in seconds
            if (timestamp < minTimestamp || timestamp > maxTimestamp) return null;
            date = new Date(timestamp * 1000);
        } else {
            // Unix timestamp in milliseconds
            if (timestamp < minTimestampMs || timestamp > maxTimestampMs) return null;
            date = new Date(timestamp);
        }
        
        // Final validation
        if (isNaN(date.getTime())) return null;
        
        return date;
    }

    function parseTimeOnly(text) {
        const patterns = [
            // 12-hour formats with AM/PM
            {
                regex: /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)$/,
                parser: (match) => {
                    const [, hours, minutes, seconds, ampm] = match;
                    let hour24 = parseInt(hours);
                    if (ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
                    if (ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
                    return createTodayDate(hour24, parseInt(minutes), seconds ? parseInt(seconds) : 0);
                }
            },
            // 12-hour with dot separator
            {
                regex: /^(\d{1,2})\.(\d{2})\s?(AM|PM|am|pm)$/,
                parser: (match) => {
                    const [, hours, minutes, ampm] = match;
                    let hour24 = parseInt(hours);
                    if (ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
                    if (ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
                    return createTodayDate(hour24, parseInt(minutes), 0);
                }
            },
            // 24-hour formats
            {
                regex: /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
                parser: (match) => {
                    const [, hours, minutes, seconds] = match;
                    const hour = parseInt(hours);
                    if (hour > 23) return null;
                    return createTodayDate(hour, parseInt(minutes), seconds ? parseInt(seconds) : 0);
                }
            },
            // 24-hour with dot separator
            {
                regex: /^(\d{1,2})\.(\d{2})$/,
                parser: (match) => {
                    const [, hours, minutes] = match;
                    const hour = parseInt(hours);
                    if (hour > 23) return null;
                    return createTodayDate(hour, parseInt(minutes), 0);
                }
            }
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match) {
                const date = pattern.parser(match);
                if (date && !isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        return null;
    }

    function parseAggressiveDateTime(text) {
        // More aggressive patterns for user-selected text
        const patterns = [
            // Relative times
            {
                regex: /^(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago$/i,
                parser: (match) => {
                    const [, amount, unit] = match;
                    const now = new Date();
                    const num = parseInt(amount);
                    
                    switch(unit.toLowerCase()) {
                        case 'second': return new Date(now.getTime() - num * 1000);
                        case 'minute': return new Date(now.getTime() - num * 60 * 1000);
                        case 'hour': return new Date(now.getTime() - num * 60 * 60 * 1000);
                        case 'day': return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
                        case 'week': return new Date(now.getTime() - num * 7 * 24 * 60 * 60 * 1000);
                        case 'month': 
                            const monthsAgo = new Date(now);
                            monthsAgo.setMonth(monthsAgo.getMonth() - num);
                            return monthsAgo;
                        case 'year':
                            const yearsAgo = new Date(now);
                            yearsAgo.setFullYear(yearsAgo.getFullYear() - num);
                            return yearsAgo;
                    }
                }
            },
            // Special keywords
            {
                regex: /^(now|today|yesterday|tomorrow)$/i,
                parser: (match) => {
                    const keyword = match[1].toLowerCase();
                    const now = new Date();
                    
                    switch(keyword) {
                        case 'now': return now;
                        case 'today': return new Date(now.setHours(0, 0, 0, 0));
                        case 'yesterday': 
                            const yesterday = new Date(now);
                            yesterday.setDate(yesterday.getDate() - 1);
                            yesterday.setHours(0, 0, 0, 0);
                            return yesterday;
                        case 'tomorrow':
                            const tomorrow = new Date(now);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(0, 0, 0, 0);
                            return tomorrow;
                    }
                }
            }
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match) {
                const date = pattern.parser(match);
                if (date && !isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        return null;
    }

    function createTodayDate(hours, minutes, seconds = 0) {
        const now = new Date();
        const date = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hours,
            minutes,
            seconds
        );
        
        // Validate the time
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
            return null;
        }
        
        return date;
    }

    function detectTimezoneInfo(text) {
        // Enhanced timezone detection for selection context
        const patterns = [
            // Timezone abbreviations
            /\b(UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|IST|JST|KST|AEST|AEDT|BST|CET|CEST)\b/i,
            // UTC offsets
            /UTC([+-]\d{1,2}(?::\d{2})?)/,
            /GMT([+-]\d{1,2}(?::\d{2})?)/,
            // Standalone offsets
            /([+-]\d{2}:?\d{2})$/,
            // Timezone in parentheses
            /\(([A-Z]{3,4})\)/,
            // Full timezone names
            /\b(Eastern|Central|Mountain|Pacific|India|Japan|Korea|Europe\/\w+|Asia\/\w+|America\/\w+)\b/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }
        
        return null;
    }

    // Export to global scope
    window.TimeConverter = window.TimeConverter || {};
    window.TimeConverter.parseSelectedDateTime = parseSelectedDateTime;
    window.TimeConverter.detectTimezoneInfo = detectTimezoneInfo;
})();