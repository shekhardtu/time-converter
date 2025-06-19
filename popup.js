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
const statusDiv = document.getElementById('status');

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

function resetButton(text = 'Convert Timestamps', disabled = false) {
    convertBtn.textContent = text;
    convertBtn.disabled = disabled;
}

convertBtn.addEventListener('click', () => {
  savePreferences();
  resetButton('Converting...', true);
  statusDiv.textContent = '';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      statusDiv.textContent = 'No active tab found.';
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
            files: ['content.js']
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
                  console.error(chrome.runtime.lastError.message);
                  resetButton('Failed', false);
                } else if (response && response.status) {
                  statusDiv.textContent = response.status;
                } else {
                  statusDiv.textContent = 'Conversion failed or no dates found.';
                }
                setTimeout(() => resetButton(), 3000);
              });
            }, 300);
          });
        }).catch(err => {
          statusDiv.textContent = 'Error injecting script. See console.';
          resetButton('Error', false);
          console.error(err);
        });
      } else if (response && response.status) {
        statusDiv.textContent = response.status;
        setTimeout(() => resetButton(), 3000);
      } else {
        statusDiv.textContent = 'Conversion failed or no dates found.';
        setTimeout(() => resetButton(), 3000);
      }
    });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  populateTimezones();
  loadPreferences();

  // Check if timezones are set, if not, prompt user
  chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (data) => {
    if (!data.fromTimezone || !data.toTimezone) {
      statusDiv.textContent = 'Please set your default timezones.';
    }
  });
});
