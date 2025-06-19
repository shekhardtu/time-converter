// Check if the script has already been injected to avoid re-injecting and creating duplicate listeners.
if (typeof window.timeConverterInjected === 'undefined') {
  window.timeConverterInjected = true;

  // Function to initialize auto-conversion
  function initAutoConversion() {
    chrome.storage.sync.get(['fromTimezone', 'toTimezone'], (data) => {
      if (data.fromTimezone && data.toTimezone) {
        executeConversion({ from: data.fromTimezone, to: data.toTimezone });
      }
    });
  }

  // Auto-convert on page load with default settings
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoConversion);
  } else {
    // Delay to ensure DOM is ready
    setTimeout(initAutoConversion, 100);
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'convertTime') {
      // Defer execution until the document is fully loaded.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => executeConversion(request, sendResponse));
      } else {
        executeConversion(request, sendResponse);
      }
    }
    // Return true to indicate you wish to send a response asynchronously.
    return true;
  });
}

function executeConversion(request, sendResponse) {
  const { from, to } = request;
  const count = findAndConvertTimestamps(document.body, from, to);
  if (sendResponse) sendResponse({ status: `Converted ${count} timestamps.` });
}

function findAndConvertTimestamps(element, fromTimezoneShort, toTimezoneShort) {
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
  const dateRegex = /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}[T ]\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?|\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?|\b\d{1,2}-\d{1,2}-\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?(?:AM|PM|am|pm))?)/gi;

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

          const convertedDateStr = convertDateWithLibrary(matchText, fromIANATz, toIANATz, toTimezoneShort);

          const highlightSpan = document.createElement('span');
          highlightSpan.className = 'time-converter-highlight';
          highlightSpan.textContent = matchText;

          if (convertedDateStr !== matchText) {
            highlightSpan.title = `Converted: ${convertedDateStr}`;
            count++;
          } else {
            highlightSpan.title = 'Could not convert this date (or it is already in the target timezone).';
          }

          newFragment.appendChild(highlightSpan);
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

function convertDateWithLibrary(dateString, fromIANATz, toIANATz, toTimezoneShort) {
  const { zonedTimeToUtc, utcToZonedTime, format } = dateFnsTz;
  const { parseISO, parse } = dateFns;

  // Attempt to parse the date string. This might need more sophisticated logic for various formats.
  let parsedDate;
  const commonFormats = [
    'yyyy/MM/dd HH:mm:ss',
    'yyyy/MM/dd h:mm:ss a',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd h:mm:ss a',
    'MM/dd/yyyy HH:mm:ss',
    'MM/dd/yyyy h:mm:ss a',
    'yyyy-MM-dd\'T\'HH:mm:ss',
    'yyyy-MM-dd\'T\'HH:mm:ssXXX', // ISO with timezone offset
    'yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX',
    'MMM d, yyyy h:mm:ss a' // e.g., Jun 19, 2025 3:02:00 PM
  ];

  // Try direct parsing as ISO or with a known timezone if present
  try {
    parsedDate = parseISO(dateString); // Handles ISO 8601 like '2025-06-19T15:02:00Z'
    if (isNaN(parsedDate.getTime())) throw new Error('Not ISO');
  } catch (e) {
    // If not ISO, try parsing with common formats, assuming it's in 'fromIANATz'
    for (const fmt of commonFormats) {
      try {
        // We need a reference date for parse if only time is given, but our regex should capture full dates.
        // The `parse` function from date-fns expects a reference date for ambiguous formats.
        // However, if the dateString is complete, it should parse correctly.
        const tempDate = parse(dateString, fmt, new Date());
        if (!isNaN(tempDate.getTime())) {
          // If parsed, assume this date is in the 'from' timezone and convert to UTC
          parsedDate = zonedTimeToUtc(tempDate, fromIANATz);
          break;
        }
      } catch (parseError) {
        // Try next format
      }
    }
  }
  
  // If still not parsed, try a more general new Date() and assume it's in fromIANATz
  if (!parsedDate || isNaN(parsedDate.getTime())) {
      try {
        const generalDate = new Date(dateString);
        if (!isNaN(generalDate.getTime())) {
            parsedDate = zonedTimeToUtc(generalDate, fromIANATz);
        }
      } catch (generalError) {
        // final attempt failed
      }
  }

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    console.warn(`Could not parse date: ${dateString} with fromZone: ${fromIANATz}`);
    return dateString; // Return original if parsing fails
  }

  try {
    // Convert the UTC date to the target timezone
    const zonedDate = utcToZonedTime(parsedDate, toIANATz);
    // Format the date in the target timezone
    // Example format: 06/19/2025, 08:32 PM IST
    return format(zonedDate, "MM/dd/yyyy, hh:mm:ss a zzz", { timeZone: toIANATz }) + ` ${toTimezoneShort.toUpperCase()}`;
  } catch (e) {
    console.error(`Error formatting date in timezone ${toIANATz}:`, e);
    return dateString; // Return original on error
  }
}

// Keep the IANA timezone mapping function
function getIANATimezone(tz) {
    const tzMap = {
        'PST': 'America/Los_Angeles', // Pacific Standard Time
        'PDT': 'America/Los_Angeles', // Pacific Daylight Time
        'MST': 'America/Denver',      // Mountain Standard Time
        'MDT': 'America/Denver',      // Mountain Daylight Time
        'CST': 'America/Chicago',     // Central Standard Time
        'CDT': 'America/Chicago',     // Central Daylight Time
        'EST': 'America/New_York',    // Eastern Standard Time
        'EDT': 'America/New_York',    // Eastern Daylight Time
        'IST': 'Asia/Kolkata',        // Indian Standard Time
        'AEST': 'Australia/Sydney',  // Australian Eastern Standard Time
        'AEDT': 'Australia/Sydney',  // Australian Eastern Daylight Time
        'JST': 'Asia/Tokyo',          // Japan Standard Time
        'CET': 'Europe/Paris',        // Central European Time
        'CEST': 'Europe/Paris',       // Central European Summer Time
        'UTC': 'UTC',
        'GMT': 'Etc/GMT'
    };
    return tzMap[tz.toUpperCase()] || tz; // Fallback to tz itself if not in map (e.g., if it's already IANA)
}