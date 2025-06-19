chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (result) => {
    if (!result.fromTimezone) {
      chrome.storage.sync.set({ fromTimezone: 'UTC' });
    }
    if (!result.toTimezone) {
      chrome.storage.sync.set({ toTimezone: 'IST' });
    }
  });
});

// Handle page navigation and refresh
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        // Give content script time to load, then trigger conversion
        setTimeout(() => {
            chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (data) => {
                if (data.fromTimezone && data.toTimezone) {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'convertTime',
                        from: data.fromTimezone,
                        to: data.toTimezone
                    }).catch(() => {
                        // Ignore errors if content script not ready
                    });
                }
            });
        }, 500);
    }
});
