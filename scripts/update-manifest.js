#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Read and update manifest.json
const manifestPath = 'manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Update version in manifest
manifest.version = version;

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`✅ Updated manifest.json version to ${version}`);