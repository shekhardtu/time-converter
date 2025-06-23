// modules/timezone-converter.js

// Using a global object to share functions between scripts
window.TimeConverter = window.TimeConverter || {};

function convertDateWithLibrary(dateString, fromIANATz, toIANATz) {
  const { zonedTimeToUtc, utcToZonedTime, format: formatTz } = dateFnsTz;

  let utcDate;

  // Try unified parsing first
  const dateComponents = window.TimeConverter.dateTimeParser.parseAndValidateDate(dateString);
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

window.TimeConverter.timezoneConverter = {
  convertDateWithLibrary,
  getIANATimezone,
  getShortTimezoneName
};