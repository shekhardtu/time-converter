# Contributing to Timezone Converter Extension

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to the Timezone Converter Chrome Extension. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. By participating, you are expected to uphold this code.

### Our Pledge

- **Be respectful** and inclusive
- **Be constructive** in discussions and feedback
- **Focus on what's best** for the community
- **Show empathy** towards other community members

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that you don't need to create one. When you create a bug report, include as many details as possible:

**Use the bug report template and include:**
- A clear title and description
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Chrome version and operating system
- Screenshots or error messages if applicable

### ✨ Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear title** that describes the enhancement
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **Include mockups or examples** if applicable

### 🛠️ Contributing Code

#### Areas We Need Help With

1. **🌍 Internationalization**
   - Adding support for more date formats
   - Supporting additional languages
   - Improving locale-specific parsing

2. **🎨 UI/UX Improvements**
   - Enhancing design and user experience
   - Adding accessibility features
   - Mobile responsiveness

3. **🧪 Testing**
   - Expanding test coverage
   - Adding edge case tests
   - Performance testing

4. **📚 Documentation**
   - Writing user guides
   - Code documentation
   - Video tutorials

5. **🐛 Bug Fixes**
   - Resolving existing issues
   - Fixing edge cases
   - Performance optimizations

## Development Setup

### Prerequisites

- Node.js 16+ and npm
- Chrome browser for testing
- Git for version control
- Basic knowledge of JavaScript and Chrome Extensions

### Setup Steps

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/timezone-converter-extension.git
   cd timezone-converter-extension
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run tests** to ensure everything works:
   ```bash
   npm test
   ```

5. **Load the extension** in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Run the test suite**:
   ```bash
   npm run validate  # Runs lint + tests
   ```

4. **Test manually** in Chrome

5. **Commit your changes** with a descriptive message:
   ```bash
   git commit -m "Add feature: your feature description"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## Coding Standards

### JavaScript Style Guide

We use ESLint with specific rules for Chrome extensions:

- **Use ES6+ features** where appropriate
- **Use const/let** instead of var
- **Use descriptive variable names**
- **Add comments** for complex logic
- **Follow the existing code style**

### Code Quality Requirements

- **Tests must pass**: All existing tests must continue to pass
- **Lint checks**: Code must pass ESLint validation
- **Test coverage**: New features should include tests
- **Manual testing**: Test your changes in the browser

### File Organization

```
├── manifest.json          # Extension manifest
├── popup.html/js          # Popup interface
├── content.js             # Content script
├── background.js          # Service worker
├── style.css             # Content styles
├── tests/                # Test files
├── lib/                  # External libraries
└── images/               # Extension assets
```

### Testing Guidelines

- **Write unit tests** for new functions
- **Include integration tests** for user flows
- **Test edge cases** and error conditions
- **Mock Chrome APIs** properly in tests

Example test structure:
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  test('should do something specific', () => {
    // Test implementation
  });
});
```

## Pull Request Process

### Before Submitting

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Manual testing completed
- [ ] Documentation updated if needed
- [ ] CHANGELOG updated for user-facing changes

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases considered

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Tests pass locally
```

### Review Process

1. **Automated checks** must pass
2. **Manual review** by maintainers
3. **Testing** in different scenarios
4. **Feedback incorporation** if needed
5. **Merge** when approved

## Issue Guidelines

### Bug Reports

Use the bug report template and include:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
Add screenshots to help explain your problem.

**Environment:**
- Chrome Version: [e.g. 91.0.4472.124]
- OS: [e.g. Windows 10, macOS 11.4]
- Extension Version: [e.g. 1.1.0]
```

### Feature Requests

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Any other context or screenshots about the feature request.
```

## Recognition

Contributors will be recognized in:
- **README acknowledgments**
- **Release notes**
- **GitHub contributors list**

## Questions?

- **GitHub Discussions**: For general questions
- **Issues**: For bug reports and feature requests
- **Email**: For security concerns

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

Thank you for contributing to make timezone conversion easier for everyone! 🌍✨