# Changelog

All notable changes to this Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.15.0] - 2025-06-24

### ✨ Added
- **Modern UI Redesign**: Implemented shadcn-style design system with clean Material Design principles
- **Extension State Indicator**: Extension icon now shows active/disabled state with badge
- **System Time Display**: Real-time clock with timezone information in footer
- **Enhanced Visual Feedback**: Improved button states, hover effects, and visual hierarchy
- **Tooltip-style Popup**: Added speech bubble appearance emerging from extension icon
- **Chrome Web Store Publishing**: Added complete build and release automation

### 🎨 Improved
- **Color Scheme**: Simplified to clean white and blue palette for reduced cognitive load
- **Button Design**: Streamlined buttons without keyboard shortcut clutter
- **Form Elements**: Enhanced contrast and visibility for all input fields
- **Status Indicators**: Better visual feedback for site/page disable states
- **Typography**: Improved font weights, spacing, and readability

### 🔧 Fixed
- **Test Suite**: All 101 tests now pass with proper Chrome API mocks
- **Conversion Feedback**: Fixed status propagation between popup and content script
- **Re-enabling Functionality**: Added refresh prompts when re-enabling disabled sites/pages
- **Icon Rendering**: Replaced emoji icons with consistent SVG icons

### 🏗️ Technical
- **Build System**: Added automated ZIP packaging for Chrome Web Store
- **Semantic Versioning**: Implemented proper version management
- **Code Quality**: Enhanced ESLint rules and Jest coverage thresholds
- **Documentation**: Updated with comprehensive feature documentation


All notable changes to this Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.14.0] - 2025-06-24

### ✨ Added
- **Modern UI Redesign**: Implemented shadcn-style design system with clean Material Design principles
- **Extension State Indicator**: Extension icon now shows active/disabled state with badge
- **System Time Display**: Real-time clock with timezone information in footer
- **Enhanced Visual Feedback**: Improved button states, hover effects, and visual hierarchy
- **Tooltip-style Popup**: Added speech bubble appearance emerging from extension icon
- **Chrome Web Store Publishing**: Added complete build and release automation

### 🎨 Improved
- **Color Scheme**: Simplified to clean white and blue palette for reduced cognitive load
- **Button Design**: Streamlined buttons without keyboard shortcut clutter
- **Form Elements**: Enhanced contrast and visibility for all input fields
- **Status Indicators**: Better visual feedback for site/page disable states
- **Typography**: Improved font weights, spacing, and readability

### 🔧 Fixed
- **Test Suite**: All 101 tests now pass with proper Chrome API mocks
- **Conversion Feedback**: Fixed status propagation between popup and content script
- **Re-enabling Functionality**: Added refresh prompts when re-enabling disabled sites/pages
- **Icon Rendering**: Replaced emoji icons with consistent SVG icons

### 🏗️ Technical
- **Build System**: Added automated ZIP packaging for Chrome Web Store
- **Semantic Versioning**: Implemented proper version management
- **Code Quality**: Enhanced ESLint rules and Jest coverage thresholds
- **Documentation**: Updated with comprehensive feature documentation


All notable changes to this Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.13.0] - 2025-06-23

### ✨ Added
- **Unified Time Calculation**: Created single TimeCalculator component for consistent timezone calculations
- **Enhanced Timezone Data**: Comprehensive IANA timezone support with 400+ timezone options
- **Production-Ready Build**: Complete Chrome Web Store publishing pipeline with automated packaging
- **Security Hardening**: XSS prevention, minimal permissions, CSP compliance
- **Test Suite Optimization**: Streamlined test coverage with 4 focused test files and 100% pass rate

### 🎨 Improved
- **GMT Timezone Accuracy**: Fixed GMT mapping from Europe/London to GMT timezone (eliminates DST issues)
- **Memory Management**: Added comprehensive cleanup on popup unload to prevent memory leaks
- **Code Quality**: Removed 180+ lines of redundant timezone logic and duplicate implementations
- **Architecture**: Single responsibility principle with unified time calculation source

### 🔧 Fixed
- **Time Calculation Consistency**: Eliminated different time displays between timezone widgets and dropdown options
- **Module Dependencies**: Fixed identifyDateFormat undefined errors and module loading order
- **Lint Compliance**: Resolved all ESLint errors preventing package publishing
- **Test Infrastructure**: Complete DOM mocking system for Chrome extension testing

### 🏗️ Technical
- **Dependency Management**: Updated to date-fns v4.1.0 and date-fns-tz v3.2.0
- **Build Automation**: Yarn-based build system with version management and ZIP packaging
- **Coverage Optimization**: Focused coverage on testable modules (85%+ for core business logic)
- **Production Deployment**: Ready for Chrome Web Store with marketing description

## [1.12.0] - 2025-06-22

### ✨ Added
- **Modern UI Redesign**: Implemented shadcn-style design system with clean Material Design principles
- **Extension State Indicator**: Extension icon now shows active/disabled state with badge
- **System Time Display**: Real-time clock with timezone information in footer
- **Enhanced Visual Feedback**: Improved button states, hover effects, and visual hierarchy

### 🎨 Improved
- **Color Scheme**: Simplified to clean white and blue palette for reduced cognitive load
- **Button Design**: Streamlined buttons without keyboard shortcut clutter
- **Form Elements**: Enhanced contrast and visibility for all input fields
- **Typography**: Improved font weights, spacing, and readability

### 🔧 Fixed
- **Test Suite**: All tests now pass with proper Chrome API mocks
- **Conversion Feedback**: Fixed status propagation between popup and content script
- **Re-enabling Functionality**: Added refresh prompts when re-enabling disabled sites/pages


