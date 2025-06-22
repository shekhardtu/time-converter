# 🌍 Timezone Converter Chrome Extension

<div align="center">

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?style=for-the-badge&logo=google-chrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=for-the-badge)
![License MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)

[![GitHub Stars](https://img.shields.io/github/stars/shekhardtu/time-converter?style=social)](https://github.com/shekhardtu/time-converter)
[![GitHub Issues](https://img.shields.io/github/issues/shekhardtu/time-converter)](https://github.com/shekhardtu/time-converter/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/shekhardtu/time-converter)](https://github.com/shekhardtu/time-converter/pulls)
[![Tests](https://img.shields.io/badge/tests-101%20passing-brightgreen)](https://github.com/shekhardtu/time-converter)

**Automatically detect and convert dates & times across different timezones on any webpage**

[📥 Install from Chrome Web Store](#) • [🐛 Report Bug](https://github.com/shekhardtu/time-converter/issues) • [✨ Request Feature](https://github.com/shekhardtu/time-converter/issues)

</div>

---

## 🚀 Features

### ⚡ **Smart Date Detection**
- **15+ Format Support**: Automatically detects ISO 8601, US/European formats, Unix timestamps, and relative time
- **Context-Aware**: Avoids false positives by understanding date context
- **Real-time Processing**: Instant conversion as pages load

### 🎨 **Modern UI Experience**  
- **Clean Design**: Shadcn-inspired interface with intuitive controls
- **Smart Highlighting**: Blue highlights with hover tooltips showing original dates
- **Status Integration**: Footer displays system time and conversion status
- **Responsive**: Works seamlessly across different screen sizes

### 🔧 **Advanced Controls**
- **Site-Level Disable**: Turn off conversion for entire domains
- **Page-Level Disable**: Disable conversion for specific pages
- **Custom Formats**: Add site-specific date patterns using tokens (YYYY, MM, DD, etc.)
- **Right-Click Menu**: Quick access to remove highlights or disable detection

### 🌐 **Timezone Management**
- **20+ Timezones**: Support for major world timezones with full descriptions
- **Smart Defaults**: Auto-detects your system timezone
- **Persistent Settings**: Remembers your preferred timezone combinations
- **Real-time Updates**: Live system clock with timezone display

### 🔒 **Privacy & Security**
- **Local Processing**: All conversion happens locally - no external servers
- **Minimal Permissions**: Only requests necessary browser permissions
- **No Tracking**: Zero user analytics or data collection
- **Open Source**: Transparent code you can review and contribute to

---

## 📸 Screenshots

<div align="center">

| Popup Interface | Date Conversion | Settings |
|----------------|-----------------|----------|
| ![Popup](docs/images/popup.png) | ![Conversion](docs/images/conversion.png) | ![Settings](docs/images/settings.png) |

</div>

---

## 🛠️ Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store page](#)
2. Click "Add to Chrome"
3. Confirm installation

### Manual Installation (Development)
1. Download or clone this repository
```bash
git clone https://github.com/shekhardtu/time-converter
cd time-converter
```

2. Install dependencies and build
```bash
npm install
npm run build
```

3. Load in Chrome
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

---

## 🎯 Usage

### Basic Conversion
1. **Click the extension icon** in your browser toolbar
2. **Select timezones** from the dropdowns (From → To)
3. **Click Convert** to transform all dates on the current page
4. **Click Revert** to restore original dates

### Advanced Features

#### Custom Date Formats
```
YYYY-MM-DD HH:mm:ss    → 2024-03-15 14:30:00
MM/DD/YYYY             → 03/15/2024
DD.MM.YYYY             → 15.03.2024
```

#### Keyboard Shortcuts
- **Alt+C** (Cmd+C on Mac): Convert dates
- **Alt+R** (Cmd+R on Mac): Revert dates

#### Site Management
- **Disable Site**: Turn off conversion for the entire domain
- **Disable Page**: Turn off conversion for the current page only
- **Custom Formats**: Add patterns specific to certain websites

---

## 🧪 Development

### Prerequisites
- Node.js 16+ and npm
- Chrome/Chromium browser
- Basic knowledge of JavaScript and Chrome Extensions

### Setup Development Environment
```bash
# Clone repository
git clone https://github.com/shekhardtu/time-converter
cd time-converter

# Install dependencies  
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/popup.test.js
```

### Project Structure
```
time-converter/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.js              # Popup logic and timezone management
├── content.js            # Page content manipulation
├── background.js         # Extension service worker
├── style.css            # Page styling for highlights
├── images/              # Extension icons and assets
├── lib/                 # Date manipulation libraries
├── tests/               # Jest test suites
└── docs/                # Documentation and screenshots
```

---

## 🤝 Contributing

We love contributions! Whether you're fixing bugs, adding features, or improving documentation, your help makes this extension better for everyone.

### Quick Start
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Test** thoroughly (`npm test`)
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to your branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Development Guidelines
- ✅ **Write tests** for new features
- ✅ **Follow ESLint** configuration
- ✅ **Update documentation** for user-facing changes
- ✅ **Test manually** in Chrome before submitting
- ✅ **Keep commits focused** and descriptive

### Areas We Need Help With
- 🌍 **Internationalization**: Adding support for more date formats
- 🎨 **UI/UX**: Improving design and user experience  
- 🧪 **Testing**: Expanding test coverage
- 📚 **Documentation**: Writing guides and examples
- 🐛 **Bug Fixes**: Resolving issues and edge cases

See our [Contributing Guidelines](CONTRIBUTING.md) for detailed information.

---

## 💬 Feedback & Support

### 🐛 Found a Bug?
[Create an issue](https://github.com/shekhardtu/time-converter/issues/new?template=bug_report.md) with:
- Steps to reproduce
- Expected vs actual behavior  
- Chrome version and OS
- Screenshots if helpful

### ✨ Want a Feature?
[Request a feature](https://github.com/shekhardtu/time-converter/issues/new?template=feature_request.md) by describing:
- What you'd like to see
- Why it would be useful
- How you imagine it working

### 💡 Questions or Ideas?
[Start a discussion](https://github.com/shekhardtu/time-converter/discussions) to:
- Ask questions about usage
- Share ideas for improvements
- Connect with other users
- Get help with development

### ⭐ Enjoying the Extension?
- **Star this repository** to show your support
- **Leave a review** on the Chrome Web Store
- **Share it** with friends and colleagues
- **Follow us** for updates

---

## 📊 Stats & Analytics

![Code Quality](https://img.shields.io/codeclimate/maintainability/shekhardtu/time-converter)
![Test Coverage](https://img.shields.io/codecov/c/github/shekhardtu/time-converter)
![Bundle Size](https://img.shields.io/bundlephobia/minzip/time-converter)

### Version History
- **v1.1.0** - Modern UI redesign, enhanced state management
- **v1.0.0** - Initial release with core functionality

### Browser Support
- ✅ Chrome 88+
- ✅ Edge 88+  
- ✅ Brave
- ✅ Opera
- ❌ Firefox (different extension system)
- ❌ Safari (different extension system)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### What This Means
- ✅ **Commercial use** - Use in commercial projects
- ✅ **Modification** - Change and customize the code
- ✅ **Distribution** - Share with others
- ✅ **Private use** - Use for personal projects
- ⚠️ **Attribution required** - Credit the original authors

---

## 🙏 Acknowledgments

- **Date-fns Library** - Robust date manipulation
- **Heroicons** - Beautiful SVG icons  
- **Shadcn** - Design system inspiration
- **Chrome Extensions Community** - Documentation and best practices
- **Contributors** - Everyone who helped improve this extension

---

<div align="center">

**Made with ❤️ by the community**

[⬆ Back to Top](#-timezone-converter-chrome-extension)

</div>