// Global variable to track the currently right-clicked element - use window to ensure accessibility
if (typeof window.lastRightClickedElement === 'undefined') {
  window.lastRightClickedElement = null;
}

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
          console.log('Auto-conversion disabled for this site or page');
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
          console.log('Auto-converting dates on page load...');
          await executeConversion({ from: data.fromTimezone, to: data.toTimezone });

          // For SPAs, retry conversion after delays to catch dynamically loaded content
          setTimeout(async () => {
            const newHighlights = document.querySelectorAll('.time-converter-replaced');
            if (newHighlights.length === 0) {
              console.log('Retrying auto-conversion for SPA content...');
              await executeConversion({ from: data.fromTimezone, to: data.toTimezone });
            }
          }, 2000);

          setTimeout(async () => {
            const newHighlights = document.querySelectorAll('.time-converter-replaced');
            if (newHighlights.length === 0) {
              console.log('Final retry for deeply dynamic SPA content...');
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
          console.log('Page already has converted dates, skipping auto-conversion');
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

  // Add right-click listener to track clicked elements
  document.addEventListener('contextmenu', (event) => {
    window.lastRightClickedElement = event.target;

    // Check if the clicked element is a highlighted date
    const isHighlighted = event.target.classList.contains('time-converter-replaced');
    console.log('Right-clicked element:', event.target, 'Is highlighted:', isHighlighted);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoConversion);
  } else {
    setTimeout(initAutoConversion, 100);
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, ignoring message');
      return false;
    }

    console.log('Content script received message:', request.action);

    if (request.action === 'convertTime') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
          try {
            await executeConversion(request, sendResponse);
          } catch (error) {
            console.error('Error in executeConversion:', error);
            if (sendResponse) sendResponse({ status: `Error: ${error.message}` });
          }
        });
      } else {
        // Handle async executeConversion properly
        executeConversion(request, sendResponse).catch(error => {
          console.error('Error in executeConversion:', error);
          if (sendResponse) sendResponse({ status: `Error: ${error.message}` });
        });
      }
      return true; // Keep channel open for async response
    } else if (request.action === 'revertDates') {
      revertAllDates();
      if (sendResponse) sendResponse({ status: 'Dates reverted to original' });
    } else if (request.action === 'addCustomFormat') {
      // Handle async operation properly
      (async () => {
        try {
          const success = await saveCustomFormatForPage(request.pattern, request.description);
          if (sendResponse) sendResponse({ status: success ? 'Custom format saved' : 'Format already exists' });
        } catch (error) {
          console.error('Error saving custom format:', error);
          if (sendResponse) sendResponse({ status: `Error: ${error.message}` });
        }
      })();
      return true; // Keep channel open for async response
    } else if (request.action === 'removeThisHighlight') {
      console.log('Handling removeThisHighlight');
      if (!window.lastRightClickedElement || !window.lastRightClickedElement.classList.contains('time-converter-replaced')) {
        if (sendResponse) sendResponse({ status: 'Please right-click on a highlighted date first' });
      } else {
        const result = removeSpecificHighlight();
        if (sendResponse) sendResponse({ status: result ? 'Highlight removed' : 'Failed to remove highlight' });
      }
    } else if (request.action === 'removeAllHighlightsOfFormat') {
      console.log('Handling removeAllHighlightsOfFormat');
      if (!window.lastRightClickedElement || !window.lastRightClickedElement.classList.contains('time-converter-replaced')) {
        if (sendResponse) sendResponse({ status: 'Please right-click on a highlighted date first' });
      } else {
        // Handle async operation properly
        (async () => {
          try {
            const count = await removeAllHighlightsOfFormat();
            if (sendResponse) sendResponse({ status: count > 0 ? `Removed ${count} highlights and added format to stoplist` : 'No matching highlights found' });
          } catch (error) {
            console.error('Error removing highlights:', error);
            if (sendResponse) sendResponse({ status: `Error: ${error.message}` });
          }
        })();
        return true; // Keep channel open for async response
      }
    } else if (request.action === 'clearStoplist') {
      console.log('Handling clearStoplist');
      // Handle async operation properly
      (async () => {
        try {
          await clearStoplist();
          if (sendResponse) sendResponse({ status: 'Stoplist cleared - all formats re-enabled' });
        } catch (error) {
          console.error('Error clearing stoplist:', error);
          if (sendResponse) sendResponse({ status: `Error: ${error.message}` });
        }
      })();
      return true; // Keep channel open for async response
    } else if (request.action === 'checkExistingHighlights') {
      const highlights = document.querySelectorAll('.time-converter-replaced');
      const hasHighlights = highlights.length > 0;
      console.log('Checking existing highlights:', hasHighlights, 'Count:', highlights.length);
      if (sendResponse) sendResponse({ hasHighlights: hasHighlights, count: highlights.length });
    }

    return false; // Don't keep channel open for sync responses
  });
}

/* global module */
// Move all functions outside the injection check so they're always available

async function executeConversion(request, sendResponse) {
  console.log('executeConversion called with:', request);

  try {
    // Check if date-fns-tz is available
    if (typeof dateFnsTz === 'undefined') {
      console.warn('date-fns-tz not loaded, timezone conversion will not work');
      return;
    }

    // Check if this site or page is disabled
    const isSiteDisabled = await checkSiteDisabled();
    const isPageDisabled = await checkPageDisabled();
    if (isSiteDisabled || isPageDisabled) {
      const disabledType = isSiteDisabled ? 'site' : 'page';
      console.log(`Conversion disabled for this ${disabledType}`);
      if (sendResponse) sendResponse({ status: `Conversion disabled for this ${disabledType}` });
      return;
    }

    const { from, to } = request;
    console.log(`Starting conversion from ${from} to ${to}`);

    // First, check if there are existing conversions and revert them
    const existingHighlights = document.querySelectorAll('.time-converter-replaced');
    if (existingHighlights.length > 0) {
      console.log('Found existing conversions, reverting first...');
      await revertAllDatesPromise();
      console.log('Previous conversions reverted successfully');
    }

    // Now proceed with new conversion
    const count = await findAndConvertTimestamps(document.body, from, to);
    console.log(`Conversion completed. Count: ${count}`);

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
    } else {
      statusMessage = 'No dates found to convert';
    }

    console.log('Sending response:', statusMessage);
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
    console.log('Sending error response:', errorMsg);
    if (sendResponse) {
      sendResponse({ status: errorMsg });
    }
  }
}

async function findAndConvertTimestamps(element, fromTimezoneShort, toTimezoneShort) {
  // Since we now clean up existing conversions before calling this function,
  // we don't need to check for existing conversions here anymore
  console.log(`Starting conversion from ${fromTimezoneShort} to ${toTimezoneShort}`);

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

  // Get custom formats for this page and stoplist
  const customFormats = await getCustomFormatsForPage();
  const stoplist = await getStoplistForPage();

  // Generate regex patterns from single source of truth with global flag
  const defaultRegexPatterns = window.TimeConverter.dateTimeParser.DATE_PARSING_PATTERNS.map(pattern => {
    const source = pattern.regex.source;
    // Add global flag only - rely on validation functions to filter out timezone suffixes
    return new RegExp(`(${source})`, 'g');
  });

  // Filter out stoplisted patterns
  const filteredDefaultPatterns = defaultRegexPatterns.filter(pattern => {
    return !stoplist.some(stoppedPattern => pattern.source === stoppedPattern);
  });

  // Combine filtered default patterns with custom patterns
  const allPatterns = [...filteredDefaultPatterns];
  if (customFormats.length > 0) {
    const filteredCustomFormats = customFormats.filter(f => {
      return !stoplist.includes(f.pattern);
    });
    allPatterns.push(...filteredCustomFormats.map(f => new RegExp(f.pattern, 'gi')));
  }

  // Skip if no patterns left after filtering
  if (allPatterns.length === 0) {
    return 0;
  }

  const dateRegex = new RegExp(allPatterns.map(p => p.source).join('|'), 'gi');
  console.log('Generated dateRegex pattern count:', allPatterns.length);

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
            timeSpan.textContent = convertedDate;
            timeSpan.title = `Original: ${matchText} (${fromTimezoneShort})`;
            timeSpan.setAttribute('data-original', matchText);
            timeSpan.setAttribute('data-converted', convertedDate);
            timeSpan.setAttribute('data-from-tz', fromTimezoneShort);
            timeSpan.setAttribute('data-to-tz', toTimezoneShort);

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









// Custom format management functions
async function getCustomFormatsForPage() {
  return new Promise((resolve) => {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, returning empty formats');
      resolve([]);
      return;
    }

    const currentUrl = window.location.hostname;
    try {
      chrome.storage.sync.get(['customFormats'], (data) => {
        if (chrome.runtime.lastError) {
          console.warn(`Context invalidated: ${chrome.runtime.lastError.message}`);
          resolve([]); // Resolve with empty array on error
          return;
        }
        const customFormats = data.customFormats || {};
        const pageFormats = customFormats[currentUrl] || [];
        resolve(pageFormats);
      });
    } catch (error) {
      console.warn('Extension context invalidated during storage access:', error.message);
      resolve([]);
    }
  });
}

async function saveCustomFormatForPage(formatPattern, description) {
  return new Promise((resolve) => {
    const currentUrl = window.location.hostname;
    chrome.storage.sync.get(['customFormats'], (data) => {
      if (chrome.runtime.lastError) {
        console.warn(`Context invalidated: ${chrome.runtime.lastError.message}`);
        resolve(false);
        return;
      }
      const customFormats = data.customFormats || {};
      if (!customFormats[currentUrl]) {
        customFormats[currentUrl] = [];
      }

      // Check if format already exists
      const exists = customFormats[currentUrl].find(f => f.pattern === formatPattern);
      if (!exists) {
        customFormats[currentUrl].push({
          pattern: formatPattern,
          description: description,
          dateAdded: new Date().toISOString()
        });

        chrome.storage.sync.set({ customFormats }, () => {
          if (chrome.runtime.lastError) {
            console.warn(`Context invalidated during set: ${chrome.runtime.lastError.message}`);
            resolve(false);
            return;
          }
          resolve(true);
        });
      } else {
        resolve(false);
      }
    });
  });
}

// Function to revert all converted dates back to original
function revertAllDates() {
  console.log('Reverting all dates to original');
  const convertedElements = document.querySelectorAll('.time-converter-replaced');
  console.log('Found', convertedElements.length, 'converted elements to revert');

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
      console.log('Found', convertedElements.length, 'converted elements to revert');

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

      console.log('Revert completed successfully');
      resolve();
    } catch (error) {
      console.error('Error during revert:', error);
      resolve(); // Still resolve to not block conversion
    }
  });
}

// Function to remove a specific highlight using the right-clicked element
function removeSpecificHighlight() {
  console.log('Removing specific highlight');
  if (!window.lastRightClickedElement) {
    console.log('No element was right-clicked');
    return false;
  }

  const element = window.lastRightClickedElement;
  console.log('Right-clicked element:', element);

  // Check if the element itself is a highlight
  if (element.classList && element.classList.contains('time-converter-replaced')) {
    const originalDate = element.getAttribute('data-original');
    if (originalDate) {
      console.log('Found original date:', originalDate);
      // Replace the element with the original text
      const originalTextNode = document.createTextNode(originalDate);
      element.parentNode.replaceChild(originalTextNode, element);
      console.log('Highlight removed successfully');

      // Create a stoplist entry for this specific pattern if possible
      const dateText = element.getAttribute('data-original');
      if (dateText) {
        // Try to get the pattern based on the text
        const format = identifyDateFormat(dateText);
        if (format) {
          console.log(`Adding pattern to stoplist: ${format.source}`);
          addToStoplist(format.source);
        }
      }

      return true;
    }
  }

  // Check if any parent is a highlight (for clicking on child elements)
  let parent = element.parentElement;
  while (parent) {
    if (parent.classList && parent.classList.contains('time-converter-replaced')) {
      const originalDate = parent.getAttribute('data-original');
      if (originalDate) {
        console.log('Found original date in parent:', originalDate);
        // Replace the parent with the original text
        const originalTextNode = document.createTextNode(originalDate);
        parent.parentNode.replaceChild(originalTextNode, parent);
        console.log('Highlight removed successfully');

        // Create a stoplist entry for this specific pattern if possible
        const format = window.TimeConverter.dateTimeParser.identifyDateFormat(originalDate);
        if (format) {
          console.log(`Adding pattern to stoplist: ${format.source}`);
          addToStoplist(format.source);
        }

        return true;
      }
    }
    parent = parent.parentElement;
  }

  console.log('No highlight found to remove');
  return false;
}

// Function to remove all highlights of the same format and add to stoplist
async function removeAllHighlightsOfFormat() {
  console.log('removeAllHighlightsOfFormat called with element:', window.lastRightClickedElement);

  if (!window.lastRightClickedElement || !window.lastRightClickedElement.classList.contains('time-converter-replaced')) {
    console.log('No valid right-clicked element');
    return 0;
  }

  let count = 0;
  const targetSpan = window.lastRightClickedElement;

  // Get the original text to identify the format (fallback to current text if no data-original)
  const targetOriginal = targetSpan.getAttribute('data-original') || targetSpan.textContent;
  console.log('Target text for pattern matching:', targetOriginal);

  if (!targetOriginal) {
    console.log('No text found for pattern matching');
    return 0;
  }

  // Find the format pattern by checking which regex matches
  const formatPattern = identifyDateFormat(targetOriginal);
  console.log('Identified format pattern:', formatPattern);

  if (formatPattern) {
    // Add pattern to stoplist
    await addToStoplist(formatPattern.source);
    console.log('Added to stoplist:', formatPattern.source);

    // Remove all highlights with this format
    const convertedSpans = document.querySelectorAll('.time-converter-replaced');
    console.log('Found', convertedSpans.length, 'highlighted spans to check');

    convertedSpans.forEach(span => {
      const originalText = span.getAttribute('data-original') || span.textContent;
      if (originalText && formatPattern.test(originalText)) {
        console.log('Removing span with text:', originalText);
        const textToRestore = span.getAttribute('data-original') || span.textContent;
        const textNode = document.createTextNode(textToRestore);
        if (span.parentNode) {
          span.parentNode.replaceChild(textNode, span);
          count++;
        }
      }
    });

    console.log('Removed', count, 'highlights');
  } else {
    console.log('No matching format pattern found for:', targetOriginal);
  }

  return count;
}



// Stoplist management functions
async function getStoplistForPage() {
  return new Promise((resolve) => {
    const currentUrl = window.location.hostname;
    chrome.storage.sync.get(['stoplist'], (data) => {
      if (chrome.runtime.lastError) {
        console.warn(`Context invalidated: ${chrome.runtime.lastError.message}`);
        resolve([]); // Resolve with empty array on error
        return;
      }
      const stoplist = data.stoplist || {};
      const pageStoplist = stoplist[currentUrl] || [];
      resolve(pageStoplist);
    });
  });
}

async function addToStoplist(patternSource) {
  return new Promise((resolve) => {
    const currentUrl = window.location.hostname;
    console.log('Adding to stoplist for', currentUrl, 'pattern:', patternSource);

    chrome.storage.sync.get(['stoplist'], (data) => {
      if (chrome.runtime.lastError) {
        console.warn(`Context invalidated: ${chrome.runtime.lastError.message}`);
        resolve(false);
        return;
      }
      const stoplist = data.stoplist || {};
      if (!stoplist[currentUrl]) {
        stoplist[currentUrl] = [];
      }

      // Add pattern if not already in stoplist
      if (!stoplist[currentUrl].includes(patternSource)) {
        stoplist[currentUrl].push(patternSource);
        chrome.storage.sync.set({ stoplist }, () => {
          if (chrome.runtime.lastError) {
            console.warn(`Context invalidated during set: ${chrome.runtime.lastError.message}`);
            resolve(false);
            return;
          }
          console.log('Successfully added to stoplist. Current stoplist:', stoplist);
          resolve(true);
        });
      } else {
        console.log('Pattern already in stoplist');
        resolve(false);
      }
    });
  });
}

async function clearStoplist() {
  return new Promise((resolve) => {
    const currentUrl = window.location.hostname;
    console.log('Clearing stoplist for', currentUrl);

    chrome.storage.sync.get(['stoplist'], (data) => {
      if (chrome.runtime.lastError) {
        console.warn(`Context invalidated: ${chrome.runtime.lastError.message}`);
        resolve(false);
        return;
      }
      const stoplist = data.stoplist || {};
      delete stoplist[currentUrl];
      chrome.storage.sync.set({ stoplist }, () => {
        if (chrome.runtime.lastError) {
          console.warn(`Context invalidated during set: ${chrome.runtime.lastError.message}`);
          resolve(false);
          return;
        }
        console.log('Stoplist cleared. New stoplist:', stoplist);
        resolve(true);
      });
    });
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
  console.log('Initializing MutationObserver (no polling)');

  // Stop any existing monitoring first
  stopDateMonitoring();

  let throttleTimeout = null;

  const processMutations = async (mutations) => {
    // If conversion is disabled (e.g., by revert button), do nothing.
    if (!window.timeConverterPageState?.converted) {
      console.log('Conversion disabled, ignoring mutations.');
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
      console.log('Conversion disabled for this site/page, stopping dynamic content processing.');
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
        const count = await findAndConvertTimestamps(node, fromTimezone, toTimezone);
        if (count > 0) {
          console.log(`Converted ${count} dates in dynamically loaded content`, node);
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
  console.log('MutationObserver is now active.');

  // Fallback periodic check for stubborn SPAs (every 10 seconds, max 6 times = 1 minute)
  let fallbackAttempts = 0;
  const maxFallbackAttempts = 6;

  const fallbackCheck = async () => {
    if (!window.timeConverterPageState?.converted || fallbackAttempts >= maxFallbackAttempts) {
      return;
    }

    fallbackAttempts++;
    console.log(`Fallback SPA check ${fallbackAttempts}/${maxFallbackAttempts}`);

    // Temporarily disconnect observer during fallback conversion
    const observer = window.timeConverterMutationObserver;
    if (observer) {
      observer.disconnect();
    }

    const count = await findAndConvertTimestamps(document.body, fromTimezone, toTimezone);
    if (count > 0) {
      console.log(`Fallback check found and converted ${count} dates`);
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
    console.log('Disconnecting MutationObserver.');
    window.timeConverterMutationObserver.disconnect();
    window.timeConverterMutationObserver = null;
  }
  // Also clear the polling interval if it exists, for safety from old versions
  if (window.timeConverterPollingInterval) {
    clearInterval(window.timeConverterPollingInterval);
    window.timeConverterPollingInterval = null;
  }
}
