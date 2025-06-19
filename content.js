// Global variable to track the currently right-clicked element - use window to ensure accessibility
if (typeof window.lastRightClickedElement === 'undefined') {
  window.lastRightClickedElement = null;
}

// Check if the script has already been injected to avoid re-injecting and creating duplicate listeners.
if (typeof window.timeConverterInjected === 'undefined') {
  window.timeConverterInjected = true;

  // Add right-click listener to track clicked elements
  document.addEventListener('contextmenu', (event) => {
    window.lastRightClickedElement = event.target;
    
    // Check if the clicked element is a highlighted date
    const isHighlighted = event.target.classList.contains('time-converter-replaced');
    console.log('Right-clicked element:', event.target, 'Is highlighted:', isHighlighted);
  });

  // Function to initialize auto-conversion
  function initAutoConversion() {
    chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (data) => {
      if (data.fromTimezone && data.toTimezone) {
        executeConversion({ from: data.fromTimezone, to: data.toTimezone });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoConversion);
  } else {
    setTimeout(initAutoConversion, 100);
  }

  chrome.runtime.onMessage.addListener(async (request, _sender, sendResponse) => {
    if (request.action === 'convertTime') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => executeConversion(request, sendResponse));
      } else {
        executeConversion(request, sendResponse);
      }
    } else if (request.action === 'revertDates') {
      revertAllDates();
      if (sendResponse) sendResponse({ status: 'Dates reverted to original' });
    } else if (request.action === 'addCustomFormat') {
      const success = await saveCustomFormatForPage(request.pattern, request.description);
      if (sendResponse) sendResponse({ status: success ? 'Custom format saved' : 'Format already exists' });
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
        const count = await removeAllHighlightsOfFormat();
        if (sendResponse) sendResponse({ status: count > 0 ? `Removed ${count} highlights and added format to stoplist` : 'No matching highlights found' });
      }
    } else if (request.action === 'clearStoplist') {
      console.log('Handling clearStoplist');
      await clearStoplist();
      if (sendResponse) sendResponse({ status: 'Stoplist cleared - all formats re-enabled' });
    } else if (request.action === 'checkExistingHighlights') {
      const highlights = document.querySelectorAll('.time-converter-replaced');
      const hasHighlights = highlights.length > 0;
      console.log('Checking existing highlights:', hasHighlights, 'Count:', highlights.length);
      if (sendResponse) sendResponse({ hasHighlights: hasHighlights, count: highlights.length });
    }
    return true; // Keep channel open for async response
  });
}

// Move all functions outside the injection check so they're always available

async function executeConversion(request, sendResponse) {
  if (typeof dateFns === 'undefined' || typeof dateFnsTz === 'undefined') {
    const errorMsg = 'Error: Timezone libraries not loaded. Please reload the extension/page.';
    if (sendResponse) sendResponse({ status: errorMsg });
    return;
  }
  const { from, to } = request;
  const count = await findAndConvertTimestamps(document.body, from, to);

  let statusMessage;
  if (count === -1) {
    statusMessage = `Already converted ${from} -> ${to}`;
  } else if (count > 0) {
    statusMessage = `Converted ${count} timestamps to ${to}`;
  } else {
    statusMessage = 'No dates found to convert';
  }

  if (sendResponse) sendResponse({ status: statusMessage });
}

async function findAndConvertTimestamps(element, fromTimezoneShort, toTimezoneShort) {
  // Check if already converted with same timezone pair to prevent double conversion
  const existingConversions = element.querySelectorAll('.time-converter-replaced');
  if (existingConversions.length > 0) {
    // Check if converting to same timezone pair
    const firstConversion = existingConversions[0];
    const existingFromTz = firstConversion.getAttribute('data-from-tz');
    const existingToTz = firstConversion.getAttribute('data-to-tz');

    if (existingFromTz === fromTimezoneShort && existingToTz === toTimezoneShort) {
      return -1; // Special value to indicate already converted
    }
  }

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

  // Enhanced regex patterns for comprehensive date/time matching
  // Order matters: More specific patterns first to avoid ambiguity
  const defaultRegexPatterns = [
    // ISO 8601 formats (highest priority)
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2}))/g,
    /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)/g,

    // YYYY/MM/DD formats (prioritized over MM/DD/YYYY to fix ambiguity)
    /(\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/g,

    // MM/DD/YYYY formats (moved after YYYY/MM/DD)
    /(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/g,
    /(\d{1,2}\/\d{1,2}\/\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/g,

    // European formats
    /(\b\d{1,2}\.\d{1,2}\.\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?\b)/g,
    /(\d{1,2}-\d{1,2}-\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/g,

    // Month name formats
    /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/gi,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/gi,

    // Time only
    /(\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)\b)/g,

    // Unix timestamps (10 digits)
    /(\b1[0-9]{9}\b)/g
  ];

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

  const fromIANATz = getIANATimezone(fromTimezoneShort);
  const toIANATz = getIANATimezone(toTimezoneShort);

  nodesToProcess.forEach(node => {
    const originalText = node.nodeValue;
    if (originalText && originalText.length > 3 && /\d/.test(originalText)) {
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

          const convertedDateStr = convertDateWithLibrary(matchText, fromIANATz, toIANATz);

          const timeSpan = document.createElement('span');
          timeSpan.className = 'time-converter-replaced';

          if (convertedDateStr !== matchText) {
            // Replace with converted date, show original on hover
            timeSpan.textContent = convertedDateStr;
            timeSpan.title = `Original: ${matchText} (${fromTimezoneShort})`;
            timeSpan.setAttribute('data-original', matchText);
            timeSpan.setAttribute('data-converted', convertedDateStr);
            timeSpan.setAttribute('data-from-tz', fromTimezoneShort);
            timeSpan.setAttribute('data-to-tz', toTimezoneShort);
            count++;
          } else {
            // Keep original if conversion failed, but still set data attributes for removal
            timeSpan.textContent = matchText;
            timeSpan.title = 'Could not convert this date';
            timeSpan.setAttribute('data-original', matchText);
            timeSpan.setAttribute('data-converted', matchText);
            timeSpan.setAttribute('data-from-tz', fromTimezoneShort);
            timeSpan.setAttribute('data-to-tz', toTimezoneShort);
          }

          newFragment.appendChild(timeSpan);
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

function convertDateWithLibrary(dateString, fromIANATz, toIANATz) {
  const { zonedTimeToUtc, utcToZonedTime, format: formatTz } = dateFnsTz;

  let parsedDate;

  // Try different parsing strategies
  try {
    // First, try direct parsing with new Date
    parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date from new Date()');
    }
  } catch (e) {
    // Try manual parsing for common formats
    const cleanStr = dateString.trim();

    // Handle YYYY/MM/DD format first (prioritized to fix ambiguity)
    let match = cleanStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?)?/);
    if (match) {
      const [, year, month, day, hour, minute, second, ampm] = match;
      let hour24 = hour ? parseInt(hour) : 0;
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute) || 0, parseInt(second) || 0);
    }

    // Handle MM/DD/YYYY format only if YYYY/MM/DD didn't match
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      match = cleanStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?)?/);
      if (match) {
        const [, month, day, year, hour, minute, second, ampm] = match;
        let hour24 = hour ? parseInt(hour) : 0;
        if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
        if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
        parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute) || 0, parseInt(second) || 0);
      }
    }

    // Handle YYYY-MM-DD HH:MM format
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      match = cleanStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/);
      if (match) {
        const [, year, month, day, hour, minute, second, ampm] = match;
        let hour24 = parseInt(hour);
        if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
        if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
        parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute), parseInt(second) || 0);
      }
    }

    // Handle time-only format (HH:MM AM/PM)
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      match = cleanStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)$/);
      if (match) {
        const [, hour, minute, second, ampm] = match;
        let hour24 = parseInt(hour);
        if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
        if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
        const today = new Date();
        parsedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, parseInt(minute), parseInt(second) || 0);
      }
    }
  }

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return dateString;
  }

  try {
    let utcDate;

    // If source is already UTC, don't convert to UTC
    if (fromIANATz === 'UTC' || fromIANATz === 'GMT' || fromIANATz === 'Etc/GMT') {
      utcDate = parsedDate;
    } else {
      utcDate = zonedTimeToUtc(parsedDate, fromIANATz);
    }

    // Convert UTC to target timezone
    const targetDate = utcToZonedTime(utcDate, toIANATz);

    // Use short timezone name instead of full IANA name
    const shortTzName = getShortTimezoneName(toIANATz);
    const formatted = formatTz(targetDate, 'MM/dd/yyyy, hh:mm a', { timeZone: toIANATz }) + ` ${shortTzName}`;

    return formatted;
  } catch (e) {
    return dateString;
  }
}

function getIANATimezone(tz) {
    const tzMap = {
        'PST': 'America/Los_Angeles', 'PDT': 'America/Los_Angeles',
        'MST': 'America/Denver',      'MDT': 'America/Denver',
        'CST': 'America/Chicago',     'CDT': 'America/Chicago',
        'EST': 'America/New_York',    'EDT': 'America/New_York',
        'IST': 'Asia/Kolkata',
        'AEST': 'Australia/Sydney',  'AEDT': 'Australia/Sydney',
        'JST': 'Asia/Tokyo',
        'CET': 'Europe/Paris',        'CEST': 'Europe/Paris',
        'UTC': 'UTC',
        'GMT': 'Etc/GMT' // GMT is often equivalent to UTC, Etc/GMT is a specific IANA name.
    };
    const iana = tzMap[tz.toUpperCase()];
    if (!iana) {
        // Attempt to see if 'tz' itself is a valid IANA timezone
        try {
            new Intl.DateTimeFormat('en', { timeZone: tz });
            return tz;
        } catch (e) {
            return 'UTC'; // Fallback for unknown timezone
        }
    }
    return iana;
}

function getShortTimezoneName(ianaTimezone) {
    const shortNameMap = {
        'America/Los_Angeles': 'PST',
        'America/Denver': 'MST',
        'America/Chicago': 'CST',
        'America/New_York': 'EST',
        'Asia/Kolkata': 'IST',
        'Australia/Sydney': 'AEST',
        'Asia/Tokyo': 'JST',
        'Europe/Paris': 'CET',
        'UTC': 'UTC',
        'Etc/GMT': 'GMT'
    };
    return shortNameMap[ianaTimezone] || ianaTimezone;
}

// Custom format management functions
async function getCustomFormatsForPage() {
  return new Promise((resolve) => {
    const currentUrl = window.location.hostname;
    chrome.storage.sync.get(['customFormats'], (data) => {
      const customFormats = data.customFormats || {};
      const pageFormats = customFormats[currentUrl] || [];
      resolve(pageFormats);
    });
  });
}

async function saveCustomFormatForPage(formatPattern, description) {
  return new Promise((resolve) => {
    const currentUrl = window.location.hostname;
    chrome.storage.sync.get(['customFormats'], (data) => {
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
  const convertedSpans = document.querySelectorAll('.time-converter-replaced[data-original]');
  convertedSpans.forEach(span => {
    const original = span.getAttribute('data-original');
    const fromTz = span.getAttribute('data-from-tz');
    if (original) {
      span.textContent = original;
      span.title = `Converted: ${span.getAttribute('data-converted')} (${span.getAttribute('data-to-tz')})`;
      // Swap the data attributes
      span.setAttribute('data-original', span.getAttribute('data-converted'));
      span.setAttribute('data-converted', original);
      span.setAttribute('data-from-tz', span.getAttribute('data-to-tz'));
      span.setAttribute('data-to-tz', fromTz);
    }
  });
}

// Function to remove a specific highlight using the right-clicked element
function removeSpecificHighlight() {
  console.log('removeSpecificHighlight called with element:', window.lastRightClickedElement);
  
  if (!window.lastRightClickedElement) {
    console.log('No last right-clicked element');
    return false;
  }
  
  if (!window.lastRightClickedElement.classList.contains('time-converter-replaced')) {
    console.log('Element is not a highlighted date');
    return false;
  }
  
  const span = window.lastRightClickedElement;
  const originalText = span.getAttribute('data-original');
  const currentText = span.textContent;
  
  console.log('Element attributes:', {
    originalText: originalText,
    currentText: currentText,
    title: span.title,
    className: span.className
  });
  
  // Use original text if available, otherwise use current text
  const textToRestore = originalText || currentText;
  console.log('Restoring text:', textToRestore);
  
  try {
    // Replace the span with plain text
    const textNode = document.createTextNode(textToRestore);
    if (span.parentNode) {
      span.parentNode.replaceChild(textNode, span);
      console.log('Successfully removed highlight');
      return true;
    } else {
      console.log('No parent node found');
      return false;
    }
  } catch (error) {
    console.error('Error removing highlight:', error);
    return false;
  }
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

// Helper function to identify the date format pattern
function identifyDateFormat(dateString) {
  console.log('Identifying format for:', dateString);
  
  const patterns = [
    { regex: /(\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'YYYY/MM/DD' },
    { regex: /(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'MM/DD/YYYY' },
    { regex: /(\d{1,2}\/\d{1,2}\/\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'MM/DD/YY' },
    { regex: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2}))/, name: 'ISO 8601' },
    { regex: /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)/, name: 'YYYY-MM-DD' },
    { regex: /(\b\d{1,2}\.\d{1,2}\.\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?\b)/, name: 'DD.MM.YYYY' },
    { regex: /(\d{1,2}-\d{1,2}-\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'DD-MM-YYYY' },
    { regex: /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'Month DD, YYYY' },
    { regex: /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'DD Month YYYY' },
    { regex: /(\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)\b)/, name: 'Time only' },
    { regex: /(\b1[0-9]{9}\b)/, name: 'Unix timestamp' }
  ];
  
  for (const { regex, name } of patterns) {
    if (regex.test(dateString)) {
      console.log('Matched pattern:', name, 'Regex:', regex);
      return regex;
    }
  }
  
  console.log('No matching pattern found for:', dateString);
  return null;
}

// Stoplist management functions
async function getStoplistForPage() {
  return new Promise((resolve) => {
    const currentUrl = window.location.hostname;
    chrome.storage.sync.get(['stoplist'], (data) => {
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
      const stoplist = data.stoplist || {};
      if (!stoplist[currentUrl]) {
        stoplist[currentUrl] = [];
      }
      
      // Add pattern if not already in stoplist
      if (!stoplist[currentUrl].includes(patternSource)) {
        stoplist[currentUrl].push(patternSource);
        chrome.storage.sync.set({ stoplist }, () => {
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
      const stoplist = data.stoplist || {};
      delete stoplist[currentUrl];
      chrome.storage.sync.set({ stoplist }, () => {
        console.log('Stoplist cleared. New stoplist:', stoplist);
        resolve(true);
      });
    });
  });
}