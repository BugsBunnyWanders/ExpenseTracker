const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default config
const defaultConfig = getDefaultConfig(__dirname);

// Add custom resolver for problematic Node.js modules
defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  'stream': path.resolve(__dirname, 'node_modules/stream'),
  'crypto': path.resolve(__dirname, 'node_modules/crypto'),
  'http': path.resolve(__dirname, 'node_modules/http'),
  'https': path.resolve(__dirname, 'node_modules/https'),
  'net': path.resolve(__dirname, 'node_modules/net'),
  'tls': path.resolve(__dirname, 'node_modules/tls'),
  'zlib': path.resolve(__dirname, 'node_modules/zlib'),
  'os': path.resolve(__dirname, 'node_modules/os'),
  'fs': path.resolve(__dirname, 'node_modules/fs'),
  'path': path.resolve(__dirname, 'node_modules/path'),
  'child_process': path.resolve(__dirname, 'node_modules/child_process'),
  'events': path.resolve(__dirname, 'node_modules/events'),
  'url': path.resolve(__dirname, 'node_modules/url'),
  'util': path.resolve(__dirname, 'node_modules/util'),
  'buffer': path.resolve(__dirname, 'node_modules/buffer'),
  'querystring': path.resolve(__dirname, 'node_modules/querystring')
};

// For web builds, provide stubbed versions of node modules
if (process.env.EXPO_TARGET === 'web') {
  defaultConfig.resolver.alias = {
    ...defaultConfig.resolver.alias,
    'stream': 'stream-browserify',
    'crypto': 'crypto-browserify',
    'http': 'stream-http',
    'https': 'https-browserify',
  };
}

module.exports = defaultConfig; 