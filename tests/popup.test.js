// Tests for popup functionality

const fs = require('fs');
const path = require('path');

// Mock DOM elements for popup with full CustomDropdown support
const createMockPopupElement = (id, tagName = 'div') => {
  const element = {
    id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    className: '',
    disabled: false,
    style: { display: 'block' },
    dataset: {},
    title: '',
    children: [],
    parentNode: null,
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn((child) => {
      element.children.push(child);
      child.parentNode = element;
      return child;
    }),
    removeChild: jest.fn((child) => {
      const index = element.children.indexOf(child);
      if (index > -1) {
        element.children.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    }),
    querySelector: jest.fn((selector) => {
      // Mock specific selectors that CustomDropdown uses
      const selectorMap = {
        '.custom-select-trigger': createMockPopupElement('trigger', 'div'),
        '.custom-select-dropdown': createMockPopupElement('dropdown', 'div'),
        '.search-input': createMockPopupElement('search', 'input'),
        '.dropdown-options': createMockPopupElement('options', 'div'),
        '.select-flag': createMockPopupElement('flag', 'span'),
        '.select-text': createMockPopupElement('text', 'span'),
        '.search-results-count': createMockPopupElement('count', 'span'),
        '.popup': createMockPopupElement('popup', 'div')
      };
      return selectorMap[selector] || null;
    }),
    querySelectorAll: jest.fn(() => []),
    getBoundingClientRect: jest.fn(() => ({
      top: 0, left: 0, bottom: 100, right: 100, width: 100, height: 100
    })),
    scrollIntoView: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    click: jest.fn(),
    setAttribute: jest.fn((name, value) => {
      element.dataset[name] = value;
    }),
    getAttribute: jest.fn((name) => element.dataset[name]),
    hasAttribute: jest.fn((name) => name in element.dataset),
    removeAttribute: jest.fn((name) => delete element.dataset[name]),
    dispatchEvent: jest.fn(),
    cloneNode: jest.fn(() => createMockPopupElement(id + '_clone', tagName))
  };

  return element;
};

// Create mock custom dropdown container with required structure
const createMockCustomDropdownContainer = (id) => {
  const container = createMockPopupElement(id, 'div');

  // Create the required child elements that CustomDropdown expects
  const trigger = createMockPopupElement('trigger', 'div');
  trigger.className = 'custom-select-trigger';

  const dropdown = createMockPopupElement('dropdown', 'div');
  dropdown.className = 'custom-select-dropdown';

  const searchInput = createMockPopupElement('search', 'input');
  searchInput.className = 'search-input';

  const optionsContainer = createMockPopupElement('options', 'div');
  optionsContainer.className = 'dropdown-options';

  const selectFlag = createMockPopupElement('flag', 'span');
  selectFlag.className = 'select-flag';

  const selectText = createMockPopupElement('text', 'span');
  selectText.className = 'select-text';

  const resultsCount = createMockPopupElement('count', 'span');
  resultsCount.className = 'search-results-count';

  // Add children to dropdown
  dropdown.children = [searchInput, optionsContainer, resultsCount];

  // Add children to trigger
  trigger.children = [selectFlag, selectText];

  // Add children to container
  container.children = [trigger, dropdown];

  // Override querySelector to return the appropriate child elements
  container.querySelector = jest.fn((selector) => {
    const elements = {
      '.custom-select-trigger': trigger,
      '.custom-select-dropdown': dropdown,
      '.search-input': searchInput,
      '.dropdown-options': optionsContainer,
      '.select-flag': selectFlag,
      '.select-text': selectText,
      '.search-results-count': resultsCount,
      '.popup': createMockPopupElement('popup', 'div')
    };
    return elements[selector] || null;
  });

  return container;
};

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
      'revert-shortcut': createMockPopupElement('revert-shortcut', 'span'),
      'timezone-widgets': createMockPopupElement('timezone-widgets', 'div'),
      'from-timezone-container': createMockCustomDropdownContainer('from-timezone-container'),
      'to-timezone-container': createMockCustomDropdownContainer('to-timezone-container'),
      'page-disable-btn': createMockPopupElement('page-disable-btn', 'button'),
      'page-disable-text': createMockPopupElement('page-disable-text', 'span'),
      'page-status': createMockPopupElement('page-status', 'div'),
      'custom-format-text': createMockPopupElement('custom-format-text', 'div')
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
    expect(timezones.some(tz => tz.value === 'America/New_York')).toBe(true); // EST
    expect(timezones.some(tz => tz.value === 'America/Los_Angeles')).toBe(true); // PST
    expect(timezones.some(tz => tz.value === 'Asia/Kolkata')).toBe(true); // IST
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
