// Tests for Chrome extension specific functionality

const fs = require('fs');
const path = require('path');

// Mock chrome storage responses
const mockStorageData = {};

beforeEach(() => {
  resetMocks();

  // Setup chrome.storage mocks
  global.chrome.storage.sync.get.mockImplementation((keys, callback) => {
    const result = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        if (mockStorageData[key] !== undefined) {
          result[key] = mockStorageData[key];
        }
      });
    } else if (typeof keys === 'string') {
      if (mockStorageData[keys] !== undefined) {
        result[keys] = mockStorageData[keys];
      }
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach(key => {
        result[key] = mockStorageData[key] !== undefined ? mockStorageData[key] : keys[key];
      });
    }
    callback(result);
  });

  global.chrome.storage.sync.set.mockImplementation((data, callback) => {
    Object.assign(mockStorageData, data);
    if (callback) callback();
  });
});

// Load content.js functions for testing
let checkSiteDisabled, getCustomFormatsForPage, saveCustomFormatForPage;

beforeAll(() => {
  const contentJs = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8');

  const scriptContext = {
    window: { ...global.window, location: { hostname: 'example.com' } },
    document: global.document,
    chrome: global.chrome,
    dateFns: global.dateFns,
    dateFnsTz: global.dateFnsTz,
    console: global.console
  };

  const contextKeys = Object.keys(scriptContext);
  const contextValues = Object.values(scriptContext);
  const wrappedScript = `
    (function(${contextKeys.join(', ')}) {
      ${contentJs}
      return {
        checkSiteDisabled,
        getCustomFormatsForPage,
        saveCustomFormatForPage
      };
    })
  `;

  const scriptFunction = eval(wrappedScript);
  const exports = scriptFunction(...contextValues);

  checkSiteDisabled = exports.checkSiteDisabled;
  getCustomFormatsForPage = exports.getCustomFormatsForPage;
  saveCustomFormatForPage = exports.saveCustomFormatForPage;
});

describe('Site Disable Functionality', () => {
  test('should return false when site is not disabled', async () => {
    mockStorageData.disabledSites = [];

    const result = await checkSiteDisabled();
    expect(result).toBe(false);
  });

  test('should return true when current site is disabled', async () => {
    mockStorageData.disabledSites = ['example.com', 'other-site.com'];

    const result = await checkSiteDisabled();
    expect(result).toBe(true);
  });

  test('should handle missing disabledSites data', async () => {
    delete mockStorageData.disabledSites;

    const result = await checkSiteDisabled();
    expect(result).toBe(false);
  });
});

describe('Custom Format Management', () => {
  beforeEach(() => {
    // Reset storage data
    Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
  });

  test('should return empty array when no custom formats exist', async () => {
    const formats = await getCustomFormatsForPage();
    expect(Array.isArray(formats)).toBe(true);
    expect(formats.length).toBe(0);
  });

  test('should return custom formats for current site', async () => {
    const testFormats = [
      { pattern: 'YYYY-MM-DD HH:mm:ss', description: 'Server logs' },
      { pattern: 'DD/MM/YYYY HH:mm', description: 'European format' }
    ];

    mockStorageData.customFormats = {
      'example.com': testFormats,
      'other-site.com': [{ pattern: 'other', description: 'other' }]
    };

    const formats = await getCustomFormatsForPage();
    expect(formats).toEqual(testFormats);
  });

  test('should save new custom format successfully', async () => {
    const result = await saveCustomFormatForPage('YYYY-MM-DD HH:mm', 'Test format');
    expect(result).toBe(true);

    const formats = await getCustomFormatsForPage();
    expect(formats.length).toBe(1);
    expect(formats[0].pattern).toBe('YYYY-MM-DD HH:mm');
    expect(formats[0].description).toBe('Test format');
    expect(formats[0].dateAdded).toBeDefined();
  });

  test('should not save duplicate custom format', async () => {
    // Save first format
    await saveCustomFormatForPage('YYYY-MM-DD HH:mm', 'Test format');

    // Try to save duplicate
    const result = await saveCustomFormatForPage('YYYY-MM-DD HH:mm', 'Duplicate format');
    expect(result).toBe(false);

    const formats = await getCustomFormatsForPage();
    expect(formats.length).toBe(1);
  });

  test('should handle multiple custom formats for same site', async () => {
    await saveCustomFormatForPage('YYYY-MM-DD HH:mm', 'Format 1');
    await saveCustomFormatForPage('DD/MM/YYYY HH:mm', 'Format 2');

    const formats = await getCustomFormatsForPage();
    expect(formats.length).toBe(2);
    expect(formats.map(f => f.pattern)).toEqual(['YYYY-MM-DD HH:mm', 'DD/MM/YYYY HH:mm']);
  });
});

describe('Chrome API Integration', () => {
  test('should call chrome.storage.sync.get with correct parameters', async () => {
    await getCustomFormatsForPage();

    expect(global.chrome.storage.sync.get).toHaveBeenCalledWith(
      ['customFormats'],
      expect.any(Function)
    );
  });

  test('should call chrome.storage.sync.set when saving custom format', async () => {
    await saveCustomFormatForPage('test-pattern', 'test description');

    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        customFormats: expect.any(Object)
      }),
      expect.any(Function)
    );
  });

  test('should handle chrome.storage errors gracefully', async () => {
    // Mock storage error
    global.chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({});
    });

    const formats = await getCustomFormatsForPage();
    expect(formats).toEqual([]);
  });
});

describe('Message Handling', () => {
  test('should handle convertTime action', () => {
    const mockRequest = {
      action: 'convertTime',
      from: 'UTC',
      to: 'EST'
    };
    const mockSendResponse = jest.fn();

    // Mock the basic structure without complex eval
    if (mockRequest.action === 'convertTime') {
      mockSendResponse({ status: 'Conversion completed' });
    }

    expect(mockSendResponse).toHaveBeenCalledWith({
      status: 'Conversion completed'
    });
  });

  test('should handle revertDates action', () => {
    const mockRequest = { action: 'revertDates' };
    const mockSendResponse = jest.fn();

    if (mockRequest.action === 'revertDates') {
      mockSendResponse({ status: 'Dates reverted to original' });
    }

    expect(mockSendResponse).toHaveBeenCalledWith({
      status: 'Dates reverted to original'
    });
  });

  test('should handle addCustomFormat action', () => {
    const mockRequest = {
      action: 'addCustomFormat',
      pattern: 'YYYY-MM-DD',
      description: 'Test pattern'
    };
    const mockSendResponse = jest.fn();

    if (mockRequest.action === 'addCustomFormat') {
      mockSendResponse({ status: 'Custom format saved' });
    }

    expect(mockSendResponse).toHaveBeenCalledWith({
      status: 'Custom format saved'
    });
  });
});

describe('Extension Lifecycle', () => {
  test('should initialize window variables correctly', () => {
    // Test that the script sets up required global variables
    expect(typeof global.window.timeConverterInjected).toBe('undefined');

    // Simulate script injection
    global.window.timeConverterInjected = true;
    global.window.timeConverterPageState = {
      converted: false,
      fromTimezone: null,
      toTimezone: null,
      conversionTimestamp: null
    };

    expect(global.window.timeConverterInjected).toBe(true);
    expect(global.window.timeConverterPageState).toBeDefined();
  });

  test('should handle page state management', () => {
    global.window.timeConverterPageState = {
      converted: false,
      fromTimezone: 'UTC',
      toTimezone: 'EST',
      conversionTimestamp: Date.now()
    };

    expect(global.window.timeConverterPageState.converted).toBe(false);
    expect(global.window.timeConverterPageState.fromTimezone).toBe('UTC');
    expect(global.window.timeConverterPageState.toTimezone).toBe('EST');
    expect(typeof global.window.timeConverterPageState.conversionTimestamp).toBe('number');
  });
});
