// Custom Dropdown Component with Search and Flags
/* global getAllTimezones, TimeCalculator */
class CustomDropdown {
  constructor(containerId, targetSelectId, timezones) {
    this.container = document.getElementById(containerId);
    this.targetSelect = document.getElementById(targetSelectId);
    this.timezones = timezones || this.getDefaultTimezones();
    this.filteredTimezones = [...this.timezones];
    this.isOpen = false;
    this.selectedIndex = -1;
    this.storageKey = targetSelectId; // Use target select ID as storage key

    this.trigger = this.container.querySelector('.custom-select-trigger');
    this.dropdown = this.container.querySelector('.custom-select-dropdown');
    this.searchInput = this.container.querySelector('.search-input');
    this.optionsContainer = this.container.querySelector('.dropdown-options');
    this.selectFlag = this.container.querySelector('.select-flag');
    this.selectText = this.container.querySelector('.select-text');
    this.resultsCount = this.container.querySelector('.search-results-count');

    // Move dropdown to popup container to escape stacking context
    this.moveDropdownToPopup();

    this.init();
  }

  // Move dropdown to popup container to escape stacking context
  moveDropdownToPopup() {
    const popupContainer = document.querySelector('.popup');
    if (popupContainer && this.dropdown) {
      // Remove dropdown from current parent
      this.dropdown.remove();
      // Append to popup container
      popupContainer.appendChild(this.dropdown);
      // Mark it as moved for positioning calculations
      this.dropdown.setAttribute('data-moved', 'true');
    }
  }

  async init() {
    this.populateOptions();
    this.bindEvents();
    this.updateHiddenSelect();
    await this.loadFromStorage();
  }

  // Load saved selection from Chrome storage
  async loadFromStorage() {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, using default selection');
        await this.setDefaultSelection();
        return;
      }

      const result = await chrome.storage.sync.get([this.storageKey]);
      const savedValue = result[this.storageKey];

      if (savedValue) {
        console.log(`Loading saved value for ${this.storageKey}:`, savedValue);
        await this.setValue(savedValue, false); // Don't save when loading
      } else {
        // Set default values if nothing is saved
        await this.setDefaultSelection();
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error);
      await this.setDefaultSelection();
    }
  }

  // Save selection to Chrome storage
  async saveToStorage(value) {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, unable to save to storage');
        return;
      }

      await chrome.storage.sync.set({ [this.storageKey]: value });
      console.log(`Saved ${this.storageKey}:`, value);
    } catch (error) {
      console.warn('Failed to save to storage:', error);
    }
  }

  // Set default selection based on dropdown type
  async setDefaultSelection() {
    if (this.storageKey === 'from-timezone') {
      // Try to detect user's timezone or use UTC as default
      const userTimezone = this.getSystemTimezone();
      await this.setValue(userTimezone, true); // Save default selection
    } else if (this.storageKey === 'to-timezone') {
      // Default to UTC for "to" timezone
      await this.setValue('UTC', true); // Save default selection
    }
  }

  // Get default timezone data as fallback
  getDefaultTimezones() {
    return [
      { value: 'UTC', name: 'UTC - Coordinated Universal Time', city: 'Global', flag: '🌐', offset: '+00:00', ianaTimezone: 'UTC' },
      { value: 'GMT', name: 'GMT - Greenwich Mean Time', city: 'London', flag: '🇬🇧', offset: '+00:00', ianaTimezone: 'GMT' },
      { value: 'EST', name: 'EST - Eastern Standard Time', city: 'New York', flag: '🇺🇸', offset: '-05:00', ianaTimezone: 'America/New_York' },
      { value: 'PST', name: 'PST - Pacific Standard Time', city: 'Los Angeles', flag: '🇺🇸', offset: '-08:00', ianaTimezone: 'America/Los_Angeles' },
      { value: 'IST', name: 'IST - Indian Standard Time', city: 'Mumbai', flag: '🇮🇳', offset: '+05:30', ianaTimezone: 'Asia/Kolkata' },
      { value: 'JST', name: 'JST - Japan Standard Time', city: 'Tokyo', flag: '🇯🇵', offset: '+09:00', ianaTimezone: 'Asia/Tokyo' }
    ];
  }

  // Detect user's timezone based on browser
  getSystemTimezone() {
    try {
      const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Use comprehensive timezone data if available
      if (typeof getAllTimezones === 'function') {
        const allTz = getAllTimezones();
        const matchingTz = allTz.find(tz => tz.ianaTimezone === systemTz);
        if (matchingTz) {
          return matchingTz.value;
        }
      }

      // Fallback to basic mapping for common cases
      const basicMap = {
        'America/New_York': 'EST',
        'America/Chicago': 'CST',
        'America/Denver': 'MST',
        'America/Los_Angeles': 'PST',
        'GMT': 'GMT',
        'Asia/Kolkata': 'IST',
        'Asia/Tokyo': 'JST'
      };

      return basicMap[systemTz] || 'UTC';
    } catch (error) {
      console.warn('Failed to detect timezone:', error);
      return 'UTC';
    }
  }

  populateOptions() {
    this.optionsContainer.innerHTML = '';

    this.filteredTimezones.forEach((timezone, index) => {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.setAttribute('data-value', timezone.value);
      option.setAttribute('data-index', index);

      const currentTime = this.getCurrentTime(timezone.ianaTimezone || timezone.value);

      option.innerHTML = `
        <span class="option-flag">${timezone.flag}</span>
        <div class="option-content">
          <div class="option-header">
            <div class="option-name">${timezone.name}</div>
            <div class="option-time-center">
              <div class="option-time" data-timezone="${timezone.ianaTimezone || timezone.value}">${currentTime}</div>
            </div>
          </div>
          <div class="option-details">
            <span class="option-city">${timezone.city} <span class="option-offset">${timezone.offset}</span></span>
          </div>
        </div>
      `;

      option.addEventListener('click', () => this.selectOption(timezone, index));
      this.optionsContainer.appendChild(option);
    });

    // Update results count
    this.updateResultsCount();

    // Start time updates for this dropdown
    this.startTimeUpdates();
  }

  // Get IANA timezone from our timezone codes

  // Get current time for a timezone using date-fns-tz
  getCurrentTime(ianaTimezone) {
    // Use unified time calculator
    return TimeCalculator.getCurrentTime(ianaTimezone, 'HH:mm');
  }

  // Start live time updates
  startTimeUpdates() {
    // Clear existing interval
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }

    // Update every second
    this.timeInterval = setInterval(() => {
      if (this.isOpen) {
        this.updateOptionTimes();
      }
    }, 1000);
  }

  // Update all option times
  updateOptionTimes() {
    const timeElements = this.optionsContainer.querySelectorAll('.option-time');
    timeElements.forEach(timeElement => {
      const timezone = timeElement.getAttribute('data-timezone');
      if (timezone) {
        timeElement.textContent = this.getCurrentTime(timezone);
      }
    });
  }

  // Also update the selected time in trigger
  updateSelectedTime() {
    if (this.selectedTimezone) {
      const selectedTime = this.getCurrentTime(this.selectedTimezone);
      const timeDisplay = this.trigger.querySelector('.select-time');
      if (timeDisplay) {
        timeDisplay.textContent = selectedTime;
      }
    }
  }

  bindEvents() {
    // Trigger click
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Search input
    this.searchInput.addEventListener('input', (e) => {
      this.filterOptions(e.target.value);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      this.handleKeyDown(e);
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.trigger.classList.add('active');

    // Position dropdown using absolute positioning
    this.positionDropdown();

    this.dropdown.classList.add('open');
    this.searchInput.focus();
    this.selectedIndex = -1;

    // Close other dropdowns
    document.querySelectorAll('.custom-select-dropdown.open').forEach(dropdown => {
      if (dropdown !== this.dropdown) {
        dropdown.classList.remove('open');
        dropdown.parentElement.querySelector('.custom-select-trigger').classList.remove('active');
      }
    });
  }

  // Position dropdown relative to trigger
  positionDropdown() {
    const popupContainer = document.querySelector('.popup');
    const popupRect = popupContainer.getBoundingClientRect();
    const triggerRect = this.trigger.getBoundingClientRect();
    const dropdownHeight = 260; // max-height
    const viewportHeight = window.innerHeight;

    // Calculate position relative to popup container
    const triggerTop = triggerRect.top - popupRect.top;
    const triggerBottom = triggerRect.bottom - popupRect.top;
    const triggerLeft = triggerRect.left - popupRect.left;

    // Check if dropdown should open upward
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    if (openUpward) {
      this.dropdown.style.top = `${triggerTop - dropdownHeight - 4}px`;
    } else {
      this.dropdown.style.top = `${triggerBottom + 4}px`;
    }

    this.dropdown.style.left = `${triggerLeft}px`;
    this.dropdown.style.width = `${triggerRect.width}px`;
  }

  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
    this.trigger.classList.remove('active');
    this.dropdown.classList.remove('open');
    this.searchInput.value = '';
    this.filteredTimezones = [...this.timezones];
    this.populateOptions();
    this.selectedIndex = -1;
  }

  filterOptions(query) {
    const lowerQuery = query.toLowerCase();
    this.filteredTimezones = this.timezones.filter(timezone =>
      timezone.name.toLowerCase().includes(lowerQuery) ||
      timezone.city.toLowerCase().includes(lowerQuery) ||
      timezone.value.toLowerCase().includes(lowerQuery) ||
      timezone.offset.includes(lowerQuery)
    );
    this.populateOptions();
    this.selectedIndex = -1;
  }

  updateResultsCount() {
    if (this.resultsCount) {
      const filtered = this.filteredTimezones.length;
      const total = this.timezones.length;
      this.resultsCount.textContent = `${filtered}/${total} results`;
    }
  }

  async selectOption(timezone, index) {
    // Store selected timezone for time updates
    this.selectedTimezone = timezone.ianaTimezone || timezone.value;

    // Get current time for this timezone
    const currentTime = this.getCurrentTime(this.selectedTimezone);

    // Update visible elements
    this.selectFlag.textContent = timezone.flag;
    this.selectText.innerHTML = `
      <div class="select-main">
        <div class="select-name">${timezone.name}</div>
        <div class="select-time-center">
          <div class="select-time">${currentTime}</div>
        </div>
      </div>
      <div class="select-city">${timezone.city} <span class="select-offset">${timezone.offset}</span></div>
    `;

    // Update hidden select
    this.targetSelect.value = timezone.value;

    // Mark as selected
    this.optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    this.optionsContainer.children[index]?.classList.add('selected');

    // Save to Chrome storage
    await this.saveToStorage(timezone.value);

    // Start live time updates for selected timezone
    this.startSelectedTimeUpdates();

    // Trigger change event
    this.targetSelect.dispatchEvent(new Event('change'));

    this.close();
  }

  handleKeyDown(e) {
    if (!this.isOpen) return;

    switch (e.key) {
    case 'Escape':
      e.preventDefault();
      this.close();
      break;

    case 'ArrowDown':
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredTimezones.length - 1);
      this.highlightOption();
      break;

    case 'ArrowUp':
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.highlightOption();
      break;

    case 'Enter':
      e.preventDefault();
      if (this.selectedIndex >= 0) {
        this.selectOption(this.filteredTimezones[this.selectedIndex], this.selectedIndex);
      }
      break;
    }
  }

  highlightOption() {
    this.optionsContainer.querySelectorAll('.dropdown-option').forEach((opt, index) => {
      opt.classList.toggle('highlighted', index === this.selectedIndex);
    });

    // Scroll into view
    if (this.selectedIndex >= 0) {
      const highlighted = this.optionsContainer.children[this.selectedIndex];
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  updateHiddenSelect() {
    // Keep the hidden select in sync for backward compatibility
    this.targetSelect.innerHTML = '';
    this.timezones.forEach(timezone => {
      const option = document.createElement('option');
      option.value = timezone.value;
      option.textContent = timezone.label;
      this.targetSelect.appendChild(option);
    });
  }

  async setValue(value, saveToStorage = true) {
    const timezone = this.timezones.find(tz => tz.value === value);
    if (timezone) {
      // Store selected timezone for time updates
      this.selectedTimezone = timezone.ianaTimezone || timezone.value;

      // Get current time for this timezone
      const currentTime = this.getCurrentTime(this.selectedTimezone);

      // Update visible elements
      this.selectFlag.textContent = timezone.flag;
      this.selectText.innerHTML = `
        <div class="select-main">
          <div class="select-name">${timezone.name}</div>
          <div class="select-time-center">
            <div class="select-time">${currentTime}</div>
          </div>
        </div>
        <div class="select-city">${timezone.city} <span class="select-offset">${timezone.offset}</span></div>
      `;

      // Update hidden select
      this.targetSelect.value = timezone.value;

      // Mark as selected in options
      this.optionsContainer.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-value') === value) {
          opt.classList.add('selected');
        }
      });

      // Save to storage if requested
      if (saveToStorage) {
        await this.saveToStorage(timezone.value);
      }

      // Start live time updates for selected timezone
      this.startSelectedTimeUpdates();

      // Trigger change event
      this.targetSelect.dispatchEvent(new Event('change'));
    }
  }

  // Start time updates for selected timezone in trigger
  startSelectedTimeUpdates() {
    // Clear existing interval
    if (this.selectedTimeInterval) {
      clearInterval(this.selectedTimeInterval);
    }

    // Update every second
    this.selectedTimeInterval = setInterval(() => {
      this.updateSelectedTime();
    }, 1000);
  }

  // Cleanup intervals
  destroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.selectedTimeInterval) {
      clearInterval(this.selectedTimeInterval);
    }
  }

  getValue() {
    return this.targetSelect.value;
  }
}

// Load comprehensive timezone data from all-timezones.js
let enhancedTimezones = [];

// Initialize with comprehensive timezone data
function initializeTimezones() {
  if (typeof getAllTimezones === 'function') {
    enhancedTimezones = getAllTimezones();
    // Make it globally accessible
    window.enhancedTimezones = enhancedTimezones;
    console.log(`Loaded ${enhancedTimezones.length} comprehensive timezones`);
  } else {
    // Fallback to basic timezones if all-timezones.js is not loaded
    enhancedTimezones = [
      { value: 'UTC', name: 'UTC - Coordinated Universal Time', city: 'Global', flag: '🌐', offset: '+00:00', ianaTimezone: 'UTC', label: 'UTC - Coordinated Universal Time' },
      { value: 'GMT', name: 'GMT - Greenwich Mean Time', city: 'London', flag: '🇬🇧', offset: '+00:00', ianaTimezone: 'GMT', label: 'GMT - Greenwich Mean Time' },
      // Basic US Timezones
      { value: 'PST', name: 'PST - Pacific Standard Time', city: 'Los Angeles', flag: '🇺🇸', offset: '-08:00', ianaTimezone: 'America/Los_Angeles', label: 'PST - Pacific Standard Time (UTC-8)' },
      { value: 'MST', name: 'MST - Mountain Standard Time', city: 'Denver', flag: '🇺🇸', offset: '-07:00', ianaTimezone: 'America/Denver', label: 'MST - Mountain Standard Time (UTC-7)' },
      { value: 'CST', name: 'CST - Central Standard Time', city: 'Chicago', flag: '🇺🇸', offset: '-06:00', ianaTimezone: 'America/Chicago', label: 'CST - Central Standard Time (UTC-6)' },
      { value: 'EST', name: 'EST - Eastern Standard Time', city: 'New York', flag: '🇺🇸', offset: '-05:00', ianaTimezone: 'America/New_York', label: 'EST - Eastern Standard Time (UTC-5)' },
      { value: 'HST', name: 'HST - Hawaii Standard Time', city: 'Honolulu', flag: '🇺🇸', offset: '-10:00', ianaTimezone: 'Pacific/Honolulu', label: 'HST - Hawaii Standard Time (UTC-10)' },
      // Basic European Timezones
      { value: 'CET', name: 'CET - Central European Time', city: 'Paris', flag: '🇫🇷', offset: '+01:00', ianaTimezone: 'Europe/Paris', label: 'CET - Central European Time (UTC+1)' },
      // Basic Asian Timezones
      { value: 'IST', name: 'IST - Indian Standard Time', city: 'Mumbai', flag: '🇮🇳', offset: '+05:30', ianaTimezone: 'Asia/Kolkata', label: 'IST - Indian Standard Time (UTC+5:30)' },
      { value: 'JST', name: 'JST - Japan Standard Time', city: 'Tokyo', flag: '🇯🇵', offset: '+09:00', ianaTimezone: 'Asia/Tokyo', label: 'JST - Japan Standard Time (UTC+9)' },
      { value: 'CST_CHINA', name: 'CST - China Standard Time', city: 'Shanghai', flag: '🇨🇳', offset: '+08:00', ianaTimezone: 'Asia/Shanghai', label: 'CST - China Standard Time (UTC+8)' },
      // Basic Oceania Timezones
      { value: 'AEST', name: 'AEST - Australian Eastern Standard Time', city: 'Sydney', flag: '🇦🇺', offset: '+10:00', ianaTimezone: 'Australia/Sydney', label: 'AEST - Australian Eastern Standard Time (UTC+10)' },
      { value: 'NZST', name: 'NZST - New Zealand Standard Time', city: 'Auckland', flag: '🇳🇿', offset: '+12:00', ianaTimezone: 'Pacific/Auckland', label: 'NZST - New Zealand Standard Time (UTC+12)' }
    ];
    // Also make fallback globally accessible
    window.enhancedTimezones = enhancedTimezones;
    console.warn('Fallback: Loaded basic timezone set');
  }
}

// Initialize custom dropdowns when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Initialize timezone data first
    initializeTimezones();

    // Create custom dropdown instances with comprehensive timezone data
    window.fromTimezoneDropdown = new CustomDropdown('from-timezone-custom', 'from-timezone', enhancedTimezones);
    window.toTimezoneDropdown = new CustomDropdown('to-timezone-custom', 'to-timezone', enhancedTimezones);

    // Add CSS for highlighted state
    const style = document.createElement('style');
    style.textContent = `
      .dropdown-option.highlighted {
        background: linear-gradient(135deg, #4a5568 0%, #718096 100%);
        color: #ffffff;
      }
    `;
    document.head.appendChild(style);

    console.log('Custom dropdowns initialized with Chrome storage persistence');
  } catch (error) {
    console.error('Failed to initialize custom dropdowns:', error);

    // Fallback: show the native selects if custom dropdowns fail
    document.querySelectorAll('select').forEach(select => {
      select.style.display = 'block';
    });
    document.querySelectorAll('.custom-select').forEach(customSelect => {
      customSelect.style.display = 'none';
    });
  }
});

// Debug function to check storage
window.debugStorage = async function() {
  try {
    const result = await chrome.storage.sync.get(['from-timezone', 'to-timezone']);
    console.log('Current storage values:', result);
  } catch (error) {
    console.error('Storage debug failed:', error);
  }
};

// Function to clear storage (for testing)
window.clearTimezoneStorage = async function() {
  try {
    await chrome.storage.sync.remove(['from-timezone', 'to-timezone']);
    console.log('Timezone storage cleared');
    window.location.reload();
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
};

// Cleanup when page unloads
window.addEventListener('beforeunload', function() {
  if (window.fromTimezoneDropdown) {
    window.fromTimezoneDropdown.destroy();
  }
  if (window.toTimezoneDropdown) {
    window.toTimezoneDropdown.destroy();
  }
});
