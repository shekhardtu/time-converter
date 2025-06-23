// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    if (command === 'convert-dates') {
      chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (data) => {
        if (data.fromTimezone && data.toTimezone) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'convertTime',
            from: data.fromTimezone,
            to: data.toTimezone
          }).catch(() => {
            // Ignore errors if content script not ready
          });
        }
      });
    } else if (command === 'revert-dates') {
      chrome.tabs.sendMessage(tab.id, {
        action: 'revertDates'
      }).catch(() => {
        // Ignore errors if content script not ready
      });
    }
  });
});

function getSystemTimezone() {
  try {
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Simple mapping for common cases, detailed mapping is in popup.js
    if (systemTz.includes('America/New_York')) return 'EST';
    if (systemTz.includes('America/Chicago')) return 'CST';
    if (systemTz.includes('America/Denver')) return 'MST';
    if (systemTz.includes('America/Los_Angeles')) return 'PST';
    if (systemTz.includes('Asia/Kolkata')) return 'IST';
    if (systemTz.includes('Europe/London')) return 'GMT';

    return 'UTC';
  } catch (e) {
    console.warn('Failed to detect system timezone, using UTC as fallback:', e);
    return 'UTC';
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (result) => {
    if (!result.fromTimezone) {
      const systemTz = getSystemTimezone();
      chrome.storage.sync.set({ fromTimezone: systemTz });
    }
    if (!result.toTimezone) {
      const systemTz = getSystemTimezone();
      const defaultToTz = systemTz === 'UTC' ? 'IST' : 'UTC';
      chrome.storage.sync.set({ toTimezone: defaultToTz });
    }
  });

});

// Handle page navigation and refresh
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.startsWith('http')
  ) {
    // Give content script time to load, then check if site should auto-convert
    setTimeout(() => {
      try {
        const hostname = new URL(tab.url).hostname;

        chrome.storage.sync.get(['fromTimezone', 'toTimezone', 'disabledSites'], (data) => {
          if (data.fromTimezone && data.toTimezone) {
            // Check if this site is disabled
            const disabledSites = data.disabledSites || [];
            if (disabledSites.includes(hostname)) {
              return;
            }

            // Only auto-convert if this is a fresh page load
            // The content script will handle checking for existing conversions
            chrome.tabs
              .sendMessage(tabId, {
                action: 'convertTime',
                from: data.fromTimezone,
                to: data.toTimezone
              })
              .catch(() => {
                // Ignore errors if content script not ready
              });
          }
        });
      } catch (e) {
        console.warn('Failed to parse URL for auto-conversion check:', e);
      }
    }, 1000); // Increased timeout to ensure content script is ready
  }
});
