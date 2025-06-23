// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);

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
    console.log('Detected system timezone:', systemTz);

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

  // Create context menus - always visible, but only functional on highlighted elements
  console.log('Creating context menus...');

  chrome.contextMenus.create(
    {
      id: 'removeThisHighlight',
      title: 'Remove this highlight',
      contexts: ['all'],
      documentUrlPatterns: ['<all_urls>']
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error creating removeThisHighlight menu:',
          chrome.runtime.lastError
        );
      } else {
        console.log('Created removeThisHighlight menu');
      }
    }
  );

  chrome.contextMenus.create(
    {
      id: 'removeAllHighlightsOfFormat',
      title: 'Remove all highlights of this format',
      contexts: ['all'],
      documentUrlPatterns: ['<all_urls>']
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error creating removeAllHighlightsOfFormat menu:',
          chrome.runtime.lastError
        );
      } else {
        console.log('Created removeAllHighlightsOfFormat menu');
      }
    }
  );

  chrome.contextMenus.create(
    {
      id: 'separator',
      type: 'separator',
      contexts: ['all'],
      documentUrlPatterns: ['<all_urls>']
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error creating separator menu:',
          chrome.runtime.lastError
        );
      } else {
        console.log('Created separator menu');
      }
    }
  );

  chrome.contextMenus.create(
    {
      id: 'clearStoplist',
      title: 'Clear removed formats',
      contexts: ['all'],
      documentUrlPatterns: ['<all_urls>']
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error creating clearStoplist menu:',
          chrome.runtime.lastError
        );
      } else {
        console.log('Created clearStoplist menu');
      }
    }
  );
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
              console.log(`Auto-conversion skipped for disabled site: ${hostname}`);
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

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);

  if (
    info.menuItemId === 'removeThisHighlight' ||
    info.menuItemId === 'removeAllHighlightsOfFormat' ||
    info.menuItemId === 'clearStoplist'
  ) {
    chrome.tabs
      .sendMessage(tab.id, {
        action: info.menuItemId
      })
      .then((response) => {
        console.log('Response from content script:', response);
        if (response && response.status) {
          // Show a notification or badge to indicate the action was performed
          chrome.action.setBadgeText({
            text: '✓',
            tabId: tab.id
          });
          chrome.action.setBadgeBackgroundColor({
            color: '#22c55e',
            tabId: tab.id
          });

          // Clear the badge after 2 seconds
          setTimeout(() => {
            chrome.action.setBadgeText({
              text: '',
              tabId: tab.id
            });
          }, 2000);

          // If highlights were removed, notify any open popup about state change
          if (
            response.status.includes('removed') ||
            response.status.includes('Highlight removed')
          ) {
            chrome.runtime
              .sendMessage({
                action: 'highlightsChanged',
                removed: true
              })
              .catch(() => {
                // Ignore if no popup is open
              });
          }
        }
      })
      .catch((error) => {
        console.error('Error sending message to content script:', error);
        // Show error badge
        chrome.action.setBadgeText({
          text: '✗',
          tabId: tab.id
        });
        chrome.action.setBadgeBackgroundColor({
          color: '#ef4444',
          tabId: tab.id
        });

        setTimeout(() => {
          chrome.action.setBadgeText({
            text: '',
            tabId: tab.id
          });
        }, 2000);
      });
  }
});
