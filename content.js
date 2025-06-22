// Global variable to track the currently right-clicked element - use window to ensure accessibility
if (typeof window.lastRightClickedElement === 'undefined') {
  window.lastRightClickedElement = null;
}

// Check if the script has already been injected to avoid re-injecting and creating duplicate listeners.
// Function to initialize auto-conversion
function initAutoConversion() {
  chrome.storage.sync.get(['fromTimezone', 'toTimezone'], async (data) => {
    if (data.fromTimezone && data.toTimezone) {
      // Check if this site or page is disabled
      const isSiteDisabled = await checkSiteDisabled();
      const isPageDisabled = await checkPageDisabled();
      if (isSiteDisabled || isPageDisabled) {
        console.log('Auto-conversion disabled for this site or page');
        return;
      }

      // Check if there are already converted dates, if so, don't auto-convert
      const existingHighlights = document.querySelectorAll('.time-converter-replaced');
      if (existingHighlights.length === 0) {
        console.log('Auto-converting dates on page load...');
        await executeConversion({ from: data.fromTimezone, to: data.toTimezone });
      } else {
        console.log('Page already has converted dates, skipping auto-conversion');
      }
    }
  });
}

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
  const defaultRegexPatterns = DATE_PARSING_PATTERNS.map(pattern => {
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

  const fromIANATz = getIANATimezone(fromTimezoneShort);
  const toIANATz = getIANATimezone(toTimezoneShort);

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
          if (!isValidDateText(matchText)) {
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

          const convertedDateStr = convertDateWithLibrary(matchText, fromIANATz, toIANATz);

          // Only create highlights for successful conversions
          if (convertedDateStr !== matchText) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'time-converter-replaced';
            timeSpan.textContent = convertedDateStr;
            timeSpan.title = `Original: ${matchText} (${fromTimezoneShort})`;
            timeSpan.setAttribute('data-original', matchText);
            timeSpan.setAttribute('data-converted', convertedDateStr);
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

function isValidDateRange(year, month, day, hour, minute) {
  // Basic validation for realistic date ranges
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;

  // Month-specific day validation
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return false;

  // February leap year check
  if (month === 2 && day === 29) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (!isLeap) return false;
  }

  return true;
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

// Define date format parsing patterns - SINGLE SOURCE OF TRUTH
// Order matters: More specific patterns first to avoid ambiguity
const DATE_PARSING_PATTERNS = [
  {
    name: 'ISO8601_FULL',
    regex: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(?:Z|[+-]\d{2}:\d{2})/,
    parser: (match) => {
      const [, year, month, day, hour, minute] = match;
      return { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: parseInt(hour), minute: parseInt(minute) };
    }
  },
  {
    name: 'ISO8601_SIMPLE',
    regex: /(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/,
    parser: (match) => {
      const [, year, month, day, hour, minute, , ampm] = match;
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'YYYY_MM_DD',
    regex: /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/,
    parser: (match) => {
      const [, year, month, day, hour, minute, , ampm] = match;
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'MM_DD_YYYY',
    regex: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/,
    parser: (match) => {
      const [, month, day, year, hour, minute, , ampm] = match;
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;

      // Handle 2-digit years: 00-49 -> 20xx, 50-99 -> 19xx
      let fullYear = parseInt(year);
      if (fullYear < 100) {
        fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
      }

      return { year: fullYear, month: parseInt(month), day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'DD_MM_YYYY_DOT',
    regex: /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    parser: (match) => {
      const [, day, month, year, hour, minute] = match;
      return { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: parseInt(hour), minute: parseInt(minute) };
    }
  },
  {
    name: 'DD_MM_YYYY_DASH',
    regex: /(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/,
    parser: (match) => {
      const [, day, month, year, hour, minute, , ampm] = match;
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;

      // Handle 2-digit years: 00-49 -> 20xx, 50-99 -> 19xx
      let fullYear = parseInt(year);
      if (fullYear < 100) {
        fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
      }

      return { year: fullYear, month: parseInt(month), day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'MONTH_DD_YYYY',
    regex: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/i,
    parser: (match) => {
      const [, monthStr, day, year, hour, minute, , ampm] = match;
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      const month = monthMap[monthStr.substring(0, 3)];
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { year: parseInt(year), month: month, day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  },
  {
    name: 'DD_MONTH_YYYY',
    regex: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/i,
    parser: (match) => {
      const [, day, monthStr, year, hour, minute, , ampm] = match;
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      const month = monthMap[monthStr.substring(0, 3)];
      let hour24 = parseInt(hour);
      if (ampm && ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
      if (ampm && ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
      return { year: parseInt(year), month: month, day: parseInt(day), hour: hour24, minute: parseInt(minute) };
    }
  }
];

function parseAndValidateDate(dateText) {
  const cleanStr = dateText.trim();

  // Check for timezone-suffixed patterns that should be rejected
  // Only reject if there's actually a timezone suffix after the time
  // Patterns like "12/19/2024, 09:00 PM IST" or "12/19/2024 09:00 PM EST"
  if (/(?:AM|PM|am|pm)[,\s]+[A-Z]{2,5}\b/.test(cleanStr)) {
    return null;
  }

  // Try each pattern
  for (const pattern of DATE_PARSING_PATTERNS) {
    const match = cleanStr.match(pattern.regex);
    if (match) {
      const dateComponents = pattern.parser(match);
      if (isValidDateRange(dateComponents.year, dateComponents.month, dateComponents.day, dateComponents.hour, dateComponents.minute)) {
        return dateComponents;
      } else {
        return null; // Invalid date values
      }
    }
  }

  return null; // No pattern matched
}

function isValidDateText(dateText) {
  return parseAndValidateDate(dateText) !== null;
}

function convertDateWithLibrary(dateString, fromIANATz, toIANATz) {
  const { zonedTimeToUtc, utcToZonedTime, format: formatTz } = dateFnsTz;

  let utcDate;

  // Try unified parsing first
  const dateComponents = parseAndValidateDate(dateString);
  if (dateComponents) {
    // Create date in UTC first, then interpret as source timezone
    const tempDate = new Date(Date.UTC(dateComponents.year, dateComponents.month - 1, dateComponents.day, dateComponents.hour, dateComponents.minute));
    
    // If source is already UTC, use the date as-is
    if (fromIANATz === 'UTC' || fromIANATz === 'GMT' || fromIANATz === 'Etc/GMT') {
      utcDate = tempDate;
    } else {
      // Create a local date in the source timezone, then convert to UTC
      const localDate = new Date(dateComponents.year, dateComponents.month - 1, dateComponents.day, dateComponents.hour, dateComponents.minute);
      utcDate = zonedTimeToUtc(localDate, fromIANATz);
    }
  } else {
    // Fallback to direct Date parsing for edge cases
    try {
      const parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) {
        return dateString; // Cannot parse
      }
      
      // If source is already UTC, use the date as-is
      if (fromIANATz === 'UTC' || fromIANATz === 'GMT' || fromIANATz === 'Etc/GMT') {
        utcDate = parsedDate;
      } else {
        utcDate = zonedTimeToUtc(parsedDate, fromIANATz);
      }
    } catch (e) {
      return dateString; // Cannot parse
    }
  }

  if (!utcDate || isNaN(utcDate.getTime())) {
    return dateString;
  }

  try {
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

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    convertDateWithLibrary,
    parseAndValidateDate,
    getShortTimezoneName
  };
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
    if (original) {
      // Replace the span with plain text node to restore original styling
      const textNode = document.createTextNode(original);
      if (span.parentNode) {
        span.parentNode.replaceChild(textNode, span);
      }
    }
  });

  // Reset page state
  window.timeConverterPageState = {
    converted: false,
    fromTimezone: null,
    toTimezone: null,
    conversionTimestamp: null
  };

  // Hide status label when reverting
  hideConversionStatusLabel();
}

// Promisified version of revertAllDates for async operations
function revertAllDatesPromise() {
  return new Promise((resolve) => {
    try {
      const convertedSpans = document.querySelectorAll('.time-converter-replaced[data-original]');
      console.log(`Reverting ${convertedSpans.length} converted dates...`);

      convertedSpans.forEach(span => {
        const original = span.getAttribute('data-original');
        if (original) {
          // Replace the span with plain text node to restore original styling
          const textNode = document.createTextNode(original);
          if (span.parentNode) {
            span.parentNode.replaceChild(textNode, span);
          }
        }
      });

      // Reset page state
      window.timeConverterPageState = {
        converted: false,
        fromTimezone: null,
        toTimezone: null,
        conversionTimestamp: null
      };

      // Hide status label when reverting
      hideConversionStatusLabel();

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
    { regex: /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)?)/, name: 'DD Month YYYY' }
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
      const disabledSites = data.disabledSites || [];
      resolve(disabledSites.includes(hostname));
    });
  });
}

// Check if current page is disabled
async function checkPageDisabled() {
  return new Promise((resolve) => {
    const pageUrl = window.location.hostname + window.location.pathname;
    chrome.storage.sync.get(['disabledPages'], (data) => {
      const disabledPages = data.disabledPages || [];
      resolve(disabledPages.includes(pageUrl));
    });
  });
}
