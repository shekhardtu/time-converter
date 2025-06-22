# Testing Guide - Time Converter Chrome Extension

## Overview
This guide covers how to test the Time Converter Chrome extension using the provided test.html file and manual testing procedures.

## Test Setup

### 1. Extension Installation
- Load the extension as unpacked in Chrome Developer Mode
- Navigate to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select the extension folder

### 2. Test Environment
- Open `test.html` in your browser
- Open Chrome DevTools Console to monitor debug messages
- Set up timezone conversion (e.g., UTC → IST) in the extension popup

## Test Cases

### Date Format Detection
The extension should detect and convert these formats:

| Format Type | Example | Expected Behavior |
|-------------|---------|-------------------|
| ISO 8601 | `2024-12-19T15:30:00Z` | Blue highlight with tooltip |
| US Format | `12/19/2024 3:30 PM` | Blue highlight with tooltip |
| European | `19.12.2024 15:30` | Blue highlight with tooltip |
| Natural Language | `December 19, 2024` | Blue highlight with tooltip |
| Time Only | `3:30 PM` | Blue highlight with tooltip |
| Relative | `Today is 2025/06/19 4:53pm` | Blue highlight with tooltip |

### Context Menu Testing

1. **Individual Highlight Removal**
   - Convert dates to create highlights
   - Right-click on any highlighted date
   - Select " Remove this highlight"
   - Verify only that highlight is removed

2. **Format-Specific Removal**
   - Right-click on highlighted date
   - Select " Remove all highlights of this format"
   - Verify all dates of same format are removed
   - Refresh page and convert again - format should be blocked

3. **Clear Stoplist**
   - Use " Clear removed formats"
   - Verify previously blocked formats can be highlighted again

### UI State Testing

1. **Convert/Revert Button States**
   - Initial state: Convert enabled, Revert disabled
   - After conversion: Convert disabled, Revert enabled
   - After reversion: Convert enabled, Revert disabled

2. **Status Messages**
   - Should show "Already converted UTC → IST" when trying to convert twice
   - Should show "No converted dates found" when trying to revert without highlights

3. **Popup Persistence**
   - Convert dates, close popup, reopen
   - Should detect existing highlights and enable Revert button

### Edge Cases

1. **False Positive Prevention**
   - Version numbers: `45.22.95` (should NOT highlight)
   - IP addresses: `192.168.1.1` (should NOT highlight)
   - Other numeric data (should NOT highlight)

2. **Error Handling**
   - Right-click on non-highlighted text
   - Should show helpful context menu message
   - No console errors should appear

## Manual Testing Procedure

### Step 1: Basic Functionality
1. Install extension and open test.html
2. Set timezone conversion in popup (UTC → IST recommended)
3. Click "Convert" button
4. Verify dates are highlighted in blue
5. Hover over highlights to see conversion tooltips
6. Check console for "Checking existing highlights" messages

### Step 2: Context Menu Testing
1. Right-click on highlighted dates
2. Test "Remove this highlight" - should remove individual highlight
3. Test "Remove all highlights of this format" - should remove all similar dates
4. Watch for ✓ or ✗ badges on extension icon
5. Check console for context menu debug messages

### Step 3: State Management
1. Convert dates → verify Revert button enabled
2. Try converting again → should show "Already converted"
3. Close and reopen popup → should detect highlights
4. Use context menu to remove highlights → buttons should update
5. Remove all highlights → Convert button should become enabled

### Step 4: Stoplist Testing
1. Remove a date format using context menu
2. Refresh page and convert again
3. Verify removed format is not highlighted
4. Use "Clear removed formats" to reset
5. Convert again → previously blocked format should now highlight

## Debug Information

### Console Messages to Monitor
- "Checking existing highlights" (popup detection)
- "Right-clicked element" (context menu activation)
- "Context menu clicked" and "Handling [action]" (menu actions)
- No "ReferenceError" messages should appear

### Visual Feedback
- Extension badge shows ✓ for successful context menu actions
- Extension badge shows ✗ for errors
- Button states update automatically after context menu use
- Status text shows proper arrow character (→) not broken encoding

## Common Issues to Check

1. **Button Icons**: Should render correctly with proper spacing
2. **Arrow Encoding**: Status should show "UTC → IST" not "UTC â†' IST"
3. **Context Menu Errors**: No ReferenceError messages in console
4. **State Persistence**: Popup should remember conversion state
5. **Highlight Removal**: Context menu should actually remove highlights from DOM

## Success Criteria

✅ All date formats are detected and highlighted
✅ Timezone conversion is accurate in tooltips
✅ Context menu functions without errors
✅ Button states reflect current page state
✅ Stoplist prevents re-highlighting removed formats
✅ No console errors during normal operation
✅ Visual feedback works correctly (badges, icons, arrows)
✅ Don't allow double conversion of dates in any condition, if already converted make convert button to disabled. Save the state at a page level after conversion is done.
✅ Revert button should revert the conversion to the original format with original styling and same copy text.
✅ Convert and Revert button should have shortcut, and shortcut should label on the buttons.
