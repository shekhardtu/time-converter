// modules/date-time-parser.js

// Using a global object to share functions between scripts
window.TimeConverter = window.TimeConverter || {};

// Define date format parsing patterns - SINGLE SOURCE OF TRUTH
// Order matters: More specific patterns first to avoid ambiguity
const DATE_PARSING_PATTERNS = [
  {
    name: 'ISO8601_FULL',
    regex: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(?:Z|[+-]\d{2}:\d{2})/,
    parser: (match) => {
      const [, year, month, day, hour, minute] = match;
      return { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: parseInt(hour), minute: parseInt(minute) };
    }
  },
  {
    name: 'ISO8601_SIMPLE',
    regex: /(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/,
    parser: (match) => {
      const [, year, month, day, hour, minute, , ampm] = match;
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'YYYY_MM_DD',
    regex: /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/,
    parser: (match) => {
      const [, year, month, day, hour, minute, , ampm] = match;
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'MM_DD_YYYY',
    regex: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/,
    parser: (match) => {
      const [, month, day, year, hour, minute, , ampm] = match;
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;

      // Handle 2-digit years: 00-49 -> 20xx, 50-99 -> 19xx
      let fullYear = parseInt(year);
      if (fullYear < 100) {
        fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
      }

      return { year: fullYear, month: parseInt(month), day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'DD_MM_YYYY_DOT',
    regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    parser: (match) => {
      const [, day, month, year, hour, minute] = match;
      return { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: parseInt(hour), minute: parseInt(minute) };
    }
  },
  {
    name: 'DD_MM_YYYY_DASH',
    regex: /(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/,
    parser: (match) => {
      const [, day, month, year, hour, minute, , ampm] = match;
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;

      // Handle 2-digit years: 00-49 -> 20xx, 50-99 -> 19xx
      let fullYear = parseInt(year);
      if (fullYear < 100) {
        fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
      }

      return { year: fullYear, month: parseInt(month), day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'MONTH_DD_YYYY',
    regex: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/i,
    parser: (match) => {
      const [, monthStr, day, year, hour, minute, , ampm] = match;
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      const month = monthMap[monthStr.substring(0, 3)];
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { year: parseInt(year), month: month, day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'DD_MONTH_YYYY',
    regex: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/i,
    parser: (match) => {
      const [, day, monthStr, year, hour, minute, , ampm] = match;
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      const month = monthMap[monthStr.substring(0, 3)];
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { year: parseInt(year), month: month, day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'DD_MONTH_COMMA_YYYY_TIME',
    regex: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)/i,
    parser: (match) => {
      const [, day, monthStr, year, hour, minute, second, ampm] = match;
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      const month = monthMap[monthStr.substring(0, 3)];
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { 
        year: parseInt(year), 
        month: month, 
        day: parseInt(day), 
        hour: hour24, 
        minute: parseInt(minute),
        second: second ? parseInt(second) : 0
      };
    }
  },
  {
    name: 'DD_MONTH_COMMA_YYYY',
    regex: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/i,
    parser: (match) => {
      const monthMap = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
      let hour = parseInt(match[4], 10);
      const ampm = match[7];
      if (ampm && /pm/i.test(ampm) && hour !== 12) {
        hour += 12;
      } else if (ampm && /am/i.test(ampm) && hour === 12) {
        hour = 0;
      }
      return {
        day: parseInt(match[1], 10),
        month: monthMap[match[2].toLowerCase().substring(0, 3)],
        year: parseInt(match[3], 10),
        hour: hour,
        minute: parseInt(match[5], 10),
        second: match[6] ? parseInt(match[6], 10) : 0
      };
    }
  }
];

function isValidDateRange(year, month, day, hour, minute) {
  // Basic validation for realistic date ranges
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;

  // Month-specific day validation
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return false;

  // February leap year check
  if (month === 2 && day === 29) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (!isLeap) return false;
  }

  return true;
}

function parseAndValidateDate(dateText) {
  const cleanStr = dateText.trim();

  // Check for timezone-suffixed patterns that should be rejected
  // Only reject if there's actually a timezone suffix after the time
  // Patterns like "12/19/2024, 09:00 PM IST" or "12/19/2024 09:00 PM EST"
  if (/(?:AM|PM|am|pm)[,\s]+[A-Z]{2,5}\b/.test(cleanStr)) {
    return null;
  }

  // Try each pattern
  for (const pattern of DATE_PARSING_PATTERNS) {
    const match = cleanStr.match(pattern.regex);
    if (match) {
      const dateComponents = pattern.parser(match);
      if (isValidDateRange(dateComponents.year, dateComponents.month, dateComponents.day, dateComponents.hour, dateComponents.minute)) {
        return dateComponents;
      } else {
        return null; // Invalid date values
      }
    }
  }

  return null; // No pattern matched
}

function isValidDateText(dateText) {
  return parseAndValidateDate(dateText) !== null;
}

// Helper function to identify the date format pattern
function identifyDateFormat(dateString) {
  console.log('Identifying format for:', dateString);

  const patterns = [
    { regex: /(\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'YYYY/MM/DD' },
    { regex: /(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'MM/DD/YYYY' },
    { regex: /(\d{1,2}\/\d{1,2}\/\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'MM/DD/YY' },
    { regex: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2}))/, name: 'ISO 8601' },
    { regex: /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)/, name: 'YYYY-MM-DD' },
    { regex: /(\b\d{1,2}\.\d{1,2}\.\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?\b)/, name: 'DD.MM.YYYY' },
    { regex: /(\d{1,2}-\d{1,2}-\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'DD-MM-YYYY' },
    { regex: /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm))/, name: 'DD MMM, YYYY HH:MM AM/PM' },
    { regex: /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'Month DD, YYYY' },
    { regex: /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'DD Month YYYY' }
  ];

  for (const { regex, name } of patterns) {
    if (regex.test(dateString)) {
      console.log('Matched pattern:', name, 'Regex:', regex);
      return regex;
    }
  }

  console.log('No matching pattern found for:', dateString);
  return null;
}

window.TimeConverter.dateTimeParser = {
  DATE_PARSING_PATTERNS,
  isValidDateRange,
  parseAndValidateDate,
  isValidDateText,
  identifyDateFormat
};