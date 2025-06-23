/**
 * Time Converter Chrome Extension - Popup Script
 * Enterprise-ready timezone conversion and widget management
 *
 * @author Time Converter Extension
 * @version 1.0.0
 * @license MIT
 */

'use strict';

/* global getAllTimezones, CustomDropdown, TimeCalculator */

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================



/**
 * Default timezone configuration for widgets
 * @type {Array<string>}
 */
const DEFAULT_WIDGET_TIMEZONES = ['UTC', 'Auto', 'EET'];

/**
 * Update interval for timezone widgets (milliseconds)
 * @type {number}
 */
const WIDGET_UPDATE_INTERVAL = 1000;

// =============================================================================
// DOM ELEMENT REFERENCES
// =============================================================================

const elements = {
  // Main form elements
  fromTimezoneSelect: document.getElementById('from-timezone'),
  toTimezoneSelect: document.getElementById('to-timezone'),
  convertBtn: document.getElementById('convert-btn'),
  revertBtn: document.getElementById('revert-btn'),

  // Footer and widgets
  footerDiv: document.querySelector('.popup-footer'),
  timezoneWidgetsContainer: document.getElementById('timezone-widgets'),

  // Custom format form
  customFormatToggle: document.getElementById('custom-format-toggle'),
  customFormatForm: document.getElementById('custom-format-form'),
  dateFormatInput: document.getElementById('date-format'),
  formatDescriptionInput: document.getElementById('format-description'),
  saveFormatBtn: document.getElementById('save-format-btn'),
  cancelFormatBtn: document.getElementById('cancel-format-btn'),

  // Site/page controls
  siteDisableBtn: document.getElementById('site-disable-btn'),
  siteDisableText: document.getElementById('site-disable-text'),
  siteStatus: document.getElementById('site-status'),
  pageDisableBtn: document.getElementById('page-disable-btn'),
  pageDisableText: document.getElementById('page-disable-text'),
  pageStatus: document.getElementById('page-status'),
  customFormatText: document.getElementById('custom-format-text')
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

let timeUpdateInterval = null;
let statusTimeout = null;
let isShowingStatus = false;

// =============================================================================
// STATUS AND UI MANAGEMENT
// =============================================================================

/**
 * Shows status message in footer with auto-revert
 * @param {string} message - Status message to display
 * @param {string} type - Status type ('info', 'success', 'error')
 * @param {number} duration - Display duration in milliseconds
 * @param {Function} clickHandler - Optional click handler
 */
function showStatus(message, type = 'info', duration = 3000, clickHandler = null) {
  if (!elements.footerDiv) return;

  // Clear existing timeout
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }

  // Update footer appearance
  elements.footerDiv.className = 'popup-footer';
  if (type === 'success') {
    elements.footerDiv.classList.add('status-success');
  } else if (type === 'error') {
    elements.footerDiv.classList.add('status-error');
  } else {
    elements.footerDiv.classList.add('status-mode');
  }

  if (clickHandler) {
    elements.footerDiv.classList.add('status-clickable');
    elements.footerDiv.style.cursor = 'pointer';
    elements.footerDiv.onclick = clickHandler;
  } else {
    elements.footerDiv.onclick = null;
    elements.footerDiv.style.cursor = 'default';
  }

  // Show status message with proper structure (XSS-safe)
  elements.footerDiv.classList.add('showing-status');
  const statusDiv = document.createElement('div');
  statusDiv.className = 'status-message';
  statusDiv.textContent = message; // Use textContent to prevent XSS
  elements.footerDiv.innerHTML = '';
  elements.footerDiv.appendChild(statusDiv);
  isShowingStatus = true;

  // Auto-revert to time display
  statusTimeout = setTimeout(() => {
    revertToTimeDisplay();
  }, duration);
}

/**
 * Reverts footer back to time display
 */
function revertToTimeDisplay() {
  if (!elements.footerDiv) return;

  elements.footerDiv.className = 'popup-footer';
  elements.footerDiv.classList.remove('showing-status');
  elements.footerDiv.onclick = null;
  elements.footerDiv.style.cursor = 'default';
  isShowingStatus = false;

  // Show timezone widgets again
  elements.footerDiv.innerHTML = '<div id="timezone-widgets" class="timezone-widgets"></div>';
  elements.timezoneWidgetsContainer = document.getElementById('timezone-widgets');
  renderTimezoneWidgets();
}

/**
 * Sets button states for convert/revert mode
 * @param {boolean} convertActive - Whether convert mode is active
 */
function setButtonStates(convertActive = true) {
  console.log('setButtonStates called with convertActive:', convertActive);

  if (!elements.convertBtn || !elements.revertBtn) {
    console.log('Button elements not found!');
    return;
  }

  if (convertActive) {
    console.log('Setting CONVERT mode (Convert enabled, Revert disabled)');
    elements.convertBtn.className = 'btn-primary btn-active';
    elements.revertBtn.className = 'btn-secondary btn-inactive';
    elements.convertBtn.disabled = false;
    elements.revertBtn.disabled = true;
    const convertText = document.getElementById('convert-text');
    if (convertText) convertText.textContent = 'Convert';
  } else {
    console.log('Setting REVERT mode (Convert disabled, Revert enabled)');
    elements.convertBtn.className = 'btn-primary btn-inactive';
    elements.revertBtn.className = 'btn-secondary btn-active';
    elements.convertBtn.disabled = true;
    elements.revertBtn.disabled = false;
  }

  console.log('Button states set - Convert:', !elements.convertBtn.disabled, 'Revert:', !elements.revertBtn.disabled);
}

/**
 * Resets convert button to default state
 * @param {string} text - Button text
 * @param {boolean} disabled - Whether button is disabled
 */
function resetButton(text = 'Convert', disabled = false) {
  const convertText = document.getElementById('convert-text');
  if (convertText) convertText.textContent = text;
  if (elements.convertBtn) elements.convertBtn.disabled = disabled;

  // Clear any timeout that might interfere
  if (window.convertTimeout) {
    clearTimeout(window.convertTimeout);
    window.convertTimeout = null;
  }
}

/**
 * Handles conversion response from content script
 * @param {Object} response - Response from content script
 */
function handleConversionResponse(response) {
  console.log('Handling conversion response:', response);

  // Clear any existing timeout
  if (window.convertTimeout) {
    clearTimeout(window.convertTimeout);
    window.convertTimeout = null;
  }

  // Reset button text and state
  resetButton('Convert', false);

  let statusType = 'info';
  if (response.status.includes('Converted') || response.status.includes('Already converted')) {
    statusType = 'success';
    setButtonStates(false); // Switch to revert mode
  } else if (response.status.includes('No dates found')) {
    statusType = 'info';
    setButtonStates(true);
  } else if (response.status.includes('Error')) {
    statusType = 'error';
    setButtonStates(true);
  } else {
    statusType = 'info';
    setButtonStates(true);
  }

  showStatus(response.status, statusType);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Detects the user's system timezone and maps it to supported timezone codes
 * @returns {string} Detected timezone code or 'UTC' as fallback
 */
function getSystemTimezone() {
  try {
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Map common IANA timezones to our abbreviated list
    const timezoneMap = {
      'America/Los_Angeles': 'PST',
      'America/Denver': 'MST',
      'America/Chicago': 'CST',
      'America/New_York': 'EST',
      'Asia/Kolkata': 'IST',
      'Australia/Sydney': 'AEST',
      'Asia/Tokyo': 'JST',
      'Europe/Paris': 'CET',
      'GMT': 'GMT',
      'Europe/Berlin': 'CET',
      'Asia/Shanghai': 'CST_CHINA',
      'America/Toronto': 'EST',
      'America/Vancouver': 'PST'
    };

    return timezoneMap[systemTz] || 'UTC';
  } catch (error) {
    console.warn('Failed to detect system timezone:', error.message);
    return 'UTC';
  }
}

/**
 * Gets timezone flag emoji for a given timezone code
 * @param {string} tzCode - Timezone code (e.g., 'UTC', 'PST')
 * @returns {string} Flag emoji or default globe emoji
 */
function getTimezoneFlag(tzCode) {
  // Try enhanced timezone data first
  if (window.enhancedTimezones) {
    const enhancedTz = window.enhancedTimezones.find(tz => tz.value === tzCode);
    if (enhancedTz?.flag) {
      return enhancedTz.flag;
    }
  }

  // Try getAllTimezones data
  if (typeof getAllTimezones === 'function') {
    const allTz = getAllTimezones();
    const tzData = allTz.find(tz => tz.value === tzCode);
    if (tzData?.flag) {
      return tzData.flag;
    }
  }

  // Fallback to globe emoji
  return '🌐';
}

/**
 * Safely executes a function with error handling
 * @param {Function} fn - Function to execute
 * @param {string} context - Context description for error logging
 */
function safeExecute(fn, context = 'operation') {
  try {
    return fn();
  } catch (error) {
    console.error(`Error in ${context}:`, error.message);
    return null;
  }
}

// =============================================================================
// TIMEZONE WIDGET MANAGEMENT
// =============================================================================

/**
 * Renders timezone widgets in the footer
 * Loads timezone configuration from Chrome storage and creates interactive widgets
 */
function renderTimezoneWidgets() {
  if (!elements.timezoneWidgetsContainer) return;

  // Aggressively clear any existing intervals
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }

  // Clear any intervals that might be referenced globally
  if (window.timeUpdateInterval) {
    clearInterval(window.timeUpdateInterval);
    window.timeUpdateInterval = null;
  }

  chrome.storage.sync.get(['widgetTimezones'], (data) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to load widget timezones:', chrome.runtime.lastError.message);
      return;
    }

    const tzList = Array.isArray(data.widgetTimezones) && data.widgetTimezones.length
      ? data.widgetTimezones
      : getDefaultWidgetTimezones();

    console.log('Rendering widgets for timezones:', tzList);

    // Completely clear and rebuild the container
    elements.timezoneWidgetsContainer.innerHTML = '';
    elements.timezoneWidgetsContainer.style.display = 'flex';

    tzList.forEach((tz, index) => {
      const widget = createTimezoneWidget(tz, index);
      elements.timezoneWidgetsContainer.appendChild(widget);
    });

    // Force a complete re-render with proper timing
    setTimeout(() => {
      console.log('Starting timezone widget updates');
      updateTimezoneWidgetTimes(true);
    }, 200);
  });
}

/**
 * Creates a single timezone widget element
 * @param {string} timezone - Timezone code
 * @param {number} index - Widget index
 * @returns {HTMLElement} Widget DOM element
 */
function createTimezoneWidget(timezone, index) {
  const widget = document.createElement('div');
  widget.className = 'tz-widget';
  widget.title = 'Click to change timezone';
  widget.dataset.index = index.toString();
  widget.dataset.tz = timezone;

  widget.innerHTML = `
    <div class="tz-time" id="tz-time-${index}"></div>
    <div class="tz-label">${timezone}</div>
  `;

  widget.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openTimezoneSelector(index, timezone);
  });

  return widget;
}

/**
 * Updates time display for all timezone widgets using the exact layout from screenshot
 * @param {boolean} fullUpdate - Whether to perform full update or seconds only
 */
function updateTimezoneWidgetTimes(fullUpdate = true) {
  if (!elements.timezoneWidgetsContainer) return;

  const widgets = elements.timezoneWidgetsContainer.querySelectorAll('.tz-widget');
  const now = new Date();

  widgets.forEach((widget, idx) => {
    const tz = widget.dataset.tz;

    // Use unified TimeCalculator for all timezone operations
    const timezoneInfo = TimeCalculator.getTimezoneInfo(tz);

    const timeStr = timezoneInfo.time;
    const offsetStr = timezoneInfo.offset;
    const dateStr = timezoneInfo.date;
    const secondsStr = now.getSeconds().toString().padStart(2, '0');

    const timeElem = widget.querySelector(`#tz-time-${idx}`);

    if (timeElem) {
      // For full updates, handle the date line and rebuild the time elements
      if (fullUpdate) {
        // First get or create the date-flag line (row 1)
        let dateLineElem = widget.querySelector('.tz-date-line');
        if (!dateLineElem) {
          // Create date-flag container
          dateLineElem = document.createElement('div');
          dateLineElem.className = 'tz-date-line';

          // Flag part
          const flagSpan = document.createElement('span');
          flagSpan.className = 'tz-flag';
          flagSpan.textContent = getTimezoneFlag(tz);
          dateLineElem.appendChild(flagSpan);

          // Date part
          const dateSpan = document.createElement('span');
          dateSpan.className = 'tz-date';
          dateLineElem.appendChild(dateSpan);

          // Insert at top of widget
          widget.insertBefore(dateLineElem, widget.firstChild);
        }

        // Update the date text
        const dateSpan = dateLineElem.querySelector('.tz-date');
        if (dateSpan) dateSpan.textContent = dateStr;

        // If we need to build/rebuild the time row
        let timeRow = timeElem.querySelector('.tz-time-row');
        if (!timeRow) {
          // Clear the time element first
          timeElem.innerHTML = '';

          // Create a single time row with all time elements
          timeRow = document.createElement('div');
          timeRow.className = 'tz-time-row';

          // Time part (HH:MM) with emphasis
          const timeSpan = document.createElement('span');
          timeSpan.className = 'tz-time-main';
          timeSpan.textContent = timeStr;
          timeRow.appendChild(timeSpan);

          // Seconds part
          const secondsSpan = document.createElement('span');
          secondsSpan.className = 'tz-time-seconds';
          secondsSpan.textContent = `:${secondsStr}`;
          timeRow.appendChild(secondsSpan);

          // Offset part
          const offsetSpan = document.createElement('span');
          offsetSpan.className = 'tz-offset';
          offsetSpan.textContent = offsetStr;
          timeRow.appendChild(offsetSpan);

          timeElem.appendChild(timeRow);
        } else {
          // Just update the values of existing elements
          const timeSpan = timeRow.querySelector('.tz-time-main');
          if (timeSpan) timeSpan.textContent = timeStr;

          const secondsSpan = timeRow.querySelector('.tz-time-seconds');
          if (secondsSpan) secondsSpan.textContent = `:${secondsStr}`;

          const offsetSpan = timeRow.querySelector('.tz-offset');
          if (offsetSpan) offsetSpan.textContent = offsetStr;
        }
      } else {
        // For partial updates, only update the seconds
        const timeRow = timeElem.querySelector('.tz-time-row');
        if (timeRow) {
          const secondsSpan = timeRow.querySelector('.tz-time-seconds');
          if (secondsSpan) secondsSpan.textContent = `:${secondsStr}`;
        }
      }
    }
  });

  // Ensure continuous updates for seconds
  if (!timeUpdateInterval && fullUpdate) {
    timeUpdateInterval = setInterval(() => {
      updateTimezoneWidgetTimes(false); // Only update seconds for better performance
    }, 1000); // Update every second
  }
}

/**
 * Gets timezone offset string for display
 * @param {string} ianaTimezone - IANA timezone identifier
 * @returns {string} Formatted offset string (e.g., "+05:30")
 */
function getTimezoneOffset(ianaTimezone) {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const target = new Date(utc.toLocaleString('en-US', { timeZone: ianaTimezone }));
    const offset = (target.getTime() - utc.getTime()) / (1000 * 60);

    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';

    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    return '+00:00';
  }
}

/**
 * Gets default widget timezones with system timezone detection
 * @returns {Array<string>} Array of timezone codes
 */
function getDefaultWidgetTimezones() {
  const systemTz = getSystemTimezone();
  return ['UTC', systemTz === 'UTC' ? 'GMT' : systemTz, 'EET'];
}

// =============================================================================
// TIMEZONE SELECTOR DROPDOWN
// =============================================================================

/**
 * Opens timezone selector dropdown for a specific widget
 * @param {number} index - Widget index
 * @param {string} currentTz - Current timezone code
 */
function openTimezoneSelector(index, currentTz) {
  // Close any existing dropdowns
  closeAllTimezoneDropdowns();

  // Get available timezones
  const availableTimezones = getAvailableTimezones();

  // Hide widgets but maintain layout
  hideAllWidgets();

  // Create and show dropdown
  createTimezoneDropdown(index, currentTz, availableTimezones);
}

/**
 * Gets available timezone data from various sources
 * @returns {Array<Object>} Array of timezone objects
 */
function getAvailableTimezones() {
  // Try enhanced timezone data first
  if (window.enhancedTimezones?.length > 0) {
    return window.enhancedTimezones;
  }

  // Try direct function call
  if (typeof getAllTimezones === 'function') {
    return getAllTimezones();
  }

  // Fallback - should not reach here with all-timezones.js loaded
  console.warn('getAllTimezones() not available, returning empty array');
  return [];
}

/**
 * Creates and displays timezone dropdown
 * @param {number} index - Widget index
 * @param {string} currentTz - Current timezone
 * @param {Array<Object>} availableTimezones - Available timezone options
 */
function createTimezoneDropdown(index, currentTz, availableTimezones) {
  const dropdown = new TimezoneDropdown(index, currentTz, availableTimezones);
  dropdown.show();
}

/**
 * Hides all timezone widgets with smooth transition
 */
function hideAllWidgets() {
  const widgets = elements.timezoneWidgetsContainer.querySelectorAll('.tz-widget');
  widgets.forEach(widget => {
    widget.classList.add('hidden');
    widget.classList.remove('restoring');
  });
}

/**
 * Shows all timezone widgets with smooth restoration animation
 */
function showAllWidgets() {
  const widgets = elements.timezoneWidgetsContainer.querySelectorAll('.tz-widget');
  widgets.forEach((widget, index) => {
    widget.classList.remove('hidden');
    widget.classList.add('restoring');

    // Stagger the animation for a nice effect
    setTimeout(() => {
      widget.classList.remove('restoring');
    }, 400 + (index * 100));
  });
}

/**
 * Closes all timezone dropdown instances
 */
function closeAllTimezoneDropdowns() {
  const existingDropdowns = document.querySelectorAll('.tz-widget-centered-dropdown');
  existingDropdowns.forEach(dropdown => {
    if (dropdown._globalHandler) {
      document.removeEventListener('click', dropdown._globalHandler, true);
    }
    dropdown.remove();
  });
}

/**
 * Restores all widgets to visible state and cleans up dropdowns
 */
function restoreAllWidgets() {
  closeAllTimezoneDropdowns();
  showAllWidgets();
}

// =============================================================================
// TIMEZONE DROPDOWN CLASS
// =============================================================================

/**
 * Standalone timezone dropdown component
 */
class TimezoneDropdown {
  /**
   * Creates a new timezone dropdown instance
   * @param {number} index - Widget index
   * @param {string} currentTz - Current timezone
   * @param {Array<Object>} timezones - Available timezones
   */
  constructor(index, currentTz, timezones) {
    this.index = index;
    this.currentTz = currentTz;
    this.timezones = timezones;
    this.filteredTimezones = [...timezones];
    this.isOpen = false;
    this.container = null;
    this.globalClickHandler = null;

    this.createElements();
    this.bindEvents();
  }

  /**
   * Creates dropdown DOM elements
   */
  createElements() {
    this.container = document.createElement('div');
    this.container.className = 'tz-widget-centered-dropdown';
    this.container.id = `tz-widget-dropdown-${this.index}`;

    const currentTzData = this.timezones.find(tz => tz.value === this.currentTz) || this.timezones[0];

    this.container.innerHTML = `
      <div class="custom-select-trigger">
        <div class="select-content">
          <span class="select-flag">${currentTzData.flag}</span>
          <div class="select-text">
            <div class="select-main">
              <div class="select-name">${currentTzData.name || currentTzData.label || this.currentTz}</div>
            </div>
            <div class="select-city">${currentTzData.city || ''}</div>
          </div>
        </div>
        <svg class="select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </div>
      <div class="custom-select-dropdown">
        <div class="dropdown-search">
          <div class="search-input-container">
            <input type="text" class="search-input" placeholder="Search timezones..." />
            <div class="search-results-count"></div>
          </div>
        </div>
        <div class="dropdown-options"></div>
      </div>
    `;

    // Cache element references
    this.trigger = this.container.querySelector('.custom-select-trigger');
    this.dropdown = this.container.querySelector('.custom-select-dropdown');
    this.searchInput = this.container.querySelector('.search-input');
    this.optionsContainer = this.container.querySelector('.dropdown-options');
    this.resultsCount = this.container.querySelector('.search-results-count');
  }

  /**
   * Binds event handlers
   */
  bindEvents() {
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open();
    });

    this.searchInput.addEventListener('input', (e) => {
      this.filterOptions(e.target.value);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    // Global click handler for outside clicks
    this.globalClickHandler = (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    };
  }

  /**
   * Shows the dropdown
   */
  show() {
    this.positionDropdown();
    document.body.appendChild(this.container);

    // Add global click handler after a delay
    setTimeout(() => {
      document.addEventListener('click', this.globalClickHandler, true);
      this.container._globalHandler = this.globalClickHandler;
    }, 100);

    // Auto-open dropdown
    setTimeout(() => this.open(), 50);
  }

  /**
   * Positions dropdown relative to widgets container
   */
  positionDropdown() {
    const widgetsRect = elements.timezoneWidgetsContainer.getBoundingClientRect();
    const centerX = widgetsRect.left + (widgetsRect.width / 2);
    const centerY = widgetsRect.top + (widgetsRect.height / 2);

    this.container.style.left = `${centerX - 160}px`; // 160 = half of 320px width
    this.container.style.top = `${centerY - 20}px`;
  }

  /**
   * Opens the dropdown
   */
  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.trigger.classList.add('active');
    this.dropdown.classList.add('open');
    this.searchInput.focus();
    this.populateOptions();
  }

  /**
   * Closes the dropdown and restores widgets
   */
  close() {
    restoreAllWidgets();
  }

  /**
   * Populates dropdown options
   */
  populateOptions() {
    this.optionsContainer.innerHTML = '';

    this.filteredTimezones.forEach((tz) => {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.innerHTML = `
        <span class="option-flag">${tz.flag}</span>
        <div class="option-content">
          <div class="option-header">
            <div class="option-name">${tz.name || tz.label || tz.value}</div>
          </div>
          <div class="option-details">
            <span class="option-city">${tz.city || ''}</span>
          </div>
        </div>
      `;

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectTimezone(tz.value);
      });

      this.optionsContainer.appendChild(option);
    });

    this.updateResultsCount();
  }

  /**
   * Filters dropdown options based on search query
   * @param {string} query - Search query
   */
  filterOptions(query) {
    const lowerQuery = query.toLowerCase();
    this.filteredTimezones = this.timezones.filter(tz =>
      (tz.name || tz.label || tz.value).toLowerCase().includes(lowerQuery) ||
      (tz.city || '').toLowerCase().includes(lowerQuery) ||
      tz.value.toLowerCase().includes(lowerQuery)
    );
    this.populateOptions();
  }

  /**
   * Updates search results count display
   */
  updateResultsCount() {
    if (this.resultsCount) {
      const filtered = this.filteredTimezones.length;
      const total = this.timezones.length;
      this.resultsCount.textContent = `${filtered}/${total} results`;
    }
  }

  /**
   * Selects a timezone and updates storage
   * @param {string} newTz - Selected timezone code
   */
  selectTimezone(newTz) {
    chrome.storage.sync.get(['widgetTimezones'], (data) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to load widget timezones for update:', chrome.runtime.lastError.message);
        return;
      }

      const tzList = Array.isArray(data.widgetTimezones) && data.widgetTimezones.length
        ? data.widgetTimezones
        : getDefaultWidgetTimezones();

      tzList[this.index] = newTz;

      chrome.storage.sync.set({ widgetTimezones: tzList }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to save widget timezone:', chrome.runtime.lastError.message);
          return;
        }

        restoreAllWidgets();
        renderTimezoneWidgets();
      });
    });
  }
}

// =============================================================================
// LIFECYCLE MANAGEMENT
// =============================================================================

// Visibility change handling is done later with the cleanup function

/**
 * Complete cleanup of all intervals and timers
 */
function cleanupTimezoneWidgets() {
  console.log('Cleaning up timezone widgets');

  // Clear all possible interval references
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }

  if (window.timeUpdateInterval) {
    clearInterval(window.timeUpdateInterval);
    window.timeUpdateInterval = null;
  }

  // Clear any dropdown intervals that might exist
  const dropdowns = document.querySelectorAll('.custom-dropdown');
  dropdowns.forEach(dropdown => {
    if (dropdown._customDropdownInstance) {
      const instance = dropdown._customDropdownInstance;
      if (instance.timeInterval) {
        clearInterval(instance.timeInterval);
        instance.timeInterval = null;
      }
      if (instance.selectedTimeInterval) {
        clearInterval(instance.selectedTimeInterval);
        instance.selectedTimeInterval = null;
      }
    }
  });
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  cleanupTimezoneWidgets();
  closeAllTimezoneDropdowns();
});

/**
 * Enhanced cleanup on extension context invalidation
 */
window.addEventListener('unload', () => {
  cleanupTimezoneWidgets();
  closeAllTimezoneDropdowns();
});

/**
 * Cleanup when popup loses focus (Chrome-specific)
 */
window.addEventListener('blur', () => {
  // Only cleanup intervals if popup is closing
  setTimeout(() => {
    if (document.visibilityState === 'hidden') {
      cleanupTimezoneWidgets();
    }
  }, 100);
});

/**
 * Cleanup on visibility change
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      timeUpdateInterval = null;
      console.log('Paused timezone updates (hidden)');
    }
  } else if (document.visibilityState === 'visible') {
    if (!timeUpdateInterval && elements.timezoneWidgetsContainer) {
      console.log('Resuming timezone updates (visible)');
      updateTimezoneWidgetTimes(true);
    }
  }
});

// =============================================================================
// ICON MANAGEMENT
// =============================================================================

/**
 * Renders icons for all elements with data-icon attributes
 * Processes SVG templates and injects them into icon containers
 */
function renderIcons() {
  const iconContainers = document.querySelectorAll('.icon-container[data-icon]');
  const iconTemplates = document.getElementById('icon-templates');

  if (!iconTemplates) {
    console.warn('Icon templates not found');
    return;
  }

  iconContainers.forEach(container => {
    const iconName = container.getAttribute('data-icon');
    const templateIcon = iconTemplates.querySelector(`#icon-${iconName}`);

    if (templateIcon) {
      // Clone the template icon
      const iconClone = templateIcon.cloneNode(true);
      iconClone.removeAttribute('id');
      iconClone.classList.add('icon');

      // Clear existing content and add the icon
      container.innerHTML = '';
      container.appendChild(iconClone);
    } else {
      console.warn(`Icon template not found: ${iconName}`);
    }
  });
}

// =============================================================================
// INITIALIZATION AND LEGACY SUPPORT
// =============================================================================


/**
 * Legacy function mapping for backward compatibility
 * @deprecated Use new function names instead
 */
function openTimezoneSelect(index, currentTz) {
  openTimezoneSelector(index, currentTz);
}

// =============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// =============================================================================

/**
 * Updates widget times - legacy function
 * @param {boolean} fullUpdate - Whether to perform full update
 */
function updateWidgetTimes(fullUpdate = true) {
  updateTimezoneWidgetTimes(fullUpdate);
}


/**
 * Populates basic timezone options - legacy function for main dropdowns
 */

/**
 * Saves user preferences to Chrome storage
 */
function savePreferences() {
  if (!elements.fromTimezoneSelect || !elements.toTimezoneSelect) return;

  const from = elements.fromTimezoneSelect.value;
  const to = elements.toTimezoneSelect.value;
  chrome.storage.sync.set({ fromTimezone: from, toTimezone: to });
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Initializes all event handlers for the popup interface
 */
function initializeEventHandlers() {
  // Convert button
  if (elements.convertBtn) {
    elements.convertBtn.addEventListener('click', handleConvertClick);
  }

  // Revert button
  if (elements.revertBtn) {
    elements.revertBtn.addEventListener('click', handleRevertClick);
  }

  // Custom format toggle
  if (elements.customFormatToggle) {
    elements.customFormatToggle.addEventListener('click', toggleCustomFormatForm);
  }

  // Save format button
  if (elements.saveFormatBtn) {
    elements.saveFormatBtn.addEventListener('click', handleSaveFormat);
  }

  // Cancel format button
  if (elements.cancelFormatBtn) {
    elements.cancelFormatBtn.addEventListener('click', handleCancelFormat);
  }

  // Site disable button
  if (elements.siteDisableBtn) {
    elements.siteDisableBtn.addEventListener('click', handleSiteDisable);
  }

  // Page disable button
  if (elements.pageDisableBtn) {
    elements.pageDisableBtn.addEventListener('click', handlePageDisable);
  }
}

/**
 * Handles convert button click
 */
function handleConvertClick() {
  // Validate timezone selections
  const fromTz = elements.fromTimezoneSelect?.value;
  const toTz = elements.toTimezoneSelect?.value;

  if (!fromTz || !toTz) {
    showStatus('Please select both source and target timezones', 'error');
    return;
  }

  savePreferences();
  resetButton('Converting...', true);
  showStatus('Converting dates...', 'info', 15000);

  // Set a timeout to recover if conversion hangs
  window.convertTimeout = setTimeout(() => {
    console.log('Conversion timeout - recovering button state');
    setButtonStates(true);
    showStatus('Conversion timed out. Please try again.', 'error');
  }, 12000);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      showStatus('❌ No active tab found.', 'error');
      resetButton('Error', false);
      return;
    }

    // First try to send message to existing content script
    console.log('Sending convertTime message to tab:', tab.id);
    chrome.tabs.sendMessage(tab.id, {
      action: 'convertTime',
      from: elements.fromTimezoneSelect?.value || 'UTC',
      to: elements.toTimezoneSelect?.value || 'UTC'
    }, (response) => {
      console.log('Received response from content script:', response);
      console.log('Chrome runtime error:', chrome.runtime.lastError);

      if (chrome.runtime.lastError || !response) {
        console.log('Content script not ready, injecting scripts...');
        // If content script not ready, inject and try again
        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['style.css']
        }).then(() => {
          return chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'lib/date-fns.umd.min.js',
              'lib/date-fns-tz.umd.min.js',
              'modules/date-time-parser.js',
              'modules/timezone-converter.js',
              'content.js'
            ]
          });
        }).then(() => {
          console.log('Scripts injected, waiting and sending message...');
          // Wait a bit for script to initialize, then send message
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'convertTime',
              from: elements.fromTimezoneSelect?.value || 'UTC',
              to: elements.toTimezoneSelect?.value || 'UTC'
            }, (response) => {
              console.log('Second attempt response:', response);
              console.log('Second attempt error:', chrome.runtime.lastError);

              if (chrome.runtime.lastError) {
                const errorMsg = `Error: ${chrome.runtime.lastError.message}. Please reload the page and try again.`;
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                showStatus(errorMsg, 'error');
                resetButton('Failed', false);
              } else if (response && response.status) {
                handleConversionResponse(response);
              } else {
                console.error('No response received from content script');
                showStatus('Conversion failed: No response from content script.', 'error');
                setButtonStates(true);
                setTimeout(() => {
                  resetButton('Convert', false);
                }, 3000);
              }
            });
          }, 500);
        }).catch(err => {
          console.error('Error injecting scripts:', err);
          showStatus(`Error injecting script: ${err.message}. See console.`, 'error');
          resetButton('Error', false);
        });
      } else if (response && response.status) {
        handleConversionResponse(response);
      } else {
        console.error('Invalid response:', response);
        showStatus('Conversion failed: Invalid response.', 'error');
        setButtonStates(true);
        setTimeout(() => resetButton('Convert', false), 3000);
      }
    });
  });
}

/**
 * Handles revert button click
 */
function handleRevertClick() {
  showStatus('Reverting dates...', 'info', 10000);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      showStatus('No active tab found.', 'error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'revertDates'
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Error reverting dates. Please reload the page.', 'error');
        setButtonStates(true); // Switch back to convert mode on error
      } else if (response && response.status) {
        showStatus(response.status, 'success');
        setButtonStates(true); // Switch back to convert mode
      } else {
        showStatus('No converted dates found to revert.', 'info');
        setButtonStates(true);
      }
    });
  });
}

/**
 * Toggles custom format form visibility
 */
function toggleCustomFormatForm() {
  if (elements.customFormatForm) {
    const isHidden = elements.customFormatForm.classList.contains('hidden');
    if (isHidden) {
      elements.customFormatForm.classList.remove('hidden');
      if (elements.customFormatText) {
        elements.customFormatText.textContent = 'Hide Format';
      }
    } else {
      elements.customFormatForm.classList.add('hidden');
      if (elements.customFormatText) {
        elements.customFormatText.textContent = 'Add Format';
      }
    }
  }
}

/**
 * Handles save format button click
 */
function handleSaveFormat() {
  const pattern = elements.dateFormatInput?.value.trim();
  const description = elements.formatDescriptionInput?.value.trim();

  if (!pattern) {
    console.warn('Please enter a date format pattern');
    return;
  }

  console.log('Saving custom format:', { pattern, description });
  // Add your save format logic here
}

/**
 * Handles cancel format button click
 */
function handleCancelFormat() {
  if (elements.customFormatForm) {
    elements.customFormatForm.classList.add('hidden');
  }
  if (elements.customFormatText) {
    elements.customFormatText.textContent = 'Add Format';
  }
  if (elements.dateFormatInput) {
    elements.dateFormatInput.value = '';
  }
  if (elements.formatDescriptionInput) {
    elements.formatDescriptionInput.value = '';
  }
}

/**
 * Gets current site URL hostname with proper validation
 * @returns {Promise<string|null>} Valid hostname or null
 */
function getCurrentSiteUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          // Only allow http/https protocols
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            resolve(url.hostname);
          } else {
            resolve(null); // Invalid protocol (chrome://, file://, etc.)
          }
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Checks if site is currently disabled
 * @returns {Promise<boolean>} True if site is disabled
 */
async function checkSiteDisableStatus() {
  const hostname = await getCurrentSiteUrl();
  if (!hostname) return false;

  return new Promise((resolve) => {
    chrome.storage.sync.get(['disabledSites'], (data) => {
      const disabledSites = data.disabledSites || [];
      resolve(disabledSites.includes(hostname));
    });
  });
}

/**
 * Updates site disable button UI based on current page
 */
async function updateSiteDisableUI() {
  const hostname = await getCurrentSiteUrl();
  const isDisabled = await checkSiteDisableStatus();

  if (!hostname) {
    // Not a valid website - disable the button
    elements.siteDisableBtn.disabled = true;
    elements.siteDisableText.textContent = 'Disable Site';
    elements.siteDisableBtn.classList.remove('active');
    elements.siteDisableBtn.title = 'Only available on websites (http/https)';
    return;
  }

  // Check if it's a valid domain (not localhost, file://, chrome://, etc.)
  if (hostname === 'localhost' || hostname.startsWith('127.') || hostname === '' ||
      hostname.startsWith('chrome://') || hostname.startsWith('moz-extension://') ||
      hostname.startsWith('chrome-extension://') || hostname.includes('://localhost')) {
    elements.siteDisableBtn.disabled = true;
    elements.siteDisableText.textContent = 'Disable Site';
    elements.siteDisableBtn.classList.remove('active');
    elements.siteDisableBtn.title = 'Not available for local/extension pages';
    return;
  }

  // Valid website - enable the button
  elements.siteDisableBtn.disabled = false;
  elements.siteDisableBtn.title = `${isDisabled ? 'Enable' : 'Disable'} conversion for ${hostname}`;

  if (isDisabled) {
    elements.siteDisableText.textContent = 'Enable Site';
    elements.siteDisableBtn.classList.add('active');

    // Show status indicator
    if (elements.siteStatus) {
      const siteStatusText = document.getElementById('site-status-text');
      if (siteStatusText) {
        siteStatusText.textContent = `Site disabled: ${hostname}`;
      }
      elements.siteStatus.classList.remove('hidden');
    }

    // Disable convert/revert buttons when site is disabled
    if (elements.convertBtn && elements.revertBtn) {
      elements.convertBtn.disabled = true;
      elements.revertBtn.disabled = true;
      elements.convertBtn.className = 'btn-primary btn-inactive';
      elements.revertBtn.className = 'btn-secondary btn-inactive';
    }
  } else {
    elements.siteDisableText.textContent = 'Disable Site';
    elements.siteDisableBtn.classList.remove('active');

    if (elements.siteStatus) {
      elements.siteStatus.classList.add('hidden');
    }
  }
}

/**
 * Handles site disable button click
 */
async function handleSiteDisable() {
  const hostname = await getCurrentSiteUrl();
  if (!hostname) {
    showStatus('Site disable only works on websites (http/https)', 'error');
    return;
  }

  const isCurrentlyDisabled = await checkSiteDisableStatus();

  chrome.storage.sync.get(['disabledSites'], (data) => {
    let disabledSites = data.disabledSites || [];

    if (isCurrentlyDisabled) {
      // Enable the site
      disabledSites = disabledSites.filter(site => site !== hostname);
      showStatus(`Enabled conversion for ${hostname}`, 'success', 3000);
    } else {
      // Disable the site
      if (!disabledSites.includes(hostname)) {
        disabledSites.push(hostname);
      }
      showStatus(`Disabled conversion for ${hostname}`, 'info', 3000);

      // Revert any existing conversions
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          chrome.tabs.sendMessage(tab.id, { action: 'revertDates' });
        }
      });
    }

    chrome.storage.sync.set({ disabledSites }, () => {
      updateSiteDisableUI();
    });
  });
}

/**
 * Gets current page URL for page-specific disabling
 * @returns {Promise<string|null>} Valid page URL or null
 */
function getCurrentPageUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          // Only allow http/https protocols
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            // Use hostname + pathname for page-specific disabling
            resolve(url.hostname + url.pathname);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Checks if current page is disabled
 * @returns {Promise<boolean>} True if page is disabled
 */
async function checkPageDisableStatus() {
  const pageUrl = await getCurrentPageUrl();
  if (!pageUrl) return false;

  return new Promise((resolve) => {
    chrome.storage.sync.get(['disabledPages'], (data) => {
      const disabledPages = data.disabledPages || [];
      resolve(disabledPages.includes(pageUrl));
    });
  });
}

/**
 * Updates page disable button UI based on current page
 */
async function updatePageDisableUI() {
  const pageUrl = await getCurrentPageUrl();
  const isDisabled = await checkPageDisableStatus();
  const siteDisabled = await checkSiteDisableStatus();

  if (!pageUrl) {
    // Not a valid page - disable the button
    elements.pageDisableBtn.disabled = true;
    elements.pageDisableText.textContent = 'Disable Page';
    elements.pageDisableBtn.classList.remove('active');
    elements.pageDisableBtn.title = 'Only available on websites (http/https)';
    return;
  }

  const url = new URL('http://' + pageUrl);
  const pagePath = url.pathname;

  // Valid page - enable the button
  elements.pageDisableBtn.disabled = false;
  elements.pageDisableBtn.title = `${isDisabled ? 'Enable' : 'Disable'} conversion for ${pagePath}`;

  if (isDisabled) {
    elements.pageDisableText.textContent = 'Enable Page';
    elements.pageDisableBtn.classList.add('active');

    // Show status indicator
    if (elements.pageStatus) {
      const pageStatusText = document.getElementById('page-status-text');
      if (pageStatusText) {
        pageStatusText.textContent = `Page disabled: ${pagePath}`;
      }
      elements.pageStatus.classList.remove('hidden');
    }

    // Disable convert/revert buttons when page is disabled
    if (elements.convertBtn && elements.revertBtn) {
      elements.convertBtn.disabled = true;
      elements.revertBtn.disabled = true;
      elements.convertBtn.className = 'btn-primary btn-inactive';
      elements.revertBtn.className = 'btn-secondary btn-inactive';
    }
  } else {
    elements.pageDisableText.textContent = 'Disable Page';
    elements.pageDisableBtn.classList.remove('active');

    if (elements.pageStatus) {
      elements.pageStatus.classList.add('hidden');
    }

    // Button state will be set by the final initialization call
  }
}

/**
 * Handles page disable button click
 */
async function handlePageDisable() {
  const pageUrl = await getCurrentPageUrl();
  if (!pageUrl) {
    showStatus('Page disable only works on websites (http/https)', 'error');
    return;
  }

  const isCurrentlyDisabled = await checkPageDisableStatus();
  const url = new URL('http://' + pageUrl);
  const pagePath = url.pathname;

  chrome.storage.sync.get(['disabledPages'], (data) => {
    let disabledPages = data.disabledPages || [];

    if (isCurrentlyDisabled) {
      // Enable the page
      disabledPages = disabledPages.filter(page => page !== pageUrl);
      showStatus(`Enabled conversion for ${pagePath}`, 'success', 3000);
    } else {
      // Disable the page
      if (!disabledPages.includes(pageUrl)) {
        disabledPages.push(pageUrl);
      }
      showStatus(`Disabled conversion for ${pagePath}`, 'info', 3000);

      // Revert any existing conversions
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          chrome.tabs.sendMessage(tab.id, { action: 'revertDates' });
        }
      });
    }

    chrome.storage.sync.set({ disabledPages }, () => {
      updatePageDisableUI();
      updateSiteDisableUI(); // Also update site UI to check for conflicts
    });
  });
}

/**
 * Initializes custom dropdowns for main timezone selectors
 */
function initializeCustomDropdowns() {
  // Get comprehensive timezone data
  const allTimezones = getAllTimezones();

  // Initialize from timezone dropdown
  if (document.getElementById('from-timezone-custom')) {
    new CustomDropdown('from-timezone-custom', 'from-timezone', allTimezones);
  }

  // Initialize to timezone dropdown
  if (document.getElementById('to-timezone-custom')) {
    new CustomDropdown('to-timezone-custom', 'to-timezone', allTimezones);
  }
}

/**
 * Checks for existing highlights and sets button states accordingly
 */
function checkInitialButtonState() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      console.log('No active tab, setting convert mode');
      setButtonStates(true);
      return;
    }

    // Simple, direct check for highlights
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const highlights = document.querySelectorAll('.time-converter-replaced');
        return highlights.length > 0;
      }
    }).then((results) => {
      if (results && results[0] && typeof results[0].result === 'boolean') {
        const hasHighlights = results[0].result;
        console.log('Highlights found:', hasHighlights);

        if (hasHighlights) {
          console.log('Page has highlights, setting REVERT mode');
          setButtonStates(false); // false = revert mode (convert disabled, revert enabled)
        } else {
          console.log('Page has no highlights, setting CONVERT mode');
          setButtonStates(true); // true = convert mode (convert enabled, revert disabled)
        }
      } else {
        console.log('Failed to get highlight status, defaulting to convert mode');
        setButtonStates(true);
      }
    }).catch((error) => {
      console.log('Error checking highlights:', error);
      setButtonStates(true);
    });
  });
}

// Initialize timezone widgets and icons when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    renderIcons();
    renderTimezoneWidgets();
    initializeEventHandlers();
    initializeCustomDropdowns();
    await updateSiteDisableUI();
    await updatePageDisableUI();
    // Final button state check - this should be last
    setTimeout(() => {
      checkInitialButtonState();
    }, 100);
  });
} else {
  renderIcons();
  renderTimezoneWidgets();
  initializeEventHandlers();
  initializeCustomDropdowns();
  updateSiteDisableUI().then(() => updatePageDisableUI()).then(() => {
    // Final button state check - this should be last
    setTimeout(() => {
      checkInitialButtonState();
    }, 100);
  });
}
