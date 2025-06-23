// Test setup file for Jest
// This file runs before each test suite

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        if (callback && typeof callback === 'function') {
          callback({});
        }
      }),
      set: jest.fn((data, callback) => {
        if (callback && typeof callback === 'function') {
          callback();
        }
      })
    },
    local: {
      get: jest.fn((keys, callback) => {
        if (callback && typeof callback === 'function') {
          callback({});
        }
      }),
      set: jest.fn((data, callback) => {
        if (callback && typeof callback === 'function') {
          callback();
        }
      })
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    lastError: null
  },
  tabs: {
    query: jest.fn((queryInfo, callback) => {
      if (callback && typeof callback === 'function') {
        callback([{ id: 1, url: 'https://example.com' }]);
      }
    }),
    sendMessage: jest.fn((tabId, message, callback) => {
      if (callback && typeof callback === 'function') {
        callback({ status: 'success' });
      }
    })
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  },
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setIcon: jest.fn()
  },
  scripting: {
    insertCSS: jest.fn(),
    executeScript: jest.fn()
  }
};

// Mock date-fns and date-fns-tz libraries
global.dateFns = {
  format: jest.fn(),
  parse: jest.fn(),
  isValid: jest.fn()
};

global.dateFnsTz = {
  zonedTimeToUtc: jest.fn(),
  utcToZonedTime: jest.fn(),
  format: jest.fn()
};

// Mock DOM methods
global.document.createTreeWalker = jest.fn();
global.document.createDocumentFragment = jest.fn();
global.document.createTextNode = jest.fn();
global.document.querySelector = jest.fn();
global.document.querySelectorAll = jest.fn(() => []);
global.document.head = {
  appendChild: jest.fn()
};

// Mock window object
global.window.timeConverterInjected = undefined;
global.window.timeConverterPageState = undefined;
global.window.lastRightClickedElement = undefined;

// Setup TimeConverter global object
global.window.TimeConverter = {};

// Load and setup the modules for testing
const fs = require('fs');
const path = require('path');

// Load all-timezones.js
const allTimezonesScript = fs.readFileSync(path.join(__dirname, '../all-timezones.js'), 'utf8');
eval(allTimezonesScript);

// Load date-time-parser.js
const dateTimeParserScript = fs.readFileSync(path.join(__dirname, '../modules/date-time-parser.js'), 'utf8');
eval(dateTimeParserScript);

// Load timezone-converter.js
const timezoneConverterScript = fs.readFileSync(path.join(__dirname, '../modules/timezone-converter.js'), 'utf8');
eval(timezoneConverterScript);

// Load time-calculator.js
const timeCalculatorScript = fs.readFileSync(path.join(__dirname, '../modules/time-calculator.js'), 'utf8');
eval(timeCalculatorScript);

// Load custom-dropdown.js
const customDropdownScript = fs.readFileSync(path.join(__dirname, '../custom-dropdown.js'), 'utf8');
eval(customDropdownScript);

// Make functions globally available for tests
if (global.window.TimeConverter && global.window.TimeConverter.timezoneConverter) {
  global.convertDateWithLibrary = global.window.TimeConverter.timezoneConverter.convertDateWithLibrary;
  global.getIANATimezone = global.window.TimeConverter.timezoneConverter.getIANATimezone;
  global.getShortTimezoneName = global.window.TimeConverter.timezoneConverter.getShortTimezoneName;
}

// Helper function to reset mocks between tests
global.resetMocks = () => {
  jest.clearAllMocks();
  global.window.timeConverterInjected = undefined;
  global.window.timeConverterPageState = undefined;
  global.window.lastRightClickedElement = undefined;
};

// Console spy to suppress logs during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
