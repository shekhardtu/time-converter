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

// Mock window object
global.window.timeConverterInjected = undefined;
global.window.timeConverterPageState = undefined;
global.window.lastRightClickedElement = undefined;

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
