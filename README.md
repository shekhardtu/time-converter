# ⏰ Time Converter Chrome Extension

A powerful, enterprise-ready Chrome extension for instant timezone conversion and smart date detection across web pages.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/time-converter/releases)

## ✨ Features

### 🔍 **Smart Date Detection**
- Automatically detects 15+ date/time formats on any webpage
- Supports ISO 8601, US, European, Unix timestamps, and relative time
- Context-aware parsing that avoids false positives
- Real-time conversion as you browse

### 🌍 **Global Timezone Support**
- Access to 400+ IANA timezones worldwide
- Interactive timezone widgets with live time updates
- Intuitive flag-based timezone identification
- Smart system timezone detection

### 🎨 **Modern User Interface**
- Clean, glassmorphism-inspired design
- Responsive dropdown components with search
- Live time displays with smooth animations
- Accessibility-focused with keyboard navigation

### ⚡ **Performance Optimized**
- Lightweight footprint with minimal permissions
- Efficient DOM scanning and incremental updates
- Local processing - no external servers required
- Memory-optimized for long browsing sessions

### 🛡️ **Security & Privacy**
- Zero data collection or tracking
- All processing happens locally in your browser
- Minimal required permissions
- Open source and auditable codebase

## 🚀 Quick Start

### Installation

1. **From Chrome Web Store** *(Coming Soon)*
   ```
   Visit: chrome://extensions/
   Search: "Time Converter"
   Click: "Add to Chrome"
   ```

2. **Manual Installation** (Developer Mode)
   ```bash
   git clone https://github.com/yourusername/time-converter.git
   cd time-converter
   ```
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the project folder

### Basic Usage

1. **Automatic Detection**: Visit any webpage with dates - they'll be automatically highlighted in blue
2. **Hover for Details**: Hover over highlighted dates to see conversion tooltips
3. **Manual Conversion**: Click the extension icon to access the full converter interface
4. **Custom Formats**: Add site-specific date patterns for specialized websites

## 📖 User Guide

### Timezone Conversion Interface

The main popup provides an intuitive conversion interface:

- **From/To Dropdowns**: Select source and target timezones with live search
- **Convert Button**: Instantly convert selected timezones
- **Revert Button**: Quickly swap source and target timezones
- **Timezone Widgets**: Display live time in up to 3 configurable timezones

### Smart Highlights

Time Converter automatically detects and highlights various date formats:

- `2023-12-25` (ISO format)
- `Dec 25, 2023` (US format) 
- `25/12/2023` (European format)
- `1703462400` (Unix timestamp)
- `2 hours ago` (Relative time)

### Right-Click Controls

- **Remove Highlight**: Remove individual date highlights
- **Disable for Site**: Stop detection on the current domain
- **Custom Format**: Add site-specific date patterns

### Custom Date Formats

Add custom patterns using these tokens:
- `YYYY` - 4-digit year
- `MM` - 2-digit month  
- `DD` - 2-digit day
- `HH` - 24-hour format hour
- `mm` - Minutes

Example: `DD.MM.YYYY HH:mm` matches `25.12.2023 14:30`

## 🛠️ Development

### Prerequisites

- Node.js 16+ (for development tools)
- Chrome Browser
- Basic knowledge of Chrome Extension APIs

### Project Structure

```
time-converter/
├── manifest.json           # Extension configuration (Manifest V3)
├── popup.html              # Main popup interface
├── popup.js                # Core popup logic and timezone widgets
├── popup-styles.css        # Modern styling with CSS custom properties
├── content.js              # Content script for page scanning
├── background.js            # Service worker for extension lifecycle
├── custom-dropdown.js      # Reusable dropdown component
├── all-timezones.js        # Comprehensive IANA timezone data
├── lib/                    # External libraries
│   └── date-fns-tz.umd.min.js  # Date manipulation library
├── modules/                # Modular components
│   ├── date-time-parser.js # Date parsing and validation
│   ├── dom-manipulator.js  # DOM manipulation utilities
│   ├── state-manager.js    # State management
│   └── timezone-converter.js # Core conversion logic
└── tests/                  # Test suites
    ├── date-parsing.test.js
    └── timezone-accuracy.test.js
```

### Building and Testing

```bash
# Install development dependencies (optional)
npm install

# Run tests
npm test

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the project directory

# Test on various websites
# - Try different date formats
# - Test timezone conversions
# - Verify custom format detection
```

### Code Style

The project follows enterprise-grade coding standards:

- **ES6+ Modern JavaScript**: Classes, arrow functions, async/await
- **JSDoc Documentation**: Comprehensive function and class documentation
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Performance**: Optimized DOM operations and memory management
- **Accessibility**: WCAG 2.1 compliant with keyboard navigation

### Key Components

#### TimezoneDropdown Class
```javascript
// Standalone dropdown component for timezone selection
class TimezoneDropdown {
  constructor(index, currentTz, timezones) {
    // Initialization with event binding and DOM creation
  }
  
  show() {
    // Display dropdown with proper positioning
  }
  
  selectTimezone(newTz) {
    // Handle timezone selection and storage
  }
}
```

#### Date Detection Engine
```javascript
// Smart date pattern matching with context awareness
function detectDateFormats(textContent) {
  // Multiple regex patterns for international formats
  // Context validation to avoid false positives
  // Return structured date objects
}
```

### Architecture Decisions

- **Manifest V3**: Latest Chrome extension standard for enhanced security
- **Modular Design**: Separation of concerns with dedicated modules
- **Local Processing**: Zero external dependencies for privacy
- **Progressive Enhancement**: Graceful degradation when features aren't available

## 🤝 Contributing

We welcome contributions from developers of all skill levels!

### Getting Started

1. **Fork the Repository**
   ```bash
   git fork https://github.com/yourusername/time-converter
   git clone https://github.com/yourusername/time-converter
   cd time-converter
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Thoroughly**
   - Load the extension in Chrome
   - Test on multiple websites
   - Verify all existing functionality works

5. **Submit a Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Include screenshots for UI changes

### Development Guidelines

- **Code Quality**: Maintain high code quality with proper error handling
- **Documentation**: Add JSDoc comments for new functions and classes
- **Testing**: Include unit tests for complex logic
- **Performance**: Ensure changes don't impact extension performance
- **Security**: Follow secure coding practices, especially for DOM manipulation

### Issue Reporting

When reporting issues, please include:
- Chrome version and operating system
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots or console logs (if applicable)
- Specific websites where the issue occurs

## 📋 Roadmap

### Upcoming Features

#### Version 1.1
- [ ] **Enhanced Date Detection**
  - Support for Asian date formats (Japanese, Chinese, Korean)
  - Improved context awareness to reduce false positives
  - Natural language parsing ("next Monday", "last week")

#### Version 1.2  
- [ ] **Advanced UI Features**
  - Multiple timezone display (show 2-3 zones simultaneously)
  - Keyboard shortcuts for quick actions
  - Multiple highlight color themes
  - Customizable widget layouts

#### Version 1.3
- [ ] **Smart Features**
  - Meeting time suggestions across timezones
  - Timezone abbreviation support (EST, PST, etc.)
  - Integration with calendar applications
  - World clock widget mode

#### Future Considerations
- [ ] **Browser Compatibility**
  - Firefox extension (requires manifest conversion)
  - Safari extension (different architecture)
  - Edge compatibility testing

- [ ] **Advanced Features**
  - Daylight saving time transition notifications
  - Business hours visualization
  - Time zone offset calculations
  - Import/export of custom formats

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Time Converter Extension

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- **date-fns-tz**: Powerful timezone manipulation library
- **Chrome Extension APIs**: Robust platform for browser extensions
- **IANA Timezone Database**: Comprehensive global timezone data
- **Contributors**: All the developers who have contributed to this project

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/time-converter/wiki)
- **Bug Reports**: [GitHub Issues](https://github.com/yourusername/time-converter/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/time-converter/discussions)
- **Security Issues**: Please email security@timeconverter.dev

---

<div align="center">

**Built with ❤️ for developers and users who work across timezones**

[⭐ Star this project](https://github.com/yourusername/time-converter) • [🐛 Report Issues](https://github.com/yourusername/time-converter/issues) • [💡 Request Features](https://github.com/yourusername/time-converter/discussions)

</div>