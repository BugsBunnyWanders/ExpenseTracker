const fs = require('fs');
const path = require('path');

console.log('Setting up polyfills for React Native compatibility...');

// Path to the node_modules directory
const nodeModulesDir = path.join(__dirname, '..', 'node_modules');

// Create empty shim for problematic Node.js modules
const createEmptyShim = (moduleName) => {
  const shimDir = path.join(nodeModulesDir, moduleName);
  if (!fs.existsSync(shimDir)) {
    fs.mkdirSync(shimDir, { recursive: true });
    const indexPath = path.join(shimDir, 'index.js');
    fs.writeFileSync(indexPath, '// Empty shim\nmodule.exports = {};');
    console.log(`Created empty shim for ${moduleName}`);
  }
};

// Create empty shims for problematic Node.js modules
const problematicModules = [
  'stream',
  'crypto',
  'fs',
  'net',
  'tls',
  'zlib',
  'http',
  'https',
  'path',
  'os',
  'buffer',
  'util',
  'url',
  'querystring',
  'events',
  'child_process'
];

problematicModules.forEach(createEmptyShim);

// Update webpack config if needed
const webpackConfigPath = path.join(__dirname, '..', 'node_modules', 'react-native', 'build', 'webpack.config.js');
if (fs.existsSync(webpackConfigPath)) {
  let webpackConfig = fs.readFileSync(webpackConfigPath, 'utf8');
  if (!webpackConfig.includes('node: { crypto: \'empty\' }')) {
    // Add node polyfill config
    webpackConfig = webpackConfig.replace(
      'module.exports = {',
      'module.exports = {\n  node: { crypto: \'empty\', stream: \'empty\', fs: \'empty\', net: \'empty\', tls: \'empty\' },'
    );
    fs.writeFileSync(webpackConfigPath, webpackConfig);
    console.log('Updated webpack config for Node.js module compatibility');
  }
}

console.log('Polyfill setup complete!'); 