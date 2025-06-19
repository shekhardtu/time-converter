# Timezone Converter Chrome Extension

A powerful Chrome extension that automatically detects and converts date/time formats on web pages across different timezones.

## Features

### 🕐 Automatic Date Detection
- Detects 15+ common date/time formats automatically
- Supports ISO 8601, US, European, and international formats
- Handles Unix timestamps and relative time expressions

### ✨ Smart Highlighting & Control
- Visual highlighting of converted dates
- Hover to see the original date/time
- **Right-click** on any converted date to:
  - Remove just that specific highlight.
  - Remove all highlights of the same format and prevent it from being converted again on that site (adds to a "stoplist").
- Clear the stoplist for a site via the extension popup to re-enable all formats.

### 🌍 Smart Timezone Conversion
- Convert between any timezone pair
- Persistent settings per browser

### ⚙️ Custom Format Support
- Add custom date formats for specific websites
- Format patterns using familiar tokens (YYYY, MM, DD, etc.)
- Per-domain format storage

### 🎨 Modern Interface
- Clean, glassmorphism design
- SVG icons and smooth animations
- Minimal page styling that doesn't interfere with content

## Quick Start

1. **Install the Extension**
   - Load unpacked extension in Chrome Developer Mode
   - Pin the extension to your toolbar

2. **Set Your Timezones**
   - Click the extension icon
   - Select "Convert from" timezone
   - Select "Convert to" timezone
   - Click "Convert"

3. **See the Magic**
   - Dates on the page are automatically highlighted and converted
   - Hover over converted dates to see the original
   - Use "Revert" to toggle back to original dates

4. **Control Highlights**
   - **Right-click** a highlighted date to open the context menu.
   - Choose to remove only that highlight or all highlights matching that format.
   - If a format is causing issues, removing all instances will stop it from being converted automatically on that site in the future.

## Supported Date Formats

### Built-in Formats
- **ISO 8601**: `2024-12-19T15:30:00Z`, `2024-12-19 15:30:00`
- **US Format**: `12/19/2024 3:30 PM`, `12/19/24`
- **European**: `19.12.2024 15:30`, `19-12-2024`
- **Month Names**: `December 19, 2024`, `19 Dec 2024 3:30 PM`
- **Time Only**: `3:30 PM`, `15:30:00`
- **Unix Timestamps**: `1734615000`
- **Relative**: `5 minutes ago`, `in 2 hours`

### Custom Formats
Use the "Add Custom Format" feature for specialized formats:
- Server logs: `YYYY-MM-DD HH:mm:ss`
- Database timestamps: `DD/MM/YYYY HH:mm`
- Application-specific formats

## Format Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `YYYY` | 4-digit year | 2024 |
| `MM` | Month (01-12) | 12 |
| `DD` | Day (01-31) | 19 |
| `HH` | Hour (00-23) | 15 |
| `mm` | Minute (00-59) | 30 |
| `ss` | Second (00-59) | 45 |
| `A` | AM/PM | PM |

## Usage Examples

### Basic Conversion
1. Visit any webpage with dates
2. Open extension popup
3. Set "From: UTC" and "To: IST"
4. Click "Convert"
5. All UTC dates become IST dates with blue highlighting

### Custom Format
1. Visit a site with format like `2024.12.19-15:30`
2. Click "Add Custom Format"
3. Enter pattern: `YYYY.MM.DD-HH:mm`
4. Enter description: "Server timestamps"
5. Click "Save"
6. Now this format will be detected automatically

### Reverting Changes
- Click "Revert" to restore original dates
- Toggle between converted and original views
- Page refresh maintains your timezone preference

## Technical Details

### Storage
- Timezone preferences: Chrome sync storage
- Custom formats: Stored per-domain
- Settings persist across browser sessions

### Performance
- Efficient DOM traversal with TreeWalker
- Regex pattern optimization
- Minimal memory footprint

### Privacy
- No data sent to external servers
- All processing happens locally
- No tracking or analytics

## Troubleshooting

### Dates Not Converting?
1. Check if format is supported (see documentation)
2. Try adding a custom format
3. Verify timezone settings are correct
4. Refresh page after setting up custom formats

### Performance Issues?
1. Limit custom formats to essential ones
2. Use specific patterns to avoid false matches
3. Reload extension if problems persist

### UI Issues?
1. Check for conflicting CSS on the page
2. Try different zoom levels
3. Refresh page to reset styles

## Development

### Project Structure
```
time-converter/
├── manifest.json          # Extension configuration
├── popup.html/js          # Extension interface
├── content.js             # Date detection and conversion
├── background.js          # Extension lifecycle
├── lib/                   # Date/timezone libraries
│   ├── date-fns.umd.min.js
│   └── date-fns-tz.umd.min.js
├── style.css              # Page styling
└── DATETIME_FORMATS.md    # Technical documentation
```

### Building
1. Clone the repository
2. Load as unpacked extension in Chrome
3. Make changes and reload extension
4. Test on various websites

### Contributing
- Add new date format patterns
- Improve parsing algorithms
- Enhance UI/UX
- Report bugs and edge cases

## Browser Support

- ✅ Chrome (Manifest V3)
- ✅ Chromium-based browsers
- ❌ Firefox (requires manifest conversion)
- ❌ Safari (different extension system)

## Permissions

- `activeTab`: Access current page content
- `scripting`: Inject conversion scripts
- `storage`: Save timezone preferences, custom formats, and site-specific stoplists
- `tabs`: Communicate with page content
- `contextMenus`: To provide right-click functionality for managing highlights.

## License

MIT License - feel free to modify and distribute

## Support

For technical details and format specifications, see [DATETIME_FORMATS.md](./DATETIME_FORMATS.md)

---

**Made with ❤️ for developers who work across timezones**