const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable .wasm asset loading for expo-sqlite web support
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Ignore database files and log files from Metro watcher/bundler to prevent 99% hangs
config.resolver.blockList = [
  /.*\.db$/,
  /.*\.sqlite$/,
  /.*\.log$/,
  /android_crash\.log$/,
];

module.exports = config;
