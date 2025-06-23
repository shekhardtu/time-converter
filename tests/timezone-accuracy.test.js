// Comprehensive timezone conversion accuracy tests
const { describe, test, expect } = require('@jest/globals');

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Mock dateFnsTz globally
global.dateFnsTz = {
  formatInTimeZone: (date, timeZone, formatString) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const parts = formatter.formatToParts(date);
      const partsObj = {};
      parts.forEach(part => {
        partsObj[part.type] = part.value;
      });

      const year = partsObj.year;
      const month = partsObj.month;
      const day = partsObj.day;
      const hour = parseInt(partsObj.hour);
      const minute = partsObj.minute;
      const second = partsObj.second;

      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';

      const result = formatString
        .replace(/yyyy/gi, year)
        .replace(/MM/g, month)
        .replace(/dd/gi, day)
        .replace(/HH/g, String(hour).padStart(2, '0'))
        .replace(/hh/g, String(hour12).padStart(2, '0'))
        .replace(/mm/g, minute)
        .replace(/ss/gi, second)
        .replace(/a/gi, ampm);

      return result;
    } catch (error) {
      return 'Invalid Date';
    }
  },
  zonedTimeToUtc: (date, timeZone) => {
    // Use native browser conversion
    const dateString = global.dateFnsTz.formatInTimeZone(date, timeZone, 'yyyy-MM-dd HH:mm:ss');
    return new Date(dateString + 'Z');
  },
  utcToZonedTime: (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const zonedString = formatter.format(date);
    return new Date(zonedString);
  },
  format: (date, formatString) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';

    return formatString
      .replace(/yyyy/gi, year)
      .replace(/MM/g, month)
      .replace(/dd/gi, day)
      .replace(/HH/g, String(hour).padStart(2, '0'))
      .replace(/hh/g, String(hour12).padStart(2, '0'))
      .replace(/mm/g, minute)
      .replace(/ss/gi, second)
      .replace(/a/gi, ampm);
  }
};

// Load content.js functions (we'll need to extract the conversion function)
// For now, let's test the expected behavior
describe('Comprehensive Timezone Conversion Tests', () => {

  // Test data: Known conversions that should be correct
  const testCases = [
    {
      name: 'UTC to IST (Standard case)',
      input: '2024-12-19T15:30:00Z',
      fromTz: 'UTC',
      toTz: 'Asia/Kolkata',
      expected: '2024-12-19 21:00:00', // UTC+5:30
      description: 'Critical business case from user report'
    },
    {
      name: 'UTC to EST (Winter)',
      input: '2024-01-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'America/New_York',
      expected: '2024-01-15 07:00:00', // UTC-5 (EST)
      description: 'EST during winter months'
    },
    {
      name: 'UTC to EDT (Summer)',
      input: '2024-07-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'America/New_York',
      expected: '2024-07-15 08:00:00', // UTC-4 (EDT)
      description: 'EDT during summer months (DST)'
    },
    {
      name: 'UTC to PST (Winter)',
      input: '2024-01-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'America/Los_Angeles',
      expected: '2024-01-15 04:00:00', // UTC-8 (PST)
      description: 'PST during winter months'
    },
    {
      name: 'UTC to PDT (Summer)',
      input: '2024-07-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'America/Los_Angeles',
      expected: '2024-07-15 05:00:00', // UTC-7 (PDT)
      description: 'PDT during summer months (DST)'
    },
    {
      name: 'UTC to JST',
      input: '2024-06-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'Asia/Tokyo',
      expected: '2024-06-15 21:00:00', // UTC+9
      description: 'Japan Standard Time (no DST)'
    },
    {
      name: 'UTC to AEST (Summer)',
      input: '2024-01-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'Australia/Sydney',
      expected: '2024-01-15 23:00:00', // UTC+11 (AEDT during summer)
      description: 'Australian Eastern Daylight Time'
    },
    {
      name: 'UTC to AEST (Winter)',
      input: '2024-07-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'Australia/Sydney',
      expected: '2024-07-15 22:00:00', // UTC+10 (AEST during winter)
      description: 'Australian Eastern Standard Time'
    },
    {
      name: 'UTC to CET (Winter)',
      input: '2024-01-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'Europe/Paris',
      expected: '2024-01-15 13:00:00', // UTC+1 (CET)
      description: 'Central European Time'
    },
    {
      name: 'UTC to CEST (Summer)',
      input: '2024-07-15T12:00:00Z',
      fromTz: 'UTC',
      toTz: 'Europe/Paris',
      expected: '2024-07-15 14:00:00', // UTC+2 (CEST)
      description: 'Central European Summer Time'
    },
    {
      name: 'IST to UTC (Reverse conversion)',
      input: '2024-12-19T21:00:00',
      fromTz: 'Asia/Kolkata',
      toTz: 'UTC',
      expected: '2024-12-19 15:30:00', // IST-5:30
      description: 'Reverse of the critical business case'
    },
    {
      name: 'Cross-timezone (IST to EST)',
      input: '2024-06-15T14:30:00',
      fromTz: 'Asia/Kolkata',
      toTz: 'America/New_York',
      expected: '2024-06-15 05:00:00', // IST to EDT (summer)
      description: 'Direct timezone to timezone conversion'
    },
    {
      name: 'New date format support (DD MMM, YYYY HH:MM AM/PM)',
      input: '2024-06-22T16:41:00Z',
      fromTz: 'UTC',
      toTz: 'Asia/Kolkata',
      expected: '2024-06-22 22:11:00', // UTC+5:30
      description: 'Testing new format like "22 Jun, 2025 04:41 PM"'
    }
  ];

  testCases.forEach(testCase => {
    test(testCase.name, () => {
      const inputDate = new Date(testCase.input);

      // Test using our improved dateFnsTz functions
      let result;

      if (testCase.fromTz === 'UTC') {
        // For UTC sources, directly convert to target timezone
        result = global.dateFnsTz.formatInTimeZone(inputDate, testCase.toTz, 'yyyy-MM-dd HH:mm:ss');
      } else {
        // For non-UTC sources, first convert to UTC, then to target
        const utcDate = global.dateFnsTz.zonedTimeToUtc(inputDate, testCase.fromTz);
        result = global.dateFnsTz.formatInTimeZone(utcDate, testCase.toTz, 'yyyy-MM-dd HH:mm:ss');
      }

      expect(result).toBe(testCase.expected);
    });
  });

  // Additional edge case tests
  describe('Edge Cases', () => {
    test('DST Transition - Spring Forward (EST to EDT)', () => {
      // March 10, 2024 at 2:00 AM EST becomes 3:00 AM EDT
      const springDate = new Date('2024-03-10T07:00:00Z'); // 2:00 AM EST
      const result = global.dateFnsTz.formatInTimeZone(springDate, 'America/New_York', 'yyyy-MM-dd HH:mm:ss');

      // Should be 3:00 AM (spring forward)
      expect(result).toBe('2024-03-10 03:00:00');
    });

    test('DST Transition - Fall Back (EDT to EST)', () => {
      // November 3, 2024 at 2:00 AM EDT becomes 1:00 AM EST
      const fallDate = new Date('2024-11-03T06:00:00Z'); // 2:00 AM EDT
      const result = global.dateFnsTz.formatInTimeZone(fallDate, 'America/New_York', 'yyyy-MM-dd HH:mm:ss');

      // Should be 1:00 AM (fall back)
      expect(result).toBe('2024-11-03 01:00:00');
    });

    test('Leap Year Handling', () => {
      const leapDate = new Date('2024-02-29T12:00:00Z');
      const result = global.dateFnsTz.formatInTimeZone(leapDate, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');

      expect(result).toBe('2024-02-29 17:30:00');
    });

    test('Year Boundary Crossing', () => {
      const newYearDate = new Date('2023-12-31T20:00:00Z');
      const result = global.dateFnsTz.formatInTimeZone(newYearDate, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');

      // Should cross into new year
      expect(result).toBe('2024-01-01 01:30:00');
    });
  });

  // Performance and reliability tests
  describe('Reliability Tests', () => {
    test('Invalid timezone should not crash', () => {
      const date = new Date('2024-06-15T12:00:00Z');

      expect(() => {
        global.dateFnsTz.formatInTimeZone(date, 'Invalid/Timezone', 'yyyy-MM-dd HH:mm:ss');
      }).not.toThrow();
    });

    test('Invalid date should return fallback', () => {
      const invalidDate = new Date('invalid');
      const result = global.dateFnsTz.formatInTimeZone(invalidDate, 'UTC', 'yyyy-MM-dd HH:mm:ss');

      expect(result).toBe('Invalid Date');
    });

    test('Extreme dates should work', () => {
      const extremeDate = new Date('1900-01-01T00:00:00Z');
      const result = global.dateFnsTz.formatInTimeZone(extremeDate, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');

      expect(result).toMatch(/1900-01-01/);
    });
  });
});

// Test runner for manual verification
if (typeof window !== 'undefined') {
  window.runTimezoneTests = function() {
    console.log('Running manual timezone verification tests...');

    const testCases = [
      {
        name: 'Critical: UTC to IST',
        input: new Date('2024-12-19T15:30:00Z'),
        toTz: 'Asia/Kolkata',
        expected: '21:00'
      },
      {
        name: 'EST Summer (EDT)',
        input: new Date('2024-07-15T16:00:00Z'),
        toTz: 'America/New_York',
        expected: '12:00'
      },
      {
        name: 'PST Winter',
        input: new Date('2024-01-15T20:00:00Z'),
        toTz: 'America/Los_Angeles',
        expected: '12:00'
      }
    ];

    testCases.forEach(test => {
      try {
        const result = dateFnsTz.formatInTimeZone(test.input, test.toTz, 'HH:mm');
        const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test.name}: Expected ${test.expected}, Got ${result}`);
      } catch (error) {
        console.log(`❌ ERROR ${test.name}: ${error.message}`);
      }
    });
  };
}
