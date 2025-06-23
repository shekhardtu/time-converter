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




// =============================================================================
// TIMEZONE DATA
// =============================================================================

/**
 * Global timezones array for tests and dropdown population
 * @type {Array}
 */
// eslint-disable-next-line no-unused-vars
const timezones = getAllTimezones();



// =============================================================================
// DOM ELEMENT REFERENCES
// =============================================================================

const elements = {
  // Main form elements
  fromTimezoneSelect: document.getElementById('from-timezone'),
  toTimezoneSelect: document.getElementById('to-timezone'),

  // Footer and widgets
  footerDiv: document.querySelector('.popup-footer'),
  timezoneWidgetsContainer: document.getElementById('timezone-widgets'),

  // Site toggle control
  siteToggleBtn: document.getElementById('site-toggle-btn'),
  siteToggleText: document.getElementById('site-toggle-text'),
  siteStatus: document.getElementById('site-status')
};


// =============================================================================
// GLOBAL STATE
// =============================================================================

let timeUpdateInterval = null;
let statusTimeout = null;

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

  // Show timezone widgets again
  elements.footerDiv.innerHTML = '<div id="timezone-widgets" class="timezone-widgets"></div>';
  elements.timezoneWidgetsContainer = document.getElementById('timezone-widgets');
  renderTimezoneWidgets();
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

  // Get abbreviation from timezone data
  let abbreviation = timezone;
  if (typeof getAllTimezones === 'function') {
    const allTz = getAllTimezones();
    const tzData = allTz.find(tz => tz.value === timezone || tz.ianaTimezone === timezone);
    if (tzData?.abbreviation) {
      abbreviation = tzData.abbreviation;
    }
  }

  widget.innerHTML = `
    <div class="tz-time" id="tz-time-${index}"></div>
    <div class="tz-label">${abbreviation}</div>
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
              <div class="select-name">${currentTzData.abbreviation || ''} - ${currentTzData.name || ''}</div>
            </div>
            <div class="select-city">${currentTzData.value || currentTzData.ianaTimezone || this.currentTz} <span class="select-offset">(${currentTzData.offset || ''})</span></div>
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
            <div class="option-name">${tz.abbreviation || ''} - ${tz.name || ''}</div>
          </div>
          <div class="option-details">
            <span class="option-city">${tz.value || tz.ianaTimezone} <span class="option-offset">(${tz.offset})</span></span>
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
      (tz.abbreviation || '').toLowerCase().includes(lowerQuery) ||
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



// =============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// =============================================================================



/**
 * Populates basic timezone options - legacy function for main dropdowns
 */

/**
 * Saves user preferences to Chrome storage
 */
async function savePreferences() {
  if (!elements.fromTimezoneSelect || !elements.toTimezoneSelect) return;

  const from = elements.fromTimezoneSelect.value;
  const to = elements.toTimezoneSelect.value;

  return new Promise((resolve) => {
    chrome.storage.sync.set({ fromTimezone: from, toTimezone: to }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving preferences:', chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Initializes all event handlers for the popup interface
 */
function initializeEventHandlers() {
  // Site toggle button
  if (elements.siteToggleBtn) {
    elements.siteToggleBtn.addEventListener('click', handleSiteToggle);
  }

  // Timezone dropdown change handlers for auto-conversion
  if (elements.fromTimezoneSelect) {
    console.log('Attaching change listener to from-timezone select');

    // Track the current value
    let currentFromValue = elements.fromTimezoneSelect.value;

    elements.fromTimezoneSelect.addEventListener('change', (e) => {
      console.log('From timezone changed to:', e.target.value);
      if (e.target.value !== currentFromValue) {
        currentFromValue = e.target.value;
        setTimeout(() => handleTimezoneChange(), 100);
      }
    });

    // Use MutationObserver as backup to catch programmatic changes
    const fromObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          const newValue = elements.fromTimezoneSelect.value;
          console.log('From timezone value mutated to:', newValue);
          if (newValue !== currentFromValue) {
            currentFromValue = newValue;
            setTimeout(() => handleTimezoneChange(), 100);
          }
        }
      });
    });

    fromObserver.observe(elements.fromTimezoneSelect, {
      attributes: true,
      attributeFilter: ['value']
    });
  }

  if (elements.toTimezoneSelect) {
    console.log('Attaching change listener to to-timezone select');

    // Track the current value
    let currentToValue = elements.toTimezoneSelect.value;

    elements.toTimezoneSelect.addEventListener('change', (e) => {
      console.log('To timezone changed to:', e.target.value);
      if (e.target.value !== currentToValue) {
        currentToValue = e.target.value;
        setTimeout(() => handleTimezoneChange(), 100);
      }
    });

    // Use MutationObserver as backup to catch programmatic changes
    const toObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          const newValue = elements.toTimezoneSelect.value;
          console.log('To timezone value mutated to:', newValue);
          if (newValue !== currentToValue) {
            currentToValue = newValue;
            setTimeout(() => handleTimezoneChange(), 100);
          }
        }
      });
    });

    toObserver.observe(elements.toTimezoneSelect, {
      attributes: true,
      attributeFilter: ['value']
    });
  }
}

/**
 * Handles automatic conversion when timezone selections change
 */
async function handleTimezoneChange() {
  // Get current timezone values
  const fromTz = elements.fromTimezoneSelect?.value;
  const toTz = elements.toTimezoneSelect?.value;

  console.log('handleTimezoneChange called:', fromTz, '->', toTz);

  // Only proceed if both timezones are selected
  if (!fromTz || !toTz) {
    console.log('Missing timezone selection');
    return;
  }

  // Save preferences and wait for completion
  await savePreferences();

  // Get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) {
      return;
    }

    try {
      const url = new URL(tab.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
      }

      const hostname = url.hostname;

      // Check if site is disabled
      chrome.storage.sync.get(['disabledSites'], (data) => {
        const disabledSites = data.disabledSites || [];
        if (disabledSites.includes(hostname)) {
          showStatus(`Conversion disabled for ${hostname}`, 'info', 2000);
          return;
        }

        // Perform conversion immediately
        console.log('Calling performConversion for tab:', tab.id);
        performConversion(tab.id, fromTz, toTz);
      });
    } catch (e) {
      console.error('Error in handleTimezoneChange:', e);
    }
  });
}

/**
 * Performs the actual conversion on the page
 */
function performConversion(tabId, fromTz, toTz) {
  showStatus('Converting dates...', 'info', 2000);

  // Send message with timeout to ensure response
  const sendConversionMessage = (isRetry = false) => {
    chrome.tabs.sendMessage(tabId, {
      action: 'convertTime',
      from: fromTz,
      to: toTz
    }, (response) => {
      if (chrome.runtime.lastError) {
        if (isRetry) {
          showStatus('Error: Please reload the page and try again', 'error', 3000);
          return;
        }

        // Inject scripts and retry
        injectScriptsAndConvert(tabId, fromTz, toTz);
      } else if (response && response.status) {
        showStatus(response.status, 'success', 2000);
      } else {
        showStatus('No response from page', 'error', 2000);
      }
    });
  };

  // Helper function to inject scripts
  const injectScriptsAndConvert = (tabId, fromTz, toTz) => {
    // Store timezone parameters for use after script injection
    const conversionParams = { fromTz, toTz };

    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['style.css']
    }).then(() => {
      return chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [
          'lib/date-fns-tz.umd.min.js',
          'modules/date-time-parser.js',
          'modules/timezone-converter.js',
          'content.js',
          'selection-feature/selection-date-parser.js',
          'selection-feature/selection-detector.js',
          'selection-feature/selection-content.js'
        ]
      });
    }).then(() => {
      // Wait for scripts to initialize and pass timezone parameters
      setTimeout(() => sendConversionMessage(true, conversionParams.fromTz, conversionParams.toTz), 1000);
    }).catch(err => {
      console.error('Error injecting scripts:', err);
      showStatus('Error: Unable to convert on this page', 'error', 3000);
    });
  };

  // Try sending message first
  sendConversionMessage();
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
 * Updates site toggle button UI based on current page
 */
async function updateSiteToggleUI() {
  const hostname = await getCurrentSiteUrl();
  const isDisabled = await checkSiteDisableStatus();

  if (!hostname) {
    // Not a valid website - disable the button
    elements.siteToggleBtn.disabled = true;
    elements.siteToggleText.textContent = 'Disable for site';
    elements.siteToggleBtn.classList.remove('enabled');
    elements.siteToggleBtn.title = 'Only available on websites (http/https)';

    // Update icon
    const icon = elements.siteToggleBtn.querySelector('.icon-container');
    if (icon) icon.setAttribute('data-icon', 'disable');
    return;
  }

  // Check if it's a valid domain (not localhost, file://, chrome://, etc.)
  if (hostname === 'localhost' || hostname.startsWith('127.') || hostname === '' ||
      hostname.startsWith('chrome://') || hostname.startsWith('moz-extension://') ||
      hostname.startsWith('chrome-extension://') || hostname.includes('://localhost')) {
    elements.siteToggleBtn.disabled = true;
    elements.siteToggleText.textContent = 'Disable for site';
    elements.siteToggleBtn.classList.remove('enabled');
    elements.siteToggleBtn.title = 'Not available for local/extension pages';

    // Update icon
    const icon = elements.siteToggleBtn.querySelector('.icon-container');
    if (icon) icon.setAttribute('data-icon', 'disable');
    return;
  }

  // Valid website - enable the button
  elements.siteToggleBtn.disabled = false;
  elements.siteToggleBtn.title = `${isDisabled ? 'Enable' : 'Disable'} conversion for ${hostname}`;

  if (isDisabled) {
    elements.siteToggleText.textContent = 'Enable for site';
    elements.siteToggleBtn.classList.add('enabled');

    // Update icon to enable
    const icon = elements.siteToggleBtn.querySelector('.icon-container');
    if (icon) icon.setAttribute('data-icon', 'enable');

    // Show status indicator
    if (elements.siteStatus) {
      const siteStatusText = document.getElementById('site-status-text');
      if (siteStatusText) {
        siteStatusText.textContent = `Disabled for ${hostname}`;
      }
      elements.siteStatus.classList.remove('hidden');
    }
  } else {
    elements.siteToggleText.textContent = 'Disable for site';
    elements.siteToggleBtn.classList.remove('enabled');

    // Update icon to disable
    const icon = elements.siteToggleBtn.querySelector('.icon-container');
    if (icon) icon.setAttribute('data-icon', 'disable');

    if (elements.siteStatus) {
      elements.siteStatus.classList.add('hidden');
    }
  }
}

/**
 * Handles site toggle button click
 */
async function handleSiteToggle() {
  const hostname = await getCurrentSiteUrl();
  if (!hostname) {
    showStatus('Only works on websites (http/https)', 'error');
    return;
  }

  const isCurrentlyDisabled = await checkSiteDisableStatus();

  chrome.storage.sync.get(['disabledSites'], (data) => {
    let disabledSites = data.disabledSites || [];

    if (isCurrentlyDisabled) {
      // Enable the site
      disabledSites = disabledSites.filter(site => site !== hostname);
      showStatus(`Enabled for ${hostname}`, 'success', 3000);

      // Auto-convert after enabling
      const fromTz = elements.fromTimezoneSelect?.value;
      const toTz = elements.toTimezoneSelect?.value;
      if (fromTz && toTz) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            setTimeout(() => performConversion(tabs[0].id, fromTz, toTz), 500);
          }
        });
      }
    } else {
      // Disable the site
      if (!disabledSites.includes(hostname)) {
        disabledSites.push(hostname);
      }
      showStatus(`Disabled for ${hostname}`, 'info', 3000);

      // Revert any existing conversions
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          chrome.tabs.sendMessage(tab.id, { action: 'revertDates' });
        }
      });
    }

    chrome.storage.sync.set({ disabledSites }, () => {
      updateSiteToggleUI();
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


// Initialize timezone widgets and icons when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    renderIcons();
    renderTimezoneWidgets();
    initializeCustomDropdowns();
    initializeEventHandlers();  // Initialize handlers AFTER dropdowns
    await updateSiteToggleUI();

    // Don't trigger initial conversion - let content script handle it on load
    // Only convert when user explicitly changes dropdowns
  });
} else {
  renderIcons();
  renderTimezoneWidgets();
  initializeCustomDropdowns();
  initializeEventHandlers();  // Initialize handlers AFTER dropdowns
  updateSiteToggleUI();

  // Don't trigger initial conversion - let content script handle it on load
  // Only convert when user explicitly changes dropdowns
}
