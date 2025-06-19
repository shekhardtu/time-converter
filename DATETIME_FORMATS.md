# Timezone Converter - DateTime Format Support

## Supported Date/Time Formats

The Timezone Converter extension automatically detects and converts various date/time formats found on web pages. This document outlines all supported formats and how to extend the library with custom formats.

## Built-in Supported Formats

### 1. ISO 8601 Formats
- `2024-12-19T15:30:00Z` (UTC with Z)
- `2024-12-19T15:30:00+05:30` (with timezone offset)
- `2024-12-19T15:30:00.123Z` (with milliseconds)
- `2024-12-19 15:30:00` (space separator)
- `2024-12-19 3:30 PM` (with AM/PM)

### 2. US Date Formats
- `12/19/2024` (MM/DD/YYYY)
- `12/19/2024 3:30 PM` (with time)
- `12/19/24 15:30:00` (2-digit year)
- `1/5/2024 9:15 AM` (single digits)

### 3. European Date Formats
- `19.12.2024` (DD.MM.YYYY)
- `19.12.2024 15:30` (with time)
- `19-12-2024 3:30 PM` (dash separator)
- `5.1.2024 9:15` (single digits)

### 4. Month Name Formats
- `December 19, 2024` (full month name)
- `Dec 19, 2024 3:30 PM` (abbreviated month)
- `19 December 2024` (day first)
- `19 Dec 2024 15:30:00` (with seconds)

### 5. Time-Only Formats
- `3:30 PM` (12-hour format)
- `15:30:00` (24-hour format)
- `9:15 AM` (single digit hour)

### 6. Unix Timestamps
- `1734615000` (10-digit Unix timestamp)

### 7. Relative Time Formats
- `5 minutes ago`
- `2 hours ago`
- `3 days ago`
- `in 1 week`
- `in 30 seconds`

## Custom Format Support

### Adding Custom Formats

The extension allows you to add custom date formats for specific websites. This is useful for applications that use non-standard date formats.

#### Via Popup Interface

1. Click the "Add Custom Format" link in the popup
2. Enter your date format pattern using format tokens
3. Add a description for the format
4. Click "Save"

#### Format Tokens

Use these tokens to define your custom date format:

| Token | Description | Example |
|-------|-------------|---------|
| `YYYY` | 4-digit year | 2024 |
| `YY` | 2-digit year | 24 |
| `MM` | Month (01-12) | 12 |
| `DD` | Day (01-31) | 19 |
| `HH` | Hour (00-23) | 15 |
| `mm` | Minute (00-59) | 30 |
| `ss` | Second (00-59) | 45 |
| `A` | AM/PM | PM |
| `MMM` | Short month name | Dec |
| `MMMM` | Full month name | December |

#### Example Custom Formats

| Format Pattern | Example Date | Description |
|----------------|--------------|-------------|
| `YYYY-MM-DD HH:mm:ss` | 2024-12-19 15:30:45 | Standard SQL datetime |
| `DD/MM/YYYY HH:mm` | 19/12/2024 15:30 | European format with time |
| `MMM DD, YYYY A` | Dec 19, 2024 PM | Month name with AM/PM |
| `YYYY.MM.DD` | 2024.12.19 | Dot-separated date |
| `DD-MMM-YYYY HH:mm:ss` | 19-Dec-2024 15:30:45 | Mixed format |

### Storage and Management

Custom formats are stored per-domain using Chrome's sync storage:

```javascript
// Storage structure
{
  "customFormats": {
    "example.com": [
      {
        "pattern": "YYYY-MM-DD HH:mm:ss",
        "description": "Database timestamps",
        "dateAdded": "2024-12-19T10:30:00.000Z"
      }
    ]
  }
}
```

## Extending the Library

### 1. Adding New Built-in Formats

To add new default date formats, modify the `defaultRegexPatterns` array in `content.js`:

```javascript
const defaultRegexPatterns = [
  // Add your new regex pattern here
  /(\\d{1,2}\\s+\\w+\\s+\\d{4}\\s+\\d{1,2}:\\d{2})/g, // Example: "19 December 2024 15:30"
  
  // Existing patterns...
];
```

### 2. Improving Date Parsing

The `convertDateWithLibrary` function handles date parsing. To improve parsing for specific formats:

1. Add new parsing strategies to the `parseAttempts` array
2. Include format-specific regex patterns
3. Handle edge cases for your format

```javascript
// Example: Adding support for a new format
const parseAttempts = [
  // Add your parsing strategy
  () => {
    const customMatch = cleanStr.match(/your-regex-pattern/);
    if (customMatch) {
      // Parse and return Date object
      return new Date(/* parsed components */);
    }
    return null;
  },
  
  // Existing strategies...
];
```

### 3. Custom Timezone Handling

To add support for additional timezones, update the timezone mappings:

```javascript
// In getIANATimezone function
const tzMap = {
  'YOUR_TZ': 'Your/IANA_Timezone',
  // Existing mappings...
};

// In getShortTimezoneName function
const shortNameMap = {
  'Your/IANA_Timezone': 'YOUR_TZ',
  // Existing mappings...
};
```

### 4. Library Architecture

The extension consists of several key components:

#### Content Script (`content.js`)
- Date detection and conversion logic
- Custom format storage and retrieval
- DOM manipulation for highlighting

#### Popup Interface (`popup.js`, `popup.html`)
- User interface for timezone selection
- Custom format input form
- Extension controls

#### Date/Time Libraries (`lib/`)
- Simplified date-fns implementation
- Timezone conversion utilities
- Format parsing functions

#### Background Script (`background.js`)
- Extension lifecycle management
- Auto-conversion triggers

## Testing Custom Formats

### 1. Validation

The extension automatically validates custom formats by:
- Converting format tokens to regex patterns
- Testing against sample dates
- Storing only valid patterns

### 2. Debugging

To debug custom format issues:

1. Open browser DevTools
2. Check the console for "TimeConverter" logs
3. Look for parsing errors or format mismatches

### 3. Common Issues

| Issue | Cause | Solution |
|-------|--------|----------|
| Format not detected | Regex too specific | Use more flexible patterns |
| Wrong conversion | Incorrect token mapping | Verify format tokens |
| No highlighting | Format not saved | Check storage in DevTools |

## Best Practices

### 1. Format Design
- Use specific patterns that won't match unrelated text
- Include word boundaries where appropriate
- Test with various examples

### 2. Performance
- Avoid overly complex regex patterns
- Limit custom formats per domain
- Use efficient parsing strategies

### 3. User Experience
- Provide clear format descriptions
- Use familiar date format conventions
- Test on actual website content

## API Reference

### Storage API

```javascript
// Get custom formats for current page
const formats = await getCustomFormatsForPage();

// Save new custom format
await saveCustomFormatForPage(pattern, description);
```

### Format Generation

```javascript
// Generate regex from format pattern
const regex = generateRegexFromFormat('YYYY-MM-DD HH:mm:ss');
```

### Message Passing

```javascript
// Add custom format via message
chrome.tabs.sendMessage(tabId, {
  action: 'addCustomFormat',
  pattern: 'YYYY-MM-DD HH:mm:ss',
  description: 'SQL timestamp format'
});
```

## Contributing

To contribute new date format support:

1. Test your format thoroughly
2. Add appropriate regex patterns
3. Include parsing logic
4. Update documentation
5. Add test cases

## Support

For issues or questions about date format support:
- Check browser console for error messages
- Verify format patterns match expected input
- Test with simplified patterns first
- Report bugs with example dates and expected behavior