# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.12.x  | :white_check_mark: |
| < 1.12  | :x:                |

## Security Features

### Data Privacy
- **Local Processing Only**: All timezone conversions happen locally in the browser
- **No External Requests**: Extension does not make any network requests
- **No Data Collection**: No user data is collected, stored, or transmitted
- **No Analytics**: No tracking or analytics code included

### Content Security
- **XSS Prevention**: All DOM manipulation uses safe methods (textContent, createElement)
- **Input Sanitization**: User input is validated and sanitized before processing
- **Minimal Permissions**: Uses only essential Chrome extension permissions
- **Context Validation**: Extension context is validated before operations

### Code Security
- **No eval()**: No dynamic code execution
- **No innerHTML**: Direct HTML injection prevented
- **Safe DOM API**: Uses secure DOM manipulation methods
- **Error Boundaries**: Comprehensive error handling with fallbacks

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue
2. Email security concerns to: [maintainer-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix Timeline**: Critical issues within 2 weeks, others within 1 month
- **Disclosure**: Coordinated disclosure after fix is released

## Security Best Practices for Contributors

### Code Review Requirements
- All DOM manipulation must use safe methods
- No direct innerHTML assignments with user data
- Input validation for all external data
- Error handling for all Chrome API calls

### Testing Requirements
- Security test cases for user input handling
- XSS prevention validation
- Permission scope verification
- Context invalidation handling

## Security Architecture

### Content Security Policy
The extension follows strict CSP guidelines:
- No unsafe-inline scripts
- No unsafe-eval
- Local resources only
- No external resource loading

### Permission Model
Minimal permission approach:
- `activeTab`: Only access current tab when user interacts
- `storage`: Local settings storage only
- `scripting`: Content script injection for timezone conversion
- `contextMenus`: Right-click menu functionality

### Data Flow Security
```
User Input → Validation → Local Processing → Safe DOM Update
```

No data leaves the local browser environment.