const fs = require('fs');
const path = require('path');

console.log('Creating custom resolver for ws module...');

// Path to the node_modules directory
const nodeModulesDir = path.join(__dirname, '..', 'node_modules');

// Create a metro resolver config for ws
const resolverPath = path.join(nodeModulesDir, 'ws', 'metro-resolver.js');
const resolverContent = `
// Custom metro resolver for ws module in React Native
module.exports = {
  extraNodeModules: {
    'stream': require.resolve('../stream'),
    'crypto': require.resolve('../crypto'),
    'http': require.resolve('../http'),
    'https': require.resolve('../https'),
    'net': require.resolve('../net'),
    'tls': require.resolve('../tls'),
    'zlib': require.resolve('../zlib'),
  }
};
`;

fs.writeFileSync(resolverPath, resolverContent);
console.log('Created metro resolver for ws module');

// Create a metro.config.js file if it doesn't exist
const metroConfigPath = path.join(__dirname, '..', 'metro.config.js');
if (!fs.existsSync(metroConfigPath)) {
  const metroConfig = `
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default config
const defaultConfig = getDefaultConfig(__dirname);

// Add custom resolver for ws
defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  'stream': path.resolve(__dirname, 'node_modules/stream'),
  'crypto': path.resolve(__dirname, 'node_modules/crypto'),
  'http': path.resolve(__dirname, 'node_modules/http'),
  'https': path.resolve(__dirname, 'node_modules/https'),
  'net': path.resolve(__dirname, 'node_modules/net'),
  'tls': path.resolve(__dirname, 'node_modules/tls'),
  'zlib': path.resolve(__dirname, 'node_modules/zlib'),
};

module.exports = defaultConfig;
`;

  fs.writeFileSync(metroConfigPath, metroConfig);
  console.log('Created metro.config.js with custom resolver');
}

console.log('WS module resolver setup complete!'); 