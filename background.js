chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (result) => {
    if (!result.fromTimezone) {
      chrome.storage.sync.set({ fromTimezone: 'UTC' });
    }
    if (!result.toTimezone) {
      chrome.storage.sync.set({ toTimezone: 'IST' });
    }
  });

  // Create context menus - always visible, but only functional on highlighted elements
  console.log('Creating context menus...');
  
  chrome.contextMenus.create({
    id: 'removeThisHighlight',
    title: 'TimeConverter: Remove this highlight',
    contexts: ['all'],
    documentUrlPatterns: ['<all_urls>']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error creating removeThisHighlight menu:', chrome.runtime.lastError);
    } else {
      console.log('Created removeThisHighlight menu');
    }
  });

  chrome.contextMenus.create({
    id: 'removeAllHighlightsOfFormat',
    title: 'TimeConverter: Remove all highlights of this format',
    contexts: ['all'],
    documentUrlPatterns: ['<all_urls>']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error creating removeAllHighlightsOfFormat menu:', chrome.runtime.lastError);
    } else {
      console.log('Created removeAllHighlightsOfFormat menu');
    }
  });

  chrome.contextMenus.create({
    id: 'separator',
    type: 'separator',
    contexts: ['all'],
    documentUrlPatterns: ['<all_urls>']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error creating separator menu:', chrome.runtime.lastError);
    } else {
      console.log('Created separator menu');
    }
  });

  chrome.contextMenus.create({
    id: 'clearStoplist',
    title: 'TimeConverter: Clear removed formats (re-enable)',
    contexts: ['all'],
    documentUrlPatterns: ['<all_urls>']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error creating clearStoplist menu:', chrome.runtime.lastError);
    } else {
      console.log('Created clearStoplist menu');
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

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  if (info.menuItemId === 'removeThisHighlight' || info.menuItemId === 'removeAllHighlightsOfFormat' || info.menuItemId === 'clearStoplist') {
    chrome.tabs.sendMessage(tab.id, {
      action: info.menuItemId
    }).then((response) => {
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
        if (response.status.includes('removed') || response.status.includes('Highlight removed')) {
          chrome.runtime.sendMessage({
            action: 'highlightsChanged',
            removed: true
          }).catch(() => {
            // Ignore if no popup is open
          });
        }
      }
    }).catch((error) => {
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

