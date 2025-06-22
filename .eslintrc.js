module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
    webextensions: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'script'
  },
  globals: {
    chrome: 'readonly',
    dateFns: 'readonly',
    dateFnsTz: 'readonly'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-undef': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'indent': ['error', 2],
    'comma-dangle': ['error', 'never'],
    'eol-last': 'error',
    'no-trailing-spaces': 'error'
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      env: {
        jest: true,
        node: true
      },
      globals: {
        resetMocks: 'readonly',
        addMockTextNodes: 'readonly'
      }
    }
  ]
};