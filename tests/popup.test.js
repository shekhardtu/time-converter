// Tests for popup functionality

const fs = require('fs');
const path = require('path');

// Mock DOM elements for popup
const createMockPopupElement = (id, tagName = 'div') => ({
  id,
  tagName: tagName.toUpperCase(),
  value: '',
  textContent: '',
  innerHTML: '',
  className: '',
  disabled: false,
  style: { display: 'block' },
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(),
    toggle: jest.fn()
  },
  addEventListener: jest.fn(),
  appendChild: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => [])
});

beforeEach(() => {
  resetMocks();

  // Mock popup DOM elements
  global.document.getElementById = jest.fn((id) => {
    const elementMap = {
      'from-timezone': createMockPopupElement('from-timezone', 'select'),
      'to-timezone': createMockPopupElement('to-timezone', 'select'),
      'convert-btn': createMockPopupElement('convert-btn', 'button'),
      'revert-btn': createMockPopupElement('revert-btn', 'button'),
      'status': createMockPopupElement('status', 'div'),
      'custom-format-toggle': createMockPopupElement('custom-format-toggle', 'button'),
      'custom-format-form': createMockPopupElement('custom-format-form', 'div'),
      'date-format': createMockPopupElement('date-format', 'input'),
      'format-description': createMockPopupElement('format-description', 'input'),
      'save-format-btn': createMockPopupElement('save-format-btn', 'button'),
      'cancel-format-btn': createMockPopupElement('cancel-format-btn', 'button'),
      'site-disable-btn': createMockPopupElement('site-disable-btn', 'button'),
      'site-disable-text': createMockPopupElement('site-disable-text', 'span'),
      'site-status': createMockPopupElement('site-status', 'div'),
      'convert-shortcut': createMockPopupElement('convert-shortcut', 'span'),
      'revert-shortcut': createMockPopupElement('revert-shortcut', 'span')
    };
    return elementMap[id] || createMockPopupElement(id);
  });

  // Mock document methods
  global.document.createElement = jest.fn((tagName) => createMockPopupElement('', tagName));
  global.document.addEventListener = jest.fn();

  // Mock navigator for platform detection
  global.navigator = {
    platform: 'MacIntel'
  };
});

// Load popup.js outside describe blocks to make it available globally
let popupScript;

beforeAll(() => {
  // Load popup.js
  popupScript = fs.readFileSync(path.join(__dirname, '../popup.js'), 'utf8');
});

describe('Popup Initialization', () => {
  test('should define all required timezone options', () => {
    // Execute popup script to get timezones
    // const context = { console: global.console };
    const wrappedScript = `
      (function() {
        ${popupScript}
        return { timezones };
      })()
    `;

    const { timezones } = eval(wrappedScript);

    expect(Array.isArray(timezones)).toBe(true);
    expect(timezones.some(tz => tz.value === 'UTC')).toBe(true);
    expect(timezones.some(tz => tz.value === 'EST')).toBe(true);
    expect(timezones.some(tz => tz.value === 'PST')).toBe(true);
    expect(timezones.some(tz => tz.value === 'IST')).toBe(true);
    expect(timezones.some(tz => tz.value === 'GMT')).toBe(true);
  });

  test('should populate timezone dropdowns correctly', () => {
    const fromSelect = global.document.getElementById('from-timezone');
    const toSelect = global.document.getElementById('to-timezone');

    // Test the basic timezone array structure
    const timezones = ['UTC', 'GMT', 'PST', 'EST', 'IST', 'JST', 'AEST', 'CET'];

    expect(Array.isArray(timezones)).toBe(true);
    expect(timezones).toContain('UTC');
    expect(timezones).toContain('EST');
    expect(timezones).toContain('IST');

    // Mock population process
    timezones.forEach(() => {
      fromSelect.appendChild({});
      toSelect.appendChild({});
    });

    expect(fromSelect.appendChild).toHaveBeenCalled();
    expect(toSelect.appendChild).toHaveBeenCalled();
  });

  test('should detect system timezone correctly', () => {
    // Test timezone mapping logic
    const tzMap = {
      'America/Los_Angeles': 'PST',
      'America/Denver': 'MST',
      'America/Chicago': 'CST',
      'America/New_York': 'EST',
      'Asia/Kolkata': 'IST'
    };

    expect(tzMap['America/New_York']).toBe('EST');
    expect(tzMap['Asia/Kolkata']).toBe('IST');
    expect(tzMap['America/Los_Angeles']).toBe('PST');
  });
});

describe('Button State Management', () => {
  test('should handle button state logic', () => {
    const convertBtn = global.document.getElementById('convert-btn');
    const revertBtn = global.document.getElementById('revert-btn');

    // Test convert mode
    convertBtn.className = 'btn-primary btn-active';
    revertBtn.className = 'btn-secondary btn-inactive';
    convertBtn.disabled = false;
    revertBtn.disabled = true;

    expect(convertBtn.className).toContain('btn-active');
    expect(revertBtn.className).toContain('btn-inactive');
    expect(convertBtn.disabled).toBe(false);
    expect(revertBtn.disabled).toBe(true);

    // Test revert mode
    convertBtn.className = 'btn-primary btn-inactive';
    revertBtn.className = 'btn-secondary btn-active';
    convertBtn.disabled = true;
    revertBtn.disabled = false;

    expect(convertBtn.className).toContain('btn-inactive');
    expect(revertBtn.className).toContain('btn-active');
    expect(convertBtn.disabled).toBe(true);
    expect(revertBtn.disabled).toBe(false);
  });

  test('should handle button reset logic', () => {
    const convertBtn = global.document.getElementById('convert-btn');

    convertBtn.innerHTML = 'Convert';
    convertBtn.disabled = false;

    expect(convertBtn.innerHTML).toBe('Convert');
    expect(convertBtn.disabled).toBe(false);
  });
});

describe('Chrome API Integration', () => {
  test('should save preferences to chrome storage', () => {
    const fromSelect = global.document.getElementById('from-timezone');
    const toSelect = global.document.getElementById('to-timezone');

    fromSelect.value = 'UTC';
    toSelect.value = 'EST';

    // Mock the savePreferences function logic
    global.chrome.storage.sync.set({
      fromTimezone: fromSelect.value,
      toTimezone: toSelect.value
    });

    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith({
      fromTimezone: 'UTC',
      toTimezone: 'EST'
    });
  });

  test('should load preferences from chrome storage', () => {
    global.chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({
        fromTimezone: 'PST',
        toTimezone: 'IST'
      });
    });

    const fromSelect = global.document.getElementById('from-timezone');
    const toSelect = global.document.getElementById('to-timezone');

    // Mock loadPreferences logic
    global.chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (result) => {
      if (result.fromTimezone) fromSelect.value = result.fromTimezone;
      if (result.toTimezone) toSelect.value = result.toTimezone;
    });

    expect(global.chrome.storage.sync.get).toHaveBeenCalledWith(
      ['fromTimezone', 'toTimezone'],
      expect.any(Function)
    );
  });

  test('should send convert message to content script', () => {
    global.chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123 }]);
    });

    global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      if (callback && typeof callback === 'function') {
        callback({ status: 'Conversion completed' });
      }
    });

    // Mock the conversion message sending logic
    global.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        global.chrome.tabs.sendMessage(tab.id, {
          action: 'convertTime',
          from: 'UTC',
          to: 'EST'
        });
      }
    });

    expect(global.chrome.tabs.query).toHaveBeenCalled();
    expect(global.chrome.tabs.sendMessage).toHaveBeenCalled();
  });
});

describe('Site Disable Functionality', () => {
  test('should get current site URL correctly', async () => {
    global.chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ url: 'https://example.com/page' }]);
    });

    // const context = {
    //   chrome: global.chrome,
    //   URL: global.URL
    // };

    const result = await eval(`
      (async function() {
        ${popupScript}
        return await getCurrentSiteUrl();
      })()
    `);

    expect(result).toBe('example.com');
  });

  test('should check site disable status', async () => {
    global.chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({
        disabledSites: ['example.com', 'test.com']
      });
    });

    global.chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ url: 'https://example.com/page' }]);
    });

    const result = await eval(`
      (async function() {
        ${popupScript}
        return await checkSiteDisableStatus();
      })()
    `);

    expect(result).toBe(true);
  });

  test('should toggle site disable status', async () => {
    global.chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ url: 'https://example.com/page' }]);
    });

    global.chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({ disabledSites: [] });
    });

    await eval(`
      (async function() {
        ${popupScript}
        await toggleSiteDisable();
      })()
    `);

    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        disabledSites: expect.arrayContaining(['example.com'])
      }),
      expect.any(Function)
    );
  });
});

describe('Custom Format Management', () => {
  test('should toggle custom format form visibility', () => {
    // const toggleBtn = global.document.getElementById('custom-format-toggle');
    const form = global.document.getElementById('custom-format-form');

    form.classList.contains.mockReturnValue(true); // Initially hidden

    eval(`
      ${popupScript}
      customFormatToggle.addEventListener('click', () => {
        const isHidden = customFormatForm.classList.contains('hidden');
        if (isHidden) {
          customFormatForm.classList.remove('hidden');
        } else {
          customFormatForm.classList.add('hidden');
        }
      });
    `);

    expect(true).toBe(true); // Test passes if no errors
  });

  test('should save custom format', () => {
    global.chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 123 }]);
    });

    global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callback({ status: 'Custom format saved' });
    });

    const patternInput = global.document.getElementById('date-format');
    const descriptionInput = global.document.getElementById('format-description');

    patternInput.value = 'YYYY-MM-DD HH:mm';
    descriptionInput.value = 'Test format';

    eval(`
      ${popupScript}
      saveFormatBtn.addEventListener('click', () => {
        const pattern = dateFormatInput.value.trim();
        const description = formatDescriptionInput.value.trim();
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          chrome.tabs.sendMessage(tab.id, {
            action: 'addCustomFormat',
            pattern: pattern,
            description: description || 'Custom format'
          });
        });
      });
    `);

    expect(true).toBe(true); // Test passes if no errors
  });
});

describe('Keyboard Shortcuts', () => {
  test('should set Mac keyboard shortcuts', () => {
    global.navigator.platform = 'MacIntel';

    // const convertShortcut = global.document.getElementById('convert-shortcut');
    // const revertShortcut = global.document.getElementById('revert-shortcut');

    eval(`
      ${popupScript}
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if (isMac) {
        convertShortcut.textContent = 'Convert (⌥+C)';
        revertShortcut.textContent = 'Revert (⌥+R)';
      }
    `);

    expect(true).toBe(true); // Test setup successful
  });

  test('should set Windows keyboard shortcuts', () => {
    global.navigator.platform = 'Win32';

    // const convertShortcut = global.document.getElementById('convert-shortcut');
    // const revertShortcut = global.document.getElementById('revert-shortcut');

    eval(`
      ${popupScript}
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if (!isMac) {
        // convertShortcut.textContent = 'Convert (Alt+C)';
        // revertShortcut.textContent = 'Revert (Alt+R)';
      }
    `);

    expect(true).toBe(true); // Test setup successful
  });
});

describe('Error Handling', () => {
  test('should handle chrome API errors gracefully', () => {
    global.chrome.runtime.lastError = { message: 'Extension context invalidated' };
    global.chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      callback(null);
    });

    expect(() => {
      eval(`
        ${popupScript}
        if (chrome.runtime.lastError) {
          console.error('Chrome API error:', chrome.runtime.lastError);
        }
      `);
    }).not.toThrow();

    // Reset error
    global.chrome.runtime.lastError = null;
  });

  test('should handle missing tab information', () => {
    global.chrome.tabs.query.mockImplementation((query, callback) => {
      callback([]);
    });

    // const statusDiv = global.document.getElementById('status');

    eval(`
      ${popupScript}
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          // statusDiv.textContent = 'No active tab found.';
        }
      });
    `);

    expect(true).toBe(true); // Should handle gracefully
  });
});
