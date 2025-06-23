/* eslint-env jest */
/* global getAllTimezones, TimeCalculator */
// Unit tests for core modules

// Load modules directly for testing
const fs = require('fs');
const path = require('path');

// Setup global window object for modules
global.window = global.window || {};
global.window.TimeConverter = {};

// Mock dateFnsTz for timezone-converter
global.dateFnsTz = {
  zonedTimeToUtc: jest.fn(),
  utcToZonedTime: jest.fn(),
  format: jest.fn()
};

// Load modules
const allTimezonesScript = fs.readFileSync(path.join(__dirname, '../all-timezones.js'), 'utf8');
eval(allTimezonesScript);

const dateTimeParserScript = fs.readFileSync(path.join(__dirname, '../modules/date-time-parser.js'), 'utf8');
eval(dateTimeParserScript);

const timeCalculatorScript = fs.readFileSync(path.join(__dirname, '../modules/time-calculator.js'), 'utf8');
eval(timeCalculatorScript);

const timezoneConverterScript = fs.readFileSync(path.join(__dirname, '../modules/timezone-converter.js'), 'utf8');
eval(timezoneConverterScript);

describe('Core Modules', () => {
  describe('getAllTimezones', () => {
    test('should return array of timezone objects', () => {
      const timezones = getAllTimezones();
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(100);

      const utc = timezones.find(tz => tz.value === 'UTC');
      expect(utc).toBeDefined();
      expect(utc.name).toBe('Coordinated Universal Time');
      expect(utc.ianaTimezone).toBe('UTC');
      expect(utc.abbreviation).toBe('UTC');
    });

    test('should include major timezone', () => {
      const timezones = getAllTimezones();
      const est = timezones.find(tz => tz.value === 'America/New_York');
      const pst = timezones.find(tz => tz.value === 'America/Los_Angeles');
      const ist = timezones.find(tz => tz.value === 'Asia/Kolkata');

      expect(est).toBeDefined();
      expect(pst).toBeDefined();
      expect(ist).toBeDefined();
    });
  });

  describe('Date Time Parser', () => {
    const { parseAndValidateDate, isValidDateText, identifyDateFormat } = window.TimeConverter.dateTimeParser;

    test('should parse ISO 8601 dates', () => {
      const result = parseAndValidateDate('2024-12-19T15:30:00');
      expect(result).toEqual({
        year: 2024,
        month: 12,
        day: 19,
        hour: 15,
        minute: 30
      });
    });

    test('should parse MM/DD/YYYY format', () => {
      const result = parseAndValidateDate('12/19/2024 3:30 PM');
      expect(result).toEqual({
        year: 2024,
        month: 12,
        day: 19,
        hour: 15,
        minute: 30
      });
    });

    test('should validate date text', () => {
      expect(isValidDateText('2024-12-19T15:30:00')).toBe(true);
      expect(isValidDateText('12/19/2024 3:30 PM')).toBe(true);
      expect(isValidDateText('invalid date')).toBe(false);
      expect(isValidDateText('13/45/2024')).toBe(false);
    });

    test('should identify date formats', () => {
      const isoFormat = identifyDateFormat('2024-12-19T15:30:00');
      expect(isoFormat).toBeTruthy();

      const usFormat = identifyDateFormat('12/19/2024 3:30 PM');
      expect(usFormat).toBeTruthy();
    });

    test('should reject invalid dates', () => {
      expect(parseAndValidateDate('13/45/2024')).toBeNull();
      expect(parseAndValidateDate('2024-13-45')).toBeNull();
      expect(parseAndValidateDate('')).toBeNull();
    });
  });

  describe('Time Calculator', () => {
    beforeEach(() => {
      global.dateFnsTz.format.mockReturnValue('12:30');
      global.dateFnsTz.utcToZonedTime.mockReturnValue(new Date('2024-12-19T15:30:00Z'));
    });

    test('should get current time for timezone', () => {
      const time = TimeCalculator.getCurrentTime('America/New_York');
      expect(typeof time).toBe('string');
      expect(time).toMatch(/^\d{2}:\d{2}$/);
    });

    test('should get timezone offset', () => {
      const offset = TimeCalculator.getTimezoneOffset('America/New_York');
      expect(typeof offset).toBe('string');
      expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
    });

    test('should get timezone info', () => {
      const info = TimeCalculator.getTimezoneInfo('America/New_York');
      expect(info).toBeDefined();
      expect(typeof info.time).toBe('string');
      expect(info.time).toMatch(/^\d{2}:\d{2}$/);
      expect(info.offset).toMatch(/^[+-]\d{2}:\d{2}$/);
    });
  });

  describe('Timezone Converter', () => {
    const { convertDateWithLibrary, getIANATimezone, getShortTimezoneName } = window.TimeConverter.timezoneConverter;

    beforeEach(() => {
      global.dateFnsTz.zonedTimeToUtc.mockReturnValue(new Date('2024-12-19T20:30:00Z'));
      global.dateFnsTz.utcToZonedTime.mockReturnValue(new Date('2024-12-20T02:00:00'));
      global.dateFnsTz.format.mockReturnValue('12/20/2024, 02:00 AM');
    });

    test('should convert dates between timezones', () => {
      const result = convertDateWithLibrary('12/19/2024 3:30 PM', 'America/Los_Angeles', 'Asia/Kolkata');
      expect(typeof result).toBe('string');
      expect(result).toContain('2024');
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should contain date format
    });

    test('should map timezone abbreviations to IANA', () => {
      expect(getIANATimezone('PST')).toBe('America/Los_Angeles');
      expect(getIANATimezone('EST')).toBe('America/New_York');
      expect(getIANATimezone('IST')).toBe('Asia/Kolkata');
      expect(getIANATimezone('UTC')).toBe('UTC');
      expect(getIANATimezone('UNKNOWN')).toBe('UTC');
    });

    test('should map IANA names to short names', () => {
      expect(getShortTimezoneName('America/Los_Angeles')).toBe('PST');
      expect(getShortTimezoneName('America/New_York')).toBe('EST');
      expect(getShortTimezoneName('Asia/Kolkata')).toBe('IST');
      expect(getShortTimezoneName('UTC')).toBe('UTC');
    });

    test('should handle invalid date strings', () => {
      const result = convertDateWithLibrary('invalid date', 'UTC', 'EST');
      expect(result).toBe('invalid date');
    });
  });
});

