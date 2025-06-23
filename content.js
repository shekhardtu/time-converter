
// Utility function to check if extension context is valid
function isExtensionContextValid() {
  try {
    return !!(chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

// Check if the script has already been injected to avoid re-injecting and creating duplicate listeners.
// Function to initialize auto-conversion
function initAutoConversion() {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.warn('Extension context invalidated, skipping auto-conversion');
    return;
  }

  try {
    chrome.storage.sync.get(['fromTimezone', 'toTimezone'], async (data) => {
      if (chrome.runtime.lastError) {
        console.warn(`Context invalidated: ${chrome.runtime.lastError.message}`);
        return;
      }
      if (data.fromTimezone && data.toTimezone) {
      // Check if this site or page is disabled
        const isSiteDisabled = await checkSiteDisabled();
        const isPageDisabled = await checkPageDisabled();
        if (isSiteDisabled || isPageDisabled) {
          return;
        }

        initMutationObserver(data.fromTimezone, data.toTimezone);

        // Check if there are already converted dates, if so, don't auto-convert
        const existingHighlights = document.querySelectorAll('.time-converter-replaced');
        if (existingHighlights.length === 0) {
          // Page has no highlights, needs conversion
          window.timeConverterPageState = {
            converted: false,
            fromTimezone: data.fromTimezone,
            toTimezone: data.toTimezone,
            conversionTimestamp: null
          };
          await executeConversion({ from: data.fromTimezone, to: data.toTimezone });

          // For SPAs, retry conversion after delays to catch dynamically loaded content
          setTimeout(async () => {
            const newHighlights = document.querySelectorAll('.time-converter-replaced');
            if (newHighlights.length === 0) {
              await executeConversion({ from: data.fromTimezone, to: data.toTimezone });
            }
          }, 2000);

          setTimeout(async () => {
            const newHighlights = document.querySelectorAll('.time-converter-replaced');
            if (newHighlights.length === 0) {
              await executeConversion({ from: data.fromTimezone, to: data.toTimezone });
            }
          }, 5000);
        } else {
          // Page already has highlights, it's in converted state
          window.timeConverterPageState = {
            converted: true,
            fromTimezone: data.fromTimezone,
            toTimezone: data.toTimezone,
            conversionTimestamp: Date.now()
          };
        }
      }
    });
  } catch (error) {
    console.warn('Extension context invalidated during initialization:', error.message);
  }
}

// Global error handler for extension context invalidation
window.addEventListener('error', function(event) {
  if (event.error && event.error.message && event.error.message.includes('Extension context invalidated')) {
    console.warn('Extension context invalidated, stopping script execution');
    // Stop all time monitoring
    if (window.timeConverterMutationObserver) {
      window.timeConverterMutationObserver.disconnect();
      window.timeConverterMutationObserver = null;
    }
    if (window.timeConverterPollingInterval) {
      clearInterval(window.timeConverterPollingInterval);
      window.timeConverterPollingInterval = null;
    }
    event.preventDefault();
    return false;
  }
});

if (typeof window.timeConverterInjected === 'undefined') {
  window.timeConverterInjected = true;
  window.timeConverterPageState = {
    converted: false,
    fromTimezone: null,
    toTimezone: null,
    conversionTimestamp: null
  };


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoConversion);
  } else {
    setTimeout(initAutoConversion, 100);
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, ignoring message');
      sendResponse({ status: 'Extension context invalidated' });
      return false;
    }

    if (request.action === 'convertTime') {
      console.log('Content script received convertTime:', request.from, '->', request.to);

      // Always handle conversion asynchronously
      (async () => {
        try {
          if (document.readyState === 'loading') {
            // Wait for DOM to be ready
            await new Promise(resolve => {
              document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
          }

          await executeConversion(request, sendResponse);
        } catch (error) {
          console.error('Error in executeConversion:', error);
          sendResponse({ status: `Error: ${error.message}` });
        }
      })();

      return true; // Keep channel open for async response
    } else if (request.action === 'revertDates') {
      try {
        revertAllDates();
        sendResponse({ status: 'Dates reverted to original' });
      } catch (error) {
        console.error('Error reverting dates:', error);
        sendResponse({ status: 'Error reverting dates' });
      }
    } else if (request.action === 'checkExistingHighlights') {
      const highlights = document.querySelectorAll('.time-converter-replaced');
      const hasHighlights = highlights.length > 0;
      sendResponse({ hasHighlights: hasHighlights, count: highlights.length });
    }

    return false; // Don't keep channel open for sync responses
  });
}

// Move all functions outside the injection check so they're always available

async function executeConversion(request, sendResponse) {
  console.log('executeConversion called with:', request);

  try {
    // Check if date-fns-tz is available
    if (typeof dateFnsTz === 'undefined') {
      console.warn('date-fns-tz not loaded, timezone conversion will not work');
      if (sendResponse) sendResponse({ status: 'Error: Date library not loaded' });
      return;
    }

    // Check if this site or page is disabled
    const isSiteDisabled = await checkSiteDisabled();
    const isPageDisabled = await checkPageDisabled();
    if (isSiteDisabled || isPageDisabled) {
      const disabledType = isSiteDisabled ? 'site' : 'page';
      if (sendResponse) sendResponse({ status: `Conversion disabled for this ${disabledType}` });
      return;
    }

    const { from, to } = request;
    console.log('Converting from', from, 'to', to);

    // First, check if there are existing conversions and revert them
    const existingHighlights = document.querySelectorAll('.time-converter-replaced');
    console.log('Found', existingHighlights.length, 'existing highlights');
    if (existingHighlights.length > 0) {
      await revertAllDatesPromise();
    }

    // Now proceed with new conversion
    const count = await findAndConvertTimestamps(document.body, from, to);
    console.log('Converted', count, 'timestamps');

    let statusMessage;
    if (count === -1) {
      statusMessage = `Already converted ${from} -> ${to}`;
    } else if (count > 0) {
      statusMessage = `Converted ${count} timestamps from ${from} to ${to}`;
      // Update page state
      window.timeConverterPageState = {
        converted: true,
        fromTimezone: from,
        toTimezone: to,
        conversionTimestamp: Date.now()
      };

      // Reinitialize MutationObserver with new timezone values
      initMutationObserver(from, to);
    } else {
      statusMessage = 'No dates found to convert';
    }

    if (sendResponse) {
      sendResponse({ status: statusMessage });
    }

    // Show status label if conversion was successful
    if (count > 0) {
      showConversionStatusLabel(from, to, count);
    }
  } catch (error) {
    console.error('Error during conversion:', error);
    const errorMsg = `Error during conversion: ${error.message}. Please try again.`;
    if (sendResponse) {
      sendResponse({ status: errorMsg });
    }
  }
}

async function findAndConvertTimestamps(element, fromTimezoneShort, toTimezoneShort) {
  // Since we now clean up existing conversions before calling this function,
  // we don't need to check for existing conversions here anymore

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
  const nodesToProcess = [];
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentNode;
    if (parent && parent.nodeName.toUpperCase() !== 'SCRIPT' && parent.nodeName.toUpperCase() !== 'STYLE') {
      nodesToProcess.push(node);
    }
  }

  let count = 0;

  // Generate regex patterns from single source of truth with global flag
  const defaultRegexPatterns = window.TimeConverter.dateTimeParser.DATE_PARSING_PATTERNS.map(pattern => {
    const source = pattern.regex.source;
    // Add global flag only - rely on validation functions to filter out timezone suffixes
    return new RegExp(`(${source})`, 'g');
  });

  const dateRegex = new RegExp(defaultRegexPatterns.map(p => p.source).join('|'), 'gi');

  // The values passed should already be IANA timezones from the dropdown
  const fromTz = window.TimeConverter.timezoneConverter.getIANATimezone(fromTimezoneShort);
  const toTz = window.TimeConverter.timezoneConverter.getIANATimezone(toTimezoneShort);

  nodesToProcess.forEach(node => {
    const originalText = node.nodeValue;
    if (originalText && originalText.length > 3 && /\d/.test(originalText)) {

      // Skip if in code-like context
      if (shouldSkipConversion(originalText, node.parentNode)) {
        return;
      }

      dateRegex.lastIndex = 0;
      if (dateRegex.test(originalText)) {
        dateRegex.lastIndex = 0;
        const newFragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        while ((match = dateRegex.exec(originalText)) !== null) {
          const matchText = match[0];
          const offset = match.index;

          if (offset > lastIndex) {
            newFragment.appendChild(document.createTextNode(originalText.substring(lastIndex, offset)));
          }

          // Pre-validate the date before attempting conversion
          if (!window.TimeConverter.dateTimeParser.isValidDateText(matchText)) {
            // Skip invalid dates entirely - don't highlight them
            newFragment.appendChild(document.createTextNode(matchText));
            lastIndex = offset + matchText.length;
            continue;
          }

          // Additional check: ensure no timezone suffix follows this match in the original text
          const textAfterMatch = originalText.substring(offset + matchText.length, offset + matchText.length + 10);
          if (/^[,\s]*[A-Z]{2,4}\b/.test(textAfterMatch)) {
            // Skip dates followed by timezone suffixes
            newFragment.appendChild(document.createTextNode(matchText));
            lastIndex = offset + matchText.length;
            continue;
          }

          const convertedDate = window.TimeConverter.timezoneConverter.convertDateWithLibrary(matchText, fromTz, toTz);

          // Only create highlights for successful conversions
          if (convertedDate !== matchText) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'time-converter-replaced';
            timeSpan.style.position = 'relative';
            timeSpan.style.paddingRight = '20px';

            // Create the date text span
            const dateText = document.createElement('span');
            dateText.textContent = convertedDate;
            dateText.title = `Original: ${matchText} (${fromTimezoneShort})`;

            // Create close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.className = 'time-converter-close-btn';
            closeBtn.style.cssText = `
              position: absolute;
              right: 2px;
              top: 50%;
              transform: translateY(-50%);
              width: 16px;
              height: 16px;
              border: none;
              background: rgba(255, 255, 255, 0.7);
              color: #666;
              border-radius: 50%;
              font-size: 12px;
              line-height: 1;
              cursor: pointer;
              padding: 0;
              margin: 0;
              display: none;
              transition: all 0.2s ease;
            `;

            // Add hover effect to show close button
            timeSpan.addEventListener('mouseenter', () => {
              closeBtn.style.display = 'flex';
              closeBtn.style.alignItems = 'center';
              closeBtn.style.justifyContent = 'center';
            });

            timeSpan.addEventListener('mouseleave', () => {
              closeBtn.style.display = 'none';
            });

            // Add click handler to close button
            closeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              e.preventDefault();
              // Replace with original text
              const textNode = document.createTextNode(matchText);
              timeSpan.parentNode.replaceChild(textNode, timeSpan);
            });

            // Store data attributes
            timeSpan.setAttribute('data-original', matchText);
            timeSpan.setAttribute('data-converted', convertedDate);
            timeSpan.setAttribute('data-from-tz', fromTimezoneShort);
            timeSpan.setAttribute('data-to-tz', toTimezoneShort);

            timeSpan.appendChild(dateText);
            timeSpan.appendChild(closeBtn);
            newFragment.appendChild(timeSpan);
            count++;
          } else {
            // If conversion failed, don't highlight - just keep original text
            newFragment.appendChild(document.createTextNode(matchText));
          }

          lastIndex = offset + matchText.length;
        }

        if (lastIndex < originalText.length) {
          newFragment.appendChild(document.createTextNode(originalText.substring(lastIndex)));
        }
        if (node.parentNode) {
          node.parentNode.replaceChild(newFragment, node);
        }
      }
    }
  });
  return count;
}

function shouldSkipConversion(text, element) {
  // Skip if inside code-like elements
  if (element) {
    const tagName = element.tagName?.toLowerCase();
    if (['code', 'pre', 'script', 'style'].includes(tagName)) return true;

    // Skip if parent has code-like classes
    let parent = element.parentElement;
    while (parent) {
      const className = parent.className?.toLowerCase() || '';
      if (className.includes('code') || className.includes('json') || className.includes('sql')) {
        return true;
      }
      parent = parent.parentElement;
    }
  }

  // Skip JSON-like patterns
  if (text.includes('":') || text.includes('="') || text.includes("='")) return true;

  // Skip function call patterns
  if (/[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(.*\d+[/\-.]+\d+.*\)/.test(text)) return true;

  // Skip version/build patterns
  if (/\b(?:version|build|release|v\d)\s*\d/i.test(text)) return true;

  return false;
}


// Function to revert all converted dates back to original
function revertAllDates() {
  const convertedElements = document.querySelectorAll('.time-converter-replaced');

  convertedElements.forEach(element => {
    const originalDate = element.getAttribute('data-original');
    if (originalDate) {
      // Create a text node with the original date value
      const originalTextNode = document.createTextNode(originalDate);
      element.parentNode.replaceChild(originalTextNode, element);
    }
  });

  // Hide status label if it exists
  hideConversionStatusLabel();

  // Update page state to indicate conversion is disabled
  window.timeConverterPageState = {
    converted: false,
    fromTimezone: null,
    toTimezone: null,
    conversionTimestamp: null
  };

  // Stop monitoring for new dates when user explicitly reverts
  stopDateMonitoring();
}

// Promisified version of revertAllDates for async operations
function revertAllDatesPromise() {
  return new Promise((resolve) => {
    try {
      const convertedElements = document.querySelectorAll('.time-converter-replaced');

      convertedElements.forEach(element => {
        const originalDate = element.getAttribute('data-original');
        if (originalDate) {
          // Create a text node with the original date value
          const originalTextNode = document.createTextNode(originalDate);
          element.parentNode.replaceChild(originalTextNode, element);
        }
      });

      // Hide status label if it exists
      hideConversionStatusLabel();

      // Update page state to indicate conversion is disabled
      window.timeConverterPageState = {
        converted: false,
        fromTimezone: null,
        toTimezone: null,
        conversionTimestamp: null
      };

      // Stop monitoring for new dates when user explicitly reverts
      stopDateMonitoring();

      resolve();
    } catch (error) {
      console.error('Error during revert:', error);
      resolve(); // Still resolve to not block conversion
    }
  });
}


// Function to show conversion status label
function showConversionStatusLabel(fromTz, toTz, count) {
  // Remove any existing status label
  hideConversionStatusLabel();

  const statusLabel = document.createElement('div');
  statusLabel.className = 'time-converter-status-label';
  statusLabel.id = 'time-converter-status-notification';

  const statusText = document.createElement('div');
  statusText.className = 'time-converter-status-text';
  statusText.textContent = `Converted ${count} timestamp${count > 1 ? 's' : ''} from ${fromTz} to ${toTz}`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'time-converter-close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.title = 'Close notification';
  closeBtn.addEventListener('click', () => {
    hideConversionStatusLabel();
  });

  statusLabel.appendChild(statusText);
  statusLabel.appendChild(closeBtn);

  document.body.appendChild(statusLabel);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideConversionStatusLabel();
  }, 5000);
}

// Function to hide conversion status label
function hideConversionStatusLabel() {
  const existingLabel = document.getElementById('time-converter-status-notification');
  if (existingLabel) {
    existingLabel.classList.add('hiding');
    setTimeout(() => {
      if (existingLabel.parentNode) {
        existingLabel.parentNode.removeChild(existingLabel);
      }
    }, 300);
  }
}

// Check if current site is disabled
async function checkSiteDisabled() {
  return new Promise((resolve) => {
    const hostname = window.location.hostname;
    chrome.storage.sync.get(['disabledSites'], (data) => {
      if (chrome.runtime.lastError) {
        console.warn(`Context invalidated: ${chrome.runtime.lastError.message}`);
        resolve(true); // Safely assume disabled
        return;
      }
      const disabledSites = data.disabledSites || [];
      resolve(disabledSites.includes(hostname));
    });
  });
}

// Check if current page is disabled
async function checkPageDisabled() {
  return new Promise((resolve) => {
    const pageUrl = window.location.href;
    chrome.storage.sync.get(['disabledPages'], (data) => {
      if (chrome.runtime.lastError) {
        console.warn(`Context invalidated: ${chrome.runtime.lastError.message}`);
        resolve(true); // Safely assume disabled
        return;
      }
      const disabledPages = data.disabledPages || [];
      resolve(disabledPages.includes(pageUrl));
    });
  });
}

// Initialize MutationObserver to detect and convert dates in dynamically loaded content
function initMutationObserver(fromTimezone, toTimezone) {

  // Stop any existing monitoring first
  stopDateMonitoring();

  let throttleTimeout = null;

  const processMutations = async (mutations) => {
    // If conversion is disabled (e.g., by revert button), do nothing.
    if (!window.timeConverterPageState?.converted) {
      stopDateMonitoring(); // Also stop listening if disabled
      return;
    }

    const nodesToScan = new Set();

    for (const mutation of mutations) {
      // 1. New nodes added to the DOM
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          // Process only element nodes that are not our own highlights
          if (node.nodeType === Node.ELEMENT_NODE && !node.closest('.time-converter-replaced, .time-converter-status')) {
            nodesToScan.add(node);
            // For SPAs, also scan all children in case of nested content
            const children = node.querySelectorAll('*');
            children.forEach(child => {
              if (!child.closest('.time-converter-replaced, .time-converter-status')) {
                nodesToScan.add(child);
              }
            });
          }
          // Also process text nodes that might contain dates
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
            const parent = node.parentElement;
            if (parent && !parent.closest('.time-converter-replaced, .time-converter-status')) {
              nodesToScan.add(parent);
            }
          }
        });
        // 2. Loader element removed (good sign that content has loaded)
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE &&
                        (node.classList.contains('loading') || node.classList.contains('spinner') ||
                         node.classList.contains('loader') || node.classList.contains('skeleton') ||
                         node.getAttribute('aria-label')?.includes('loading'))) {
            if (mutation.target) { // mutation.target is the parent
              nodesToScan.add(mutation.target);
              // Scan the entire subtree when loaders are removed
              const siblings = mutation.target.querySelectorAll('*');
              siblings.forEach(sibling => {
                if (!sibling.closest('.time-converter-replaced, .time-converter-status')) {
                  nodesToScan.add(sibling);
                }
              });
            }
          }
        });
      }
      // 3. Text content of a node has changed
      else if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        // Add the parent element to be scanned if it's not part of our highlights
        if (parent && !parent.closest('.time-converter-replaced, .time-converter-status')) {
          nodesToScan.add(parent);
        }
      }
      // 4. Attributes changed (might indicate content is ready)
      else if (mutation.type === 'attributes') {
        const target = mutation.target;
        // Common SPA patterns: class changes, data attributes, aria attributes
        if (target && target.nodeType === Node.ELEMENT_NODE &&
                    (mutation.attributeName === 'class' ||
                     mutation.attributeName?.startsWith('data-') ||
                     mutation.attributeName?.startsWith('aria-')) &&
                    !target.closest('.time-converter-replaced, .time-converter-status')) {
          nodesToScan.add(target);
        }
      }
    }

    if (nodesToScan.size === 0) {
      return;
    }

    // Check if site or page has been disabled since observer was created
    const isSiteDisabled = await checkSiteDisabled();
    const isPageDisabled = await checkPageDisabled();
    if (isSiteDisabled || isPageDisabled) {
      stopDateMonitoring();
      return;
    }

    // Temporarily disconnect observer to prevent infinite loop
    const observer = window.timeConverterMutationObserver;
    if (observer) {
      observer.disconnect();
    }

    // Process each unique node that has changed
    for (const node of nodesToScan) {
      if (node.isConnected) { // Ensure node is still in the DOM
        // Use current timezone values from page state
        const currentFrom = window.timeConverterPageState?.fromTimezone || fromTimezone;
        const currentTo = window.timeConverterPageState?.toTimezone || toTimezone;
        const count = await findAndConvertTimestamps(node, currentFrom, currentTo);
        if (count > 0) {
          // You can optionally add a log here for debugging, but it will be noisy
        }
      }
    }

    // Reconnect observer after processing
    if (observer) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'data-loaded', 'data-ready', 'aria-hidden', 'style']
      });
    }
  };

  const throttledProcessMutations = (mutations) => {
    if (throttleTimeout) {
      clearTimeout(throttleTimeout);
    }
    throttleTimeout = setTimeout(() => processMutations(mutations), 500); // 500ms throttle
  };

  const observer = new MutationObserver(throttledProcessMutations);

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-loaded', 'data-ready', 'aria-hidden', 'style']
  });

  // Store for later access so we can disconnect it
  window.timeConverterMutationObserver = observer;

  // Fallback periodic check for stubborn SPAs (every 10 seconds, max 6 times = 1 minute)
  let fallbackAttempts = 0;
  const maxFallbackAttempts = 6;

  const fallbackCheck = async () => {
    if (!window.timeConverterPageState?.converted || fallbackAttempts >= maxFallbackAttempts) {
      return;
    }

    fallbackAttempts++;

    // Temporarily disconnect observer during fallback conversion
    const observer = window.timeConverterMutationObserver;
    if (observer) {
      observer.disconnect();
    }

    // Use current timezone values from page state
    const currentFrom = window.timeConverterPageState?.fromTimezone || fromTimezone;
    const currentTo = window.timeConverterPageState?.toTimezone || toTimezone;
    const count = await findAndConvertTimestamps(document.body, currentFrom, currentTo);
    if (count > 0) {
      // Optional: log fallback conversions if needed for debugging
    }

    // Reconnect observer after fallback conversion
    if (observer) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'data-loaded', 'data-ready', 'aria-hidden', 'style']
      });
    }

    if (fallbackAttempts < maxFallbackAttempts) {
      setTimeout(fallbackCheck, 10000); // Check again in 10 seconds
    }
  };

  // Start fallback check after 15 seconds (let MutationObserver try first)
  setTimeout(fallbackCheck, 15000);
}

// Helper function to stop all date monitoring activities
function stopDateMonitoring() {
  if (window.timeConverterMutationObserver) {
    window.timeConverterMutationObserver.disconnect();
    window.timeConverterMutationObserver = null;
  }
  // Also clear the polling interval if it exists, for safety from old versions
  if (window.timeConverterPollingInterval) {
    clearInterval(window.timeConverterPollingInterval);
    window.timeConverterPollingInterval = null;
  }
}
