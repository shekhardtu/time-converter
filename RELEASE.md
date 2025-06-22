# Release Process & Prerequisites

## 🚀 Release Commands

### Version Bumping
```bash
# Patch release (1.1.0 → 1.1.1) - Bug fixes
npm run version:patch

# Minor release (1.1.0 → 1.2.0) - New features  
npm run version:minor

# Major release (1.1.0 → 2.0.0) - Breaking changes
npm run version:major
```

### Full Release Process
```bash
# Complete release with changelog and build
npm run release

# Manual steps breakdown:
npm run prepare-release  # Version bump + changelog + build
npm run webstore:upload   # Instructions for manual upload
```

## ✅ Pre-Release Checklist

### 1. Code Quality
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] Code coverage meets thresholds (85%+)
- [ ] Manual testing completed

### 2. Extension Validation
- [ ] Load extension in Chrome Developer Mode
- [ ] Test all core functionality:
  - [ ] Date conversion works
  - [ ] Site/page disable functions
  - [ ] Custom format addition
  - [ ] Timezone selection
  - [ ] Icon state changes properly
- [ ] Test on multiple websites
- [ ] Verify keyboard shortcuts work

### 3. Metadata Updates
- [ ] Version bumped in both `package.json` and `manifest.json`
- [ ] Changelog generated with new features
- [ ] Screenshots updated if UI changed
- [ ] Store description updated if needed

### 4. Chrome Web Store Requirements

#### Required Assets
- [ ] **Icons**: 16px, 32px, 48px, 128px (PNG format)
- [ ] **Screenshots**: 1280x800 or 640x400 (up to 5 images)
- [ ] **Promotional Image**: 440x280 (optional but recommended)
- [ ] **Store Icon**: 128x128 (displayed in Chrome Web Store)

#### Extension Package
- [ ] ZIP file created: `dist/timezone-converter-v{version}.zip`
- [ ] Package size under 128MB
- [ ] No unnecessary files included (node_modules, tests, etc.)

#### Store Listing
- [ ] **Title**: Clear and descriptive (max 45 characters)
- [ ] **Summary**: Brief description (max 132 characters) 
- [ ] **Description**: Detailed feature list (max 16,000 characters)
- [ ] **Category**: Productivity
- [ ] **Language**: English (or multiple if supported)

## 🏪 Chrome Web Store Publishing

### Initial Setup
1. **Developer Account**: Register at [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/)
2. **One-time Fee**: $5 USD registration fee
3. **Verification**: Complete identity verification if required

### Upload Process
1. Run `npm run release` to generate the ZIP package
2. Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/)
3. Click "Add a new item"
4. Upload the ZIP file from `dist/timezone-converter-v{version}.zip`
5. Fill in store listing details:
   - Title: "Timezone Converter - Date & Time Zone Conversion"
   - Summary: "Automatically convert dates and times across different timezones on any webpage"
   - Description: Copy from store-listing-description.md
   - Category: Productivity
   - Language: English
6. Upload screenshots and promotional images
7. Set privacy practices and permissions
8. Submit for review

### Review Process
- **Review Time**: Typically 1-7 days
- **Status Updates**: Check developer console for updates
- **Common Issues**: 
  - Missing privacy policy (if using sensitive permissions)
  - Unclear permission justification
  - Store listing quality issues

## 🔄 Continuous Integration

### Automated Checks
```bash
# Run full validation
npm run validate

# Generate release package  
npm run build

# Create distribution ZIP
npm run package
```

### Manual Testing Checklist
- [ ] Load unpacked extension in Chrome
- [ ] Test conversion on various websites
- [ ] Verify all timezone options work
- [ ] Test site/page disable functionality  
- [ ] Check custom format addition
- [ ] Verify icon state changes
- [ ] Test keyboard shortcuts (Alt+C, Alt+R)

## 📋 Post-Release

### After Successful Publication
- [ ] Update README with store link
- [ ] Tag git commit with version
- [ ] Update documentation if needed
- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback

### Monitoring
- [ ] Check extension analytics in Chrome Web Store
- [ ] Monitor error reports
- [ ] Track user reviews and ratings
- [ ] Plan next feature releases

## 🛠️ Development Tools

### Useful Chrome URLs
- **Extensions**: `chrome://extensions/`
- **Extension Console**: `chrome://extensions/` → Developer mode → Inspect views
- **Web Store**: `https://chrome.google.com/webstore/devconsole/`

### Testing Commands
```bash
# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Lint and fix
npm run lint:fix
```