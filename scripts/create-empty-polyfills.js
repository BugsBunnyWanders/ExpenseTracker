const fs = require('fs');
const path = require('path');

console.log('Creating empty polyfills for Node.js modules...');

// List of Node.js modules to polyfill
const nodejsModules = [
  'stream',
  'crypto',
  'http',
  'https',
  'net',
  'tls',
  'zlib',
  'fs',
  'path',
  'os',
  'child_process',
  'events',
  'url',
  'util',
  'buffer',
  'querystring'
];

// Make sure the polyfills directory exists
const polyfillsDir = path.join(__dirname, 'polyfills');
if (!fs.existsSync(polyfillsDir)) {
  fs.mkdirSync(polyfillsDir, { recursive: true });
}

// Create empty polyfill for each module
nodejsModules.forEach(moduleName => {
  const polyfillPath = path.join(polyfillsDir, `empty-${moduleName}.js`);
  const content = `// Empty polyfill for ${moduleName} module
// This prevents errors when Node.js modules are imported in React Native
module.exports = {};
`;
  
  fs.writeFileSync(polyfillPath, content);
  console.log(`Created empty polyfill for ${moduleName} at ${polyfillPath}`);
});

console.log('Empty polyfills created successfully!'); 