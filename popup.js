const timezones = [
  { value: 'UTC', label: 'UTC - Coordinated Universal Time' },
  { value: 'GMT', label: 'GMT - Greenwich Mean Time' },
  { value: 'PST', label: 'PST - Pacific Standard Time (UTC-8)' },
  { value: 'PDT', label: 'PDT - Pacific Daylight Time (UTC-7)' },
  { value: 'MST', label: 'MST - Mountain Standard Time (UTC-7)' },
  { value: 'MDT', label: 'MDT - Mountain Daylight Time (UTC-6)' },
  { value: 'CST', label: 'CST - Central Standard Time (UTC-6)' },
  { value: 'CDT', label: 'CDT - Central Daylight Time (UTC-5)' },
  { value: 'EST', label: 'EST - Eastern Standard Time (UTC-5)' },
  { value: 'EDT', label: 'EDT - Eastern Daylight Time (UTC-4)' },
  { value: 'IST', label: 'IST - Indian Standard Time (UTC+5:30)' },
  { value: 'AEST', label: 'AEST - Australian Eastern Standard Time (UTC+10)' },
  { value: 'JST', label: 'JST - Japan Standard Time (UTC+9)' },
  { value: 'CET', label: 'CET - Central European Time (UTC+1)' },
  { value: 'CEST', label: 'CEST - Central European Summer Time (UTC+2)' },
  { value: 'BST', label: 'BST - British Summer Time (UTC+1)' },
  { value: 'KST', label: 'KST - Korea Standard Time (UTC+9)' },
  { value: 'CST_CHINA', label: 'CST - China Standard Time (UTC+8)' },
  { value: 'NZST', label: 'NZST - New Zealand Standard Time (UTC+12)' },
  { value: 'HST', label: 'HST - Hawaii Standard Time (UTC-10)' }
];

const fromTimezoneSelect = document.getElementById('from-timezone');
const toTimezoneSelect = document.getElementById('to-timezone');
const convertBtn = document.getElementById('convert-btn');
const revertBtn = document.getElementById('revert-btn');
const footerDiv = document.querySelector('.popup-footer');
const customFormatToggle = document.getElementById('custom-format-toggle');
const customFormatForm = document.getElementById('custom-format-form');
const dateFormatInput = document.getElementById('date-format');
const formatDescriptionInput = document.getElementById('format-description');
const saveFormatBtn = document.getElementById('save-format-btn');
const cancelFormatBtn = document.getElementById('cancel-format-btn');
const siteDisableBtn = document.getElementById('site-disable-btn');
const siteDisableText = document.getElementById('site-disable-text');
const siteStatus = document.getElementById('site-status');
const pageDisableBtn = document.getElementById('page-disable-btn');
const pageDisableText = document.getElementById('page-disable-text');
const pageStatus = document.getElementById('page-status');
const customFormatText = document.getElementById('custom-format-text');

// -----------------------------
// Multi-timezone footer widget
// -----------------------------
const timezoneWidgetsContainer = document.getElementById('timezone-widgets');
const tzFlagMap = {
  'UTC': '🌐', 'GMT': '🌐', 'IST': '🇮🇳', 'EET': '🇷🇺', 'CET': '🇫🇷', 'CEST': '🇪🇺',
  'PST': '🇺🇸', 'PDT': '🇺🇸', 'MST': '🇺🇸', 'MDT': '🇺🇸', 'CST': '🇺🇸', 'CDT': '🇺🇸',
  'EST': '🇺🇸', 'EDT': '🇺🇸', 'AEST': '🇦🇺', 'JST': '🇯🇵', 'BST': '🇬🇧', 'KST': '🇰🇷',
  'CST_CHINA': '🇨🇳', 'NZST': '🇳🇿', 'HST': '🇺🇸'
};

const tzToIana = {
  'UTC': 'UTC', 'GMT': 'Etc/GMT', 'IST': 'Asia/Kolkata', 'EET': 'Europe/Kaliningrad',
  'CET': 'Europe/Paris', 'CEST': 'Europe/Berlin', 'PST': 'America/Los_Angeles',
  'PDT': 'America/Los_Angeles', 'MST': 'America/Denver', 'MDT': 'America/Denver',
  'CST': 'America/Chicago', 'CDT': 'America/Chicago', 'EST': 'America/New_York',
  'EDT': 'America/New_York', 'AEST': 'Australia/Sydney', 'JST': 'Asia/Tokyo',
  'BST': 'Europe/London', 'KST': 'Asia/Seoul', 'CST_CHINA': 'Asia/Shanghai',
  'NZST': 'Pacific/Auckland', 'HST': 'Pacific/Honolulu'
};

const defaultWidgetTimezones = ['UTC', getSystemTimezone(), 'EET'];

function renderTimezoneWidgets() {
  if (!timezoneWidgetsContainer) return;
  chrome.storage.sync.get(['widgetTimezones'], (data) => {
    const tzList = Array.isArray(data.widgetTimezones) && data.widgetTimezones.length ? data.widgetTimezones : defaultWidgetTimezones;
    timezoneWidgetsContainer.innerHTML = '';
    tzList.forEach((tz, idx) => {
      const widget = document.createElement('div');
      widget.className = 'tz-widget';
      widget.title = 'Click to change timezone';
      widget.dataset.index = idx.toString();
      widget.dataset.tz = tz;
      widget.innerHTML = `
        <div class="tz-time" id="tz-time-${idx}"></div>
        <div class="tz-label">${tz}</div>
      `;
      widget.addEventListener('click', () => openTimezoneSelect(idx, tz));
      timezoneWidgetsContainer.appendChild(widget);
    });
    updateWidgetTimes();
  });
}

// Global interval ID for time updates
let timeUpdateInterval;

// Only updates the seconds for improved performance
function updateSecondsOnly() {
  if (!timezoneWidgetsContainer) return;
  const now = new Date();
  const secondsStr = now.getSeconds().toString().padStart(2, '0');

  const secondsSpans = timezoneWidgetsContainer.querySelectorAll('.tz-time-seconds');
  secondsSpans.forEach(span => {
    span.textContent = `:${secondsStr}`;
  });
}

// Builds or updates the timezone widgets
function updateWidgetTimes(fullUpdate = true) {
  if (!timezoneWidgetsContainer) return;
  const now = new Date();
  const widgets = timezoneWidgetsContainer.querySelectorAll('.tz-widget');

  // Get UTC offset for reference
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));

  widgets.forEach((w, idx) => {
    const tz = w.dataset.tz;
    const iana = tzToIana[tz] || tz;

    // Create date object for the timezone
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: iana }));

    // Calculate offset from UTC in hours (positive means ahead of UTC)
    const offsetMinutes = Math.round((tzDate - utcDate) / (1000 * 60));
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;

    let offsetStr;
    if (offsetMinutes === 0) {
      offsetStr = '+00:00';
    } else if (offsetMinutes > 0) {
      offsetStr = `+${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
    } else {
      offsetStr = `-${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
    }

    // Format date and time strings
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', timeZone: iana });
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: iana });
    const secondsStr = now.getSeconds().toString().padStart(2, '0');

    const timeElem = w.querySelector(`#tz-time-${idx}`);

    if (timeElem) {
      // For full updates, handle the date line and rebuild the time elements
      if (fullUpdate) {
        // First get or create the date-flag line (row 1)
        let dateLineElem = w.querySelector('.tz-date-line');
        if (!dateLineElem) {
          // Create date-flag container
          dateLineElem = document.createElement('div');
          dateLineElem.className = 'tz-date-line';

          // Flag part
          const flagSpan = document.createElement('span');
          flagSpan.className = 'tz-flag';
          flagSpan.textContent = tzFlagMap[tz] || '';
          dateLineElem.appendChild(flagSpan);

          // Date part
          const dateSpan = document.createElement('span');
          dateSpan.className = 'tz-date';
          dateLineElem.appendChild(dateSpan);

          // Insert at top of widget
          w.insertBefore(dateLineElem, w.firstChild);
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
  if (!timeUpdateInterval) {
    timeUpdateInterval = setInterval(() => {
      updateWidgetTimes(false); // Only update seconds for better performance
    }, 1000); // Update every second
  }
}

// Clear interval when popup closes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  } else if (document.visibilityState === 'visible' && !timeUpdateInterval) {
    updateWidgetTimes(); // Restart updates
  }
});

function openTimezoneSelect(index, currentTz) {
  if (!timezoneWidgetsContainer) return;
  const select = document.createElement('select');
  select.className = 'tz-select-inline';
  // Prevent propagation so widget click handler doesn't re-trigger while interacting with select
  ['click','mousedown','mouseup'].forEach(evt => select.addEventListener(evt, e => e.stopPropagation()));
  timezones.forEach(tzObj => {
    const opt = document.createElement('option');
    opt.value = tzObj.value;
    opt.textContent = tzObj.label;
    if (tzObj.value === currentTz) opt.selected = true;
    select.appendChild(opt);
  });
  const widget = timezoneWidgetsContainer.children[index];
  widget.innerHTML = '';
  widget.appendChild(select);
  select.focus();

  const saveSelection = () => {
    chrome.storage.sync.get(['widgetTimezones'], (data) => {
      const tzList = Array.isArray(data.widgetTimezones) && data.widgetTimezones.length ? data.widgetTimezones : defaultWidgetTimezones.slice();
      tzList[index] = select.value;
      chrome.storage.sync.set({ widgetTimezones: tzList }, () => {
        renderTimezoneWidgets();
      });
    });
  };

  // Save on change only – do not save on blur which was causing premature close
  select.addEventListener('change', (e) => {
    e.stopPropagation();
    saveSelection();
  });
}


function populateTimezones() {
  timezones.forEach(tz => {
    const fromOption = document.createElement('option');
    fromOption.value = tz.value;
    fromOption.textContent = tz.label;
    fromTimezoneSelect.appendChild(fromOption);

    const toOption = document.createElement('option');
    toOption.value = tz.value;
    toOption.textContent = tz.label;
    toTimezoneSelect.appendChild(toOption);
  });
}

function savePreferences() {
  const from = fromTimezoneSelect.value;
  const to = toTimezoneSelect.value;
  chrome.storage.sync.set({ fromTimezone: from, toTimezone: to });
}

function getSystemTimezone() {
  try {
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Detected system timezone:', systemTz);

    // Map common IANA timezones to our abbreviated list
    const tzMap = {
      'America/Los_Angeles': 'PST',
      'America/Denver': 'MST',
      'America/Chicago': 'CST',
      'America/New_York': 'EST',
      'Asia/Kolkata': 'IST',
      'Australia/Sydney': 'AEST',
      'Asia/Tokyo': 'JST',
      'Europe/Paris': 'CET',
      'Europe/London': 'GMT',
      'Europe/Berlin': 'CET',
      'Asia/Shanghai': 'JST',
      'America/Toronto': 'EST',
      'America/Vancouver': 'PST'
    };

    const mapped = tzMap[systemTz] || 'UTC';
    console.log('Mapped timezone:', mapped);
    return mapped;
  } catch (e) {
    console.warn('Failed to detect system timezone, using UTC as fallback:', e);
    return 'UTC';
  }
}

function loadPreferences() {
  chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (result) => {
    if (result.fromTimezone) {
      fromTimezoneSelect.value = result.fromTimezone;
    } else {
      // Use system timezone as default
      const systemTz = getSystemTimezone();
      fromTimezoneSelect.value = systemTz;
    }
    if (result.toTimezone) {
      toTimezoneSelect.value = result.toTimezone;
    } else {
      // Default to a different timezone for conversion
      const systemTz = getSystemTimezone();
      toTimezoneSelect.value = systemTz === 'UTC' ? 'IST' : 'UTC';
    }
  });
}

function setButtonStates(convertActive = true) {
  console.log('Setting button states - convertActive:', convertActive);

  if (convertActive) {
    convertBtn.className = 'btn-primary btn-active';
    revertBtn.className = 'btn-secondary btn-inactive';
    convertBtn.disabled = false;
    revertBtn.disabled = true;
    document.getElementById('convert-text').textContent = 'Convert';
  } else {
    convertBtn.className = 'btn-primary btn-inactive';
    revertBtn.className = 'btn-secondary btn-active';
    convertBtn.disabled = true;
    revertBtn.disabled = false;
    document.getElementById('convert-text').textContent = 'Convert';
  }
}

function resetButton(text = null, disabled = false) {
  // If no text provided, use default
  if (!text) {
    text = 'Convert';
  }

  // Update the text content
  document.getElementById('convert-text').textContent = text;
  convertBtn.disabled = disabled;

  // Clear any timeout that might interfere
  if (window.convertTimeout) {
    clearTimeout(window.convertTimeout);
    window.convertTimeout = null;
  }
}

// Note: resetStatusDiv is now handled by revertToTimeDisplay

function handleConversionResponse(response) {
  console.log('Handling conversion response:', response);

  // Clear any existing timeout
  if (window.convertTimeout) {
    clearTimeout(window.convertTimeout);
    window.convertTimeout = null;
  }

  let statusType = 'info';
  if (response.status.includes('Converted') || response.status.includes('Already converted')) {
    statusType = 'success';
    console.log('Conversion successful, switching to revert mode');
    setButtonStates(false); // Switch to revert mode
  } else if (response.status.includes('No dates found')) {
    statusType = 'info';
    console.log('No dates found, keeping convert mode');
    setButtonStates(true);
  } else if (response.status.includes('Error')) {
    statusType = 'error';
    console.error('Conversion error:', response.status);
    setButtonStates(true);
  } else {
    statusType = 'info';
    console.log('Unknown response, keeping convert mode');
    setButtonStates(true);
  }

  showStatus(response.status, statusType);
}

convertBtn.addEventListener('click', async () => {
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
      from: fromTimezoneSelect.value,
      to: toTimezoneSelect.value
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
            files: ['lib/date-fns.umd.min.js', 'lib/date-fns-tz.umd.min.js', 'content.js']
          });
        }).then(() => {
          console.log('Scripts injected, waiting and sending message...');
          // Wait a bit for script to initialize, then send message
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'convertTime',
              from: fromTimezoneSelect.value,
              to: toTimezoneSelect.value
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
});

// Revert button functionality
revertBtn.addEventListener('click', () => {
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
});


// Save custom format
saveFormatBtn.addEventListener('click', () => {
  const pattern = dateFormatInput.value.trim();
  const description = formatDescriptionInput.value.trim();

  if (!pattern) {
    showStatus('Please enter a date format pattern', 'error');
    return;
  }

  showStatus('Saving custom format...', 'info', 10000);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      showStatus('No active tab found.', 'error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'addCustomFormat',
      pattern: pattern,
      description: description || 'Custom format'
    }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Error saving format. Please reload the page.', 'error');
      } else if (response && response.status) {
        const statusType = response.status.includes('saved') ? 'success' : 'info';
        showStatus(response.status, statusType);
        if (response.status.includes('saved')) {
          // Hide form and reset
          customFormatForm.classList.add('hidden');
          changeIcon(customFormatToggle.querySelector('.icon-container'), 'plus');
          document.getElementById('custom-format-text').textContent = 'Add Custom Format';
          dateFormatInput.value = '';
          formatDescriptionInput.value = '';
        }
      }
    });
  });
});

// Cancel custom format
cancelFormatBtn.addEventListener('click', () => {
  customFormatForm.classList.add('hidden');
  changeIcon(customFormatToggle.querySelector('.icon-container'), 'plus');
  document.getElementById('custom-format-text').textContent = 'Add Custom Format';
  dateFormatInput.value = '';
  formatDescriptionInput.value = '';
});

// Site disable/enable functionality
function getCurrentSiteUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          resolve(url.hostname);
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

function getCurrentPageUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          // Use pathname for page-specific disabling
          resolve(url.hostname + url.pathname);
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

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

async function updateSiteDisableUI() {
  const hostname = await getCurrentSiteUrl();
  const isDisabled = await checkSiteDisableStatus();
  const pageDisabled = await checkPageDisableStatus();

  if (!hostname) {
    siteDisableBtn.disabled = true;
    siteDisableText.textContent = 'Disable Site';
    changeIcon(siteDisableBtn.querySelector('.icon-container'), 'disable');
    updateExtensionIcon(true);
    return;
  }

  siteDisableBtn.disabled = false;

  if (isDisabled) {
    siteDisableText.textContent = 'Enable Site';
    changeIcon(siteDisableBtn.querySelector('.icon-container'), 'enable');
    siteDisableBtn.classList.add('active');

    // Show status indicator
    const siteStatusText = document.getElementById('site-status-text');
    siteStatusText.textContent = `Site disabled: ${hostname}`;
    changeIcon(siteStatus.querySelector('.icon-container'), 'disable');
    siteStatus.classList.remove('hidden');

    // Disable convert/revert buttons when site is disabled
    convertBtn.disabled = true;
    revertBtn.disabled = true;
    convertBtn.className = 'btn-primary btn-inactive';
    revertBtn.className = 'btn-secondary btn-inactive';

    // Update extension icon to show disabled state
    updateExtensionIcon(false);
  } else {
    siteDisableText.textContent = 'Disable Site';
    changeIcon(siteDisableBtn.querySelector('.icon-container'), 'disable');
    siteDisableBtn.classList.remove('active');
    siteStatus.classList.add('hidden');

    // Update extension icon based on page status
    updateExtensionIcon(!pageDisabled);
  }
}

async function updatePageDisableUI() {
  const pageUrl = await getCurrentPageUrl();
  const isDisabled = await checkPageDisableStatus();
  const siteDisabled = await checkSiteDisableStatus();

  if (!pageUrl) {
    pageDisableBtn.disabled = true;
    pageDisableText.textContent = 'Disable Page';
    changeIcon(pageDisableBtn.querySelector('.icon-container'), 'page-disable');
    updateExtensionIcon(!siteDisabled);
    return;
  }

  pageDisableBtn.disabled = false;

  if (isDisabled) {
    pageDisableText.textContent = 'Enable Page';
    changeIcon(pageDisableBtn.querySelector('.icon-container'), 'page-enable');
    pageDisableBtn.classList.add('active');

    // Show status indicator
    const pageStatusText = document.getElementById('page-status-text');
    const url = new URL('http://' + pageUrl);
    pageStatusText.textContent = `Page disabled: ${url.pathname}`;
    changeIcon(pageStatus.querySelector('.icon-container'), 'page-disable');
    pageStatus.classList.remove('hidden');

    // Disable convert/revert buttons when page is disabled
    convertBtn.disabled = true;
    revertBtn.disabled = true;
    convertBtn.className = 'btn-primary btn-inactive';
    revertBtn.className = 'btn-secondary btn-inactive';

    // Update extension icon to show disabled state
    updateExtensionIcon(false);
  } else {
    pageDisableText.textContent = 'Disable Page';
    changeIcon(pageDisableBtn.querySelector('.icon-container'), 'page-disable');
    pageDisableBtn.classList.remove('active');
    pageStatus.classList.add('hidden');

    // Update extension icon based on site status
    updateExtensionIcon(!siteDisabled);
  }
}

async function toggleSiteDisable() {
  const hostname = await getCurrentSiteUrl();
  if (!hostname) return;

  const isCurrentlyDisabled = await checkSiteDisableStatus();

  chrome.storage.sync.get(['disabledSites'], (data) => {
    let disabledSites = data.disabledSites || [];

    if (isCurrentlyDisabled) {
      // Enable the site
      disabledSites = disabledSites.filter(site => site !== hostname);

      const refreshHandler = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (tab) {
            chrome.tabs.reload(tab.id);
          }
        });
      };

      showStatus(`Enabled conversion for ${hostname}. Click here to refresh page.`, 'success', 8000, refreshHandler);
    } else {
      // Disable the site
      if (!disabledSites.includes(hostname)) {
        disabledSites.push(hostname);
      }
      showStatus(`Disabled conversion for ${hostname}`, 'info');

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

async function togglePageDisable() {
  const pageUrl = await getCurrentPageUrl();
  if (!pageUrl) return;

  const isCurrentlyDisabled = await checkPageDisableStatus();

  chrome.storage.sync.get(['disabledPages'], (data) => {
    let disabledPages = data.disabledPages || [];

    if (isCurrentlyDisabled) {
      // Enable the page
      disabledPages = disabledPages.filter(page => page !== pageUrl);
      const url = new URL('http://' + pageUrl);

      const refreshHandler = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (tab) {
            chrome.tabs.reload(tab.id);
          }
        });
      };

      showStatus(`Enabled conversion for ${url.pathname}. Click here to refresh page.`, 'success', 8000, refreshHandler);
    } else {
      // Disable the page
      if (!disabledPages.includes(pageUrl)) {
        disabledPages.push(pageUrl);
      }
      const url = new URL('http://' + pageUrl);
      showStatus(`Disabled conversion for ${url.pathname}`, 'info');

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

// Enhanced custom format toggle with better UX
customFormatToggle.addEventListener('click', () => {
  const isHidden = customFormatForm.classList.contains('hidden');
  const iconContainer = customFormatToggle.querySelector('.icon-container');

  if (isHidden) {
    customFormatForm.classList.remove('hidden');
    changeIcon(iconContainer, 'close');
    customFormatText.textContent = 'Cancel';
    customFormatToggle.classList.add('active');
  } else {
    customFormatForm.classList.add('hidden');
    changeIcon(iconContainer, 'plus');
    customFormatText.textContent = 'Add Format';
    customFormatToggle.classList.remove('active');
    // Clear form
    dateFormatInput.value = '';
    formatDescriptionInput.value = '';
  }
});

// Button event handlers
siteDisableBtn.addEventListener('click', toggleSiteDisable);
pageDisableBtn.addEventListener('click', togglePageDisable);

// Initialize all icon containers on page load
function initializeIcons() {
  const iconContainers = document.querySelectorAll('.icon-container');
  iconContainers.forEach(container => {
    const iconId = container.dataset.icon;
    if (iconId) {
      changeIcon(container, iconId);
    }
  });
}

// Helper function to change icon by cloning from templates
function changeIcon(container, iconId) {
  if (!container) return;

  // Clear existing content
  container.innerHTML = '';

  // Clone the icon from templates
  const iconTemplate = document.getElementById(`icon-${iconId}`);
  if (iconTemplate) {
    const iconClone = iconTemplate.cloneNode(true);
    container.appendChild(iconClone);
  }
}


// Listen for highlight changes from context menu actions
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'highlightsChanged') {
    console.log('Highlights changed, checking new state...');
    // Re-check the current state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'checkExistingHighlights'
        }, (response) => {
          if (!chrome.runtime.lastError && response) {
            console.log('Updated button state based on context menu action');
            if (response.hasHighlights) {
              setButtonStates(false); // Still have highlights, keep revert enabled
            } else {
              setButtonStates(true); // No highlights left, enable convert
            }
          }
        });
      }
    });
  }
});

// Status management with auto-revert to time
let statusTimeout;
let isShowingStatus = false;

// System time and timezone display
function updateSystemTime() {
  if (isShowingStatus) return; // Don't update time while showing status

  const now = new Date();



}

// Show status in footer with auto-revert
function showStatus(message, type = 'info', duration = 3000, clickHandler = null) {
  if (!footerDiv) return;

  // Clear existing timeout
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }

  // Update footer appearance
  footerDiv.className = 'popup-footer';
  if (type === 'success') {
    footerDiv.classList.add('status-success');
  } else if (type === 'error') {
    footerDiv.classList.add('status-error');
  } else {
    footerDiv.classList.add('status-mode');
  }

  if (clickHandler) {
    footerDiv.classList.add('status-clickable');
    footerDiv.style.cursor = 'pointer';
    footerDiv.onclick = clickHandler;
  } else {
    footerDiv.onclick = null;
    footerDiv.style.cursor = 'default';
  }

  // Show status message
  isShowingStatus = true;

  // Auto-revert to time display
  statusTimeout = setTimeout(() => {
    revertToTimeDisplay();
  }, duration);
}

// Revert footer back to time display
function revertToTimeDisplay() {
  if (!footerDiv) return;

  footerDiv.className = 'popup-footer';
  footerDiv.onclick = null;
  footerDiv.style.cursor = 'default';
  isShowingStatus = false;

  // Immediately update time display
  updateSystemTime();
}

// Update extension icon based on state
function updateExtensionIcon(isActive) {
  chrome.action.setIcon({
    path: {
      '16': isActive ? 'images/icon16.png' : 'images/icon16-disabled.png',
      '32': isActive ? 'images/icon32.png' : 'images/icon32-disabled.png',
      '48': isActive ? 'images/icon48.png' : 'images/icon48-disabled.png',
      '128': isActive ? 'images/icon128.png' : 'images/icon128-disabled.png'
    }
  });

  chrome.action.setBadgeText({
    text: isActive ? '' : '⏸'
  });

  chrome.action.setBadgeBackgroundColor({
    color: isActive ? '#2563eb' : '#9ca3af'
  });
}

// Add change listeners to timezone dropdowns
function addDropdownListeners() {
  fromTimezoneSelect.addEventListener('change', () => {
    console.log('From timezone changed, enabling convert if currently in revert mode');
    // If we're in revert mode and user changes settings, switch to convert mode
    if (convertBtn.disabled && !revertBtn.disabled) {
      setButtonStates(true);
      showStatus('Settings changed - ready to convert', 'info', 2000);
    }
    savePreferences();
  });

  toTimezoneSelect.addEventListener('change', () => {
    console.log('To timezone changed, enabling convert if currently in revert mode');
    // If we're in revert mode and user changes settings, switch to convert mode
    if (convertBtn.disabled && !revertBtn.disabled) {
      setButtonStates(true);
      showStatus('Settings changed - ready to convert', 'info', 2000);
    }
    savePreferences();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  populateTimezones();
  loadPreferences();
  addDropdownListeners();

  // Initialize both site and page disable UI
  await updateSiteDisableUI();
  await updatePageDisableUI();

  // Initialize icons
  initializeIcons();

  // Start system time ticker
  updateSystemTime();
  setInterval(updateSystemTime, 1000);

  // Render and start multi-timezone footer widgets
  renderTimezoneWidgets();
  setInterval(updateWidgetTimes, 1000);

  // Check if there are already converted dates on the current page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab) {
      // Try to check if there are existing highlights
      chrome.tabs.sendMessage(tab.id, {
        action: 'checkExistingHighlights'
      }, (response) => {
        console.log('Initial highlight check response:', response);
        if (chrome.runtime.lastError) {
          // Content script not ready, use default state
          console.log('Content script not ready, setting convert mode');
          setButtonStates(true);
        } else if (response && response.hasHighlights) {
          // There are existing highlights, enable revert mode
          console.log('Found existing highlights, setting revert mode');
          setButtonStates(false);
        } else {
          // No highlights, use convert mode
          console.log('No highlights found, setting convert mode');
          setButtonStates(true);
        }
      });
    } else {
      setButtonStates(true);
    }
  });

  // Check if timezones are set, if not, prompt user
  chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (data) => {
    if (!data.fromTimezone || !data.toTimezone) {
      showStatus('Please set your default timezones.', 'info', 5000);
    } else {
      showStatus(`Ready to convert ${data.fromTimezone} -> ${data.toTimezone}`, 'info', 3000);
    }
  });

  // Set initial extension icon state
  const siteDisabled = await checkSiteDisableStatus();
  const pageDisabled = await checkPageDisableStatus();
  updateExtensionIcon(!siteDisabled && !pageDisabled);
});
