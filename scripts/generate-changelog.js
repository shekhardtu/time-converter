#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const date = new Date().toISOString().split('T')[0];

// Current version changelog
const currentChangelog = `## [${version}] - ${date}

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

`;

// Read existing changelog or create new one
const changelogPath = 'CHANGELOG.md';
let existingChangelog = '';

if (fs.existsSync(changelogPath)) {
  existingChangelog = fs.readFileSync(changelogPath, 'utf8');
  // Remove the header if it exists to avoid duplication
  existingChangelog = existingChangelog.replace(/^# Changelog\n\n/, '');
} else {
  // Create directory if it doesn't exist
  const dir = path.dirname(changelogPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Combine new changelog with existing
const fullChangelog = `# Changelog

All notable changes to this Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${currentChangelog}
${existingChangelog}`;

// Write updated changelog
fs.writeFileSync(changelogPath, fullChangelog);

console.log(`✅ Generated changelog for version ${version}`);
console.log(`📄 View changes: CHANGELOG.md`);