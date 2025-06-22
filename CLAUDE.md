# CLAUDE.md - Time Converter Chrome Extension

## Project Overview
This is a Chrome extension that automatically detects and converts date/time formats on web pages across different timezones. The extension provides smart highlighting, timezone conversion, and custom format support.

**Key Files:**
- `manifest.json` - Chrome extension configuration (Manifest V3)
- `popup.html/js` - Extension UI and controls
- `content.js` - Core date detection and conversion logic
- `background.js` - Extension service worker
- `style.css` - Minimal page styling for highlights
- `lib/` - Date manipulation libraries (date-fns, date-fns-tz)

## Current Features
- **Auto-detection**: 15+ date/time formats (ISO 8601, US, European, Unix timestamps, relative time)
- **Smart highlighting**: Blue highlights with hover tooltips showing original dates
- **Right-click controls**: Remove individual highlights or disable format detection per site
- **Timezone conversion**: Convert between any timezone pair with persistent settings
- **Custom formats**: Add site-specific date patterns using tokens (YYYY, MM, DD, etc.)
- **Clean UI**: Glassmorphism design with SVG icons

## Architecture
- **Content Script**: Scans DOM for date patterns, applies conversions and highlights
- **Popup Interface**: Timezone selection, custom format management, conversion controls
- **Background Worker**: Manages context menus, extension lifecycle
- **Storage**: Chrome sync for settings, local storage for per-domain formats and stoplists

## Development Commands
- Load as unpacked extension in Chrome Developer Mode
- Test on various websites with different date formats
- Reload extension after code changes

## Testing Approach
- Manual testing on real websites
- Test with various date formats and edge cases
- Verify timezone conversion accuracy
- Test custom format addition/removal

## Potential Feature Additions

### Core Enhancements
1. **Advanced Date Detection**
   - Support for more international date formats (Asian, Arabic, etc.)
   - Better context-aware detection (avoid false positives in numbers)
   - Have context to local system timezone and locale settings to show the conversion unless not selected from the extension. Example: "2023-04-01" UTC will be converted to "Apr 1, 2023"IST in the user's local timezone if the user is system time zone in IST.
   - Smart parsing of ambiguous formats (MM/DD vs DD/MM based on locale)

2. **Enhanced UI/UX**
   - Multiple highlight color themes
   - Keyboard shortcuts for quick actions

3. **Smart Conversion Features**
   - Multiple timezone display (show 2-3 timezones simultaneously)
   - Timezone abbreviation support (EST, PST, etc.)



### Technical Improvements
7. **Performance Optimizations**
   - Lazy loading for large pages
   - Incremental DOM scanning for dynamic content
   - Memory usage optimization for long browsing sessions



9. **Accessibility & Localization**
   - Screen reader compatibility
   - High contrast mode support
   - Multi-language UI support
   - RTL language support

### Integration Features
10. **Third-party Integrations**
    - World clock widget integration

## Security Considerations
- All processing is local (no external servers)
- Minimal permissions required
- No user tracking or analytics
- Safe DOM manipulation practices

## Browser Compatibility
- ✅ Chrome (Manifest V3)
- ✅ Chromium-based browsers
- ❌ Firefox (requires manifest conversion)
- ❌ Safari (different extension system)

This extension follows defensive security practices and helps users convert timestamps safely without sending data to external services.