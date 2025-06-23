// Tests for date parsing and validation logic

// Import the functions we need to test
const fs = require('fs');
const path = require('path');

// Read and evaluate the date-time-parser.js module
const dateTimeParserJs = fs.readFileSync(path.join(__dirname, '../modules/date-time-parser.js'), 'utf8');

// Extract the DATE_PARSING_PATTERNS, parseAndValidateDate, and isValidDateRange functions
let DATE_PARSING_PATTERNS, parseAndValidateDate, isValidDateRange, isValidDateText;

beforeAll(() => {
  // Set up a minimal browser-like environment
  global.window = global.window || {};
  global.window.TimeConverter = {};

  // Execute the date-time-parser script in a controlled environment
  const scriptContext = {
    window: global.window,
    console: global.console
  };

  // Use eval to execute the module script
  const contextKeys = Object.keys(scriptContext);
  const contextValues = Object.values(scriptContext);
  const wrappedScript = `
    (function(${contextKeys.join(', ')}) {
      ${dateTimeParserJs}
      return window.TimeConverter.dateTimeParser;
    })
  `;

  const scriptFunction = eval(wrappedScript);
  const parser = scriptFunction(...contextValues);

  DATE_PARSING_PATTERNS = parser.DATE_PARSING_PATTERNS;
  parseAndValidateDate = parser.parseAndValidateDate;
  isValidDateRange = parser.isValidDateRange;
  isValidDateText = parser.isValidDateText;
});

describe('Date Parsing Patterns', () => {
  test('should have all required patterns defined', () => {
    expect(DATE_PARSING_PATTERNS).toBeDefined();
    expect(Array.isArray(DATE_PARSING_PATTERNS)).toBe(true);
    expect(DATE_PARSING_PATTERNS.length).toBeGreaterThan(0);

    // Check that each pattern has required properties
    DATE_PARSING_PATTERNS.forEach(pattern => {
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('regex');
      expect(pattern).toHaveProperty('parser');
      expect(typeof pattern.name).toBe('string');
      expect(pattern.regex instanceof RegExp).toBe(true);
      expect(typeof pattern.parser).toBe('function');
    });
  });

  test('should have YYYY_MM_DD pattern before MM_DD_YYYY pattern', () => {
    const yyyyIndex = DATE_PARSING_PATTERNS.findIndex(p => p.name === 'YYYY_MM_DD');
    const mmddIndex = DATE_PARSING_PATTERNS.findIndex(p => p.name === 'MM_DD_YYYY');

    expect(yyyyIndex).toBeGreaterThan(-1);
    expect(mmddIndex).toBeGreaterThan(-1);
    expect(yyyyIndex).toBeLessThan(mmddIndex);
  });

  test('should have the new DD_MONTH_COMMA_YYYY_TIME pattern defined', () => {
    const newPatternIndex = DATE_PARSING_PATTERNS.findIndex(p => p.name === 'DD_MONTH_COMMA_YYYY_TIME');
    expect(newPatternIndex).toBeGreaterThan(-1);

    const pattern = DATE_PARSING_PATTERNS[newPatternIndex];
    expect(pattern.regex).toBeInstanceOf(RegExp);
    expect(typeof pattern.parser).toBe('function');
  });
});

describe('Date Validation', () => {
  test('isValidDateRange should validate year ranges correctly', () => {
    expect(isValidDateRange(2024, 12, 19, 15, 30)).toBe(true);
    expect(isValidDateRange(1899, 12, 19, 15, 30)).toBe(false); // Year too low
    expect(isValidDateRange(2101, 12, 19, 15, 30)).toBe(false); // Year too high
    expect(isValidDateRange(1900, 12, 19, 15, 30)).toBe(true);  // Boundary
    expect(isValidDateRange(2100, 12, 19, 15, 30)).toBe(true);  // Boundary
  });

  test('isValidDateRange should validate month ranges correctly', () => {
    expect(isValidDateRange(2024, 1, 19, 15, 30)).toBe(true);   // Valid month
    expect(isValidDateRange(2024, 12, 19, 15, 30)).toBe(true);  // Valid month
    expect(isValidDateRange(2024, 0, 19, 15, 30)).toBe(false);  // Invalid month
    expect(isValidDateRange(2024, 13, 19, 15, 30)).toBe(false); // Invalid month
  });

  test('isValidDateRange should validate day ranges correctly', () => {
    expect(isValidDateRange(2024, 1, 31, 15, 30)).toBe(true);   // Valid day for January
    expect(isValidDateRange(2024, 4, 30, 15, 30)).toBe(true);   // Valid day for April
    expect(isValidDateRange(2024, 4, 31, 15, 30)).toBe(false);  // Invalid day for April
    expect(isValidDateRange(2024, 2, 29, 15, 30)).toBe(true);   // Valid leap year
    expect(isValidDateRange(2023, 2, 29, 15, 30)).toBe(false);  // Invalid non-leap year
  });

  test('isValidDateRange should validate hour ranges correctly', () => {
    expect(isValidDateRange(2024, 12, 19, 0, 30)).toBe(true);   // Valid hour
    expect(isValidDateRange(2024, 12, 19, 23, 30)).toBe(true);  // Valid hour
    expect(isValidDateRange(2024, 12, 19, -1, 30)).toBe(false); // Invalid hour
    expect(isValidDateRange(2024, 12, 19, 24, 30)).toBe(false); // Invalid hour
  });

  test('isValidDateRange should validate minute ranges correctly', () => {
    expect(isValidDateRange(2024, 12, 19, 15, 0)).toBe(true);   // Valid minute
    expect(isValidDateRange(2024, 12, 19, 15, 59)).toBe(true);  // Valid minute
    expect(isValidDateRange(2024, 12, 19, 15, -1)).toBe(false); // Invalid minute
    expect(isValidDateRange(2024, 12, 19, 15, 60)).toBe(false); // Invalid minute
  });
});

describe('Date Text Validation', () => {
  describe('Valid date-time formats that SHOULD be accepted', () => {
    const validFormats = [
      // MM/DD/YYYY formats
      '12/19/2024 3:30:45 PM',
      '1/5/2024 9:15 AM',
      '12/1/24 11:00 PM',
      '03/01/2024 09:00 PM',

      // YYYY/MM/DD formats
      '2024/12/19 15:30',
      '2024/12/19 3:30 PM',
      '2024/1/5 9:15 AM',

      // ISO 8601 formats
      '2024-12-19T15:30:00Z',
      '2024-12-19T15:30:00+05:30',
      '2024-12-19 15:30:00',
      '2024-12-19T15:30',

      // European DD.MM.YYYY formats
      '19.12.2024 15:30',
      '19.12.2024 15:30:45',

      // DD-MM-YYYY formats
      '19-12-2024 15:30',
      '5-1-2024 9:15 AM',

      // Month name formats
      'December 19, 2024 3:30 PM',
      'Dec 19, 2024 15:30',
      '19 December 2024 15:30',
      '5 Jan 2024 09:15',

      // DD MMM, YYYY HH:MM AM/PM format
      '22 Jun, 2025 04:41 PM',
      '01 Jan, 2024 12:00 AM',
      '15 Dec, 2023 11:59 PM'
    ];

    validFormats.forEach(dateStr => {
      test(`should accept valid format: "${dateStr}"`, () => {
        expect(isValidDateText(dateStr)).toBe(true);
      });
    });
  });

  describe('Invalid patterns that SHOULD be rejected', () => {
    const invalidFormats = [
      // Timezone suffixed patterns
      '03/01/2024, 09:00 PM IST',
      '12/19/2024, 15:30 EST',

      // Invalid date values
      '13/45/2024 25:99 PM',
      'February 30, 2024 3:30 PM',
      '12/32/2024 15:30',
      '00/15/2024 12:00 PM',

      // Date-only formats (no time)
      'December 19, 2024',
      '12/19/2024',
      '2024-12-19',

      // Time-only formats
      '3:30 PM',
      '15:30',

      // Version/build patterns (these should be caught by context detection)
      // 'Version 1.12.2024 15:30',
      // 'Build 12/19/2024',

      // Invalid years
      '12/19/1850 15:30',
      '12/19/2150 15:30'
    ];

    invalidFormats.forEach(dateStr => {
      test(`should reject invalid format: "${dateStr}"`, () => {
        expect(isValidDateText(dateStr)).toBe(false);
      });
    });
  });
});

describe('parseAndValidateDate function', () => {
  test('should return null for timezone suffixed dates', () => {
    expect(parseAndValidateDate('12/19/2024 3:30 PM EST')).toBeNull();
    expect(parseAndValidateDate('03/01/2024, 09:00 PM IST')).toBeNull();
  });

  test('should return valid date components for good dates', () => {
    const result = parseAndValidateDate('12/19/2024 3:30 PM');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('year', 2024);
    expect(result).toHaveProperty('month', 12);
    expect(result).toHaveProperty('day', 19);
    expect(result).toHaveProperty('hour', 15); // 3 PM = 15
    expect(result).toHaveProperty('minute', 30);
  });

  test('should handle YYYY/MM/DD format correctly', () => {
    const result = parseAndValidateDate('2024/12/19 15:30');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('year', 2024);
    expect(result).toHaveProperty('month', 12);
    expect(result).toHaveProperty('day', 19);
    expect(result).toHaveProperty('hour', 15);
    expect(result).toHaveProperty('minute', 30);
  });

  test('should handle 2-digit years correctly', () => {
    const result24 = parseAndValidateDate('12/1/24 11:00 PM');
    expect(result24).not.toBeNull();
    expect(result24.year).toBe(2024); // 24 -> 2024

    const result75 = parseAndValidateDate('12/1/75 11:00 PM');
    expect(result75).not.toBeNull();
    expect(result75.year).toBe(1975); // 75 -> 1975
  });

  test('should handle AM/PM conversion correctly', () => {
    const amResult = parseAndValidateDate('12/19/2024 3:30 AM');
    expect(amResult.hour).toBe(3);

    const pmResult = parseAndValidateDate('12/19/2024 3:30 PM');
    expect(pmResult.hour).toBe(15);

    const noon = parseAndValidateDate('12/19/2024 12:00 PM');
    expect(noon.hour).toBe(12);

    const midnight = parseAndValidateDate('12/19/2024 12:00 AM');
    expect(midnight.hour).toBe(0);
  });

  test('should handle DD MMM, YYYY HH:MM AM/PM format correctly', () => {
    const result = parseAndValidateDate('22 Jun, 2025 04:41 PM');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('year', 2025);
    expect(result).toHaveProperty('month', 6); // June = 6
    expect(result).toHaveProperty('day', 22);
    expect(result).toHaveProperty('hour', 16); // 4:41 PM = 16:41
    expect(result).toHaveProperty('minute', 41);

    const amResult = parseAndValidateDate('01 Jan, 2024 12:00 AM');
    expect(amResult).not.toBeNull();
    expect(amResult).toHaveProperty('year', 2024);
    expect(amResult).toHaveProperty('month', 1); // January = 1
    expect(amResult).toHaveProperty('day', 1);
    expect(amResult).toHaveProperty('hour', 0); // 12:00 AM = 0
    expect(amResult).toHaveProperty('minute', 0);
  });
});
