const timezones = [
  'UTC',
  'GMT',
  'PST', // Pacific Standard Time (UTC-8)
  'PDT', // Pacific Daylight Time (UTC-7)
  'MST', // Mountain Standard Time (UTC-7)
  'MDT', // Mountain Daylight Time (UTC-6)
  'CST', // Central Standard Time (UTC-6)
  'CDT', // Central Daylight Time (UTC-5)
  'EST', // Eastern Standard Time (UTC-5)
  'EDT', // Eastern Daylight Time (UTC-4)
  'IST', // Indian Standard Time (UTC+5:30)
  'AEST', // Australian Eastern Standard Time (UTC+10)
  'JST', // Japan Standard Time (UTC+9)
  'CET' // Central European Time (UTC+1)
];

const fromTimezoneSelect = document.getElementById('from-timezone');
const toTimezoneSelect = document.getElementById('to-timezone');
const convertBtn = document.getElementById('convert-btn');
const revertBtn = document.getElementById('revert-btn');
const statusDiv = document.getElementById('status');
const customFormatToggle = document.getElementById('custom-format-toggle');
const customFormatForm = document.getElementById('custom-format-form');
const dateFormatInput = document.getElementById('date-format');
const formatDescriptionInput = document.getElementById('format-description');
const saveFormatBtn = document.getElementById('save-format-btn');
const cancelFormatBtn = document.getElementById('cancel-format-btn');

function populateTimezones() {
  timezones.forEach(tz => {
    const fromOption = document.createElement('option');
    fromOption.value = tz;
    fromOption.textContent = tz;
    fromTimezoneSelect.appendChild(fromOption);

    const toOption = document.createElement('option');
    toOption.value = tz;
    toOption.textContent = tz;
    toTimezoneSelect.appendChild(toOption);
  });
}

function savePreferences() {
  const from = fromTimezoneSelect.value;
  const to = toTimezoneSelect.value;
  chrome.storage.sync.set({ fromTimezone: from, toTimezone: to });
}

function loadPreferences() {
  chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (result) => {
    if (result.fromTimezone) {
      fromTimezoneSelect.value = result.fromTimezone;
    } else {
      fromTimezoneSelect.value = 'UTC'; // Default value
    }
    if (result.toTimezone) {
      toTimezoneSelect.value = result.toTimezone;
    } else {
      toTimezoneSelect.value = 'IST'; // Default value
    }
  });
}

function setButtonStates(convertActive = true) {
  if (convertActive) {
    convertBtn.className = 'btn-primary btn-active';
    revertBtn.className = 'btn-secondary btn-inactive';
    convertBtn.disabled = false;
    revertBtn.disabled = true;
  } else {
    convertBtn.className = 'btn-primary btn-inactive';
    revertBtn.className = 'btn-secondary btn-active';
    convertBtn.disabled = true;
    revertBtn.disabled = false;
  }

  // Keep status text visible and don't clear it
  if (statusDiv.textContent === '') {
    chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (data) => {
      if (data.fromTimezone && data.toTimezone) {
        statusDiv.textContent = `Ready to convert ${data.fromTimezone} -> ${data.toTimezone}`;
      }
    });
  }
}

function resetButton(text = 'Convert', disabled = false) {
    const icon = `<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
    </svg>`;
    convertBtn.innerHTML = `${icon} ${text}`;
    convertBtn.disabled = disabled;
}

convertBtn.addEventListener('click', () => {
  savePreferences();
  resetButton('Converting...', true);
  statusDiv.textContent = 'Converting dates...';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      statusDiv.textContent = '❌ No active tab found.';
      resetButton('Error', false);
      return;
    }

    // First try to send message to existing content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'convertTime',
      from: fromTimezoneSelect.value,
      to: toTimezoneSelect.value
    }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // If content script not ready, inject and try again
        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["style.css"]
        }).then(() => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['lib/date-fns.umd.min.js', 'lib/date-fns-tz.umd.min.js', 'content.js']
          }).then(() => {
            // Wait a bit for script to initialize, then send message
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                action: 'convertTime',
                from: fromTimezoneSelect.value,
                to: toTimezoneSelect.value
              }, (response) => {
                if (chrome.runtime.lastError) {
                  statusDiv.textContent = 'Error: Conversion failed. Please reload the page and try again.';
                  resetButton('Failed', false);
                } else if (response && response.status) {
                  statusDiv.textContent = response.status;
                  if (response.status.includes('Converted')) {
                    // Both "Converted" and "Already converted" should enable revert mode
                    setButtonStates(false); // Switch to revert mode
                    setTimeout(() => {
                      resetButton('Convert', true); // Keep convert button disabled
                    }, 3000);
                  } else {
                    setButtonStates(true); // Keep convert mode for failed conversions or no dates found
                    setTimeout(() => {
                      resetButton('Convert', false);
                    }, 3000);
                  }
                } else {
                  statusDiv.textContent = 'Conversion failed or no dates found.';
                  setButtonStates(true);
                  setTimeout(() => {
                    resetButton('Convert', false);
                  }, 3000);
                }
              });
            }, 300);
          });
        }).catch(err => {
          statusDiv.textContent = '❌ Error injecting script. See console.';
          resetButton('Error', false);
        });
      } else if (response && response.status) {
        statusDiv.textContent = response.status;
        if (response.status.includes('Converted')) {
          // Both "Converted" and "Already converted" should enable revert mode
          setButtonStates(false); // Switch to revert mode
          setTimeout(() => {
            resetButton('Convert', true); // Keep convert button disabled
          }, 3000);
        } else {
          setButtonStates(true); // Keep convert mode for failed conversions or no dates found
          setTimeout(() => {
            resetButton('Convert', false);
          }, 3000);
        }
      } else {
        statusDiv.textContent = 'Conversion failed or no dates found.';
        setButtonStates(true);
        setTimeout(() => resetButton('Convert', false), 3000);
      }
    });
  });
});

// Revert button functionality
revertBtn.addEventListener('click', () => {
  statusDiv.textContent = 'Reverting dates...';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      statusDiv.textContent = 'No active tab found.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'revertDates'
    }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = 'Error reverting dates. Please reload the page.';
      } else if (response && response.status) {
        statusDiv.textContent = response.status;
        setButtonStates(true); // Switch back to convert mode
      } else {
        statusDiv.textContent = 'No converted dates found to revert.';
        setButtonStates(true);
      }
    });
  });
});

// Custom format toggle
customFormatToggle.addEventListener('click', () => {
  const isHidden = customFormatForm.classList.contains('hidden');
  if (isHidden) {
    customFormatForm.classList.remove('hidden');
    customFormatToggle.innerHTML = `
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      Cancel
    `;
  } else {
    customFormatForm.classList.add('hidden');
    customFormatToggle.innerHTML = `
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      Add Custom Format
    `;
    // Clear form
    dateFormatInput.value = '';
    formatDescriptionInput.value = '';
  }
});

// Save custom format
saveFormatBtn.addEventListener('click', () => {
  const pattern = dateFormatInput.value.trim();
  const description = formatDescriptionInput.value.trim();

  if (!pattern) {
    statusDiv.textContent = 'Please enter a date format pattern';
    return;
  }

  statusDiv.textContent = 'Saving custom format...';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      statusDiv.textContent = 'No active tab found.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'addCustomFormat',
      pattern: pattern,
      description: description || 'Custom format'
    }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = 'Error saving format. Please reload the page.';
      } else if (response && response.status) {
        statusDiv.textContent = response.status;
        if (response.status.includes('saved')) {
          // Hide form and reset
          customFormatForm.classList.add('hidden');
          customFormatToggle.innerHTML = `
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add Custom Format
          `;
          dateFormatInput.value = '';
          formatDescriptionInput.value = '';
        }
        setTimeout(() => {
          statusDiv.textContent = '';
        }, 3000);
      }
    });
  });
});

// Cancel custom format
cancelFormatBtn.addEventListener('click', () => {
  customFormatForm.classList.add('hidden');
  customFormatToggle.innerHTML = `
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
    </svg>
    Add Custom Format
  `;
  dateFormatInput.value = '';
  formatDescriptionInput.value = '';
});

// Listen for highlight changes from context menu actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

document.addEventListener('DOMContentLoaded', () => {
  populateTimezones();
  loadPreferences();

  // Check if there are already converted dates on the current page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab) {
      // Try to check if there are existing highlights
      chrome.tabs.sendMessage(tab.id, {
        action: 'checkExistingHighlights'
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not ready, use default state
          setButtonStates(true);
        } else if (response && response.hasHighlights) {
          // There are existing highlights, enable revert mode
          setButtonStates(false);
        } else {
          // No highlights, use convert mode
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
      statusDiv.textContent = 'Please set your default timezones.';
    } else {
      statusDiv.textContent = `Ready to convert ${data.fromTimezone} -> ${data.toTimezone}`;
    }
  });
});
