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

// More aggressive fix for ws modules - handle all JS files in ws/lib
const wsLibDir = path.join(nodeModulesDir, 'ws', 'lib');
if (fs.existsSync(wsLibDir)) {
  console.log('Patching all files in ws/lib directory...');
  
  try {
    const files = fs.readdirSync(wsLibDir);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(wsLibDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace all Node.js module imports with custom polyfills
        content = content.replace(
          /require\(['"]stream['"]\)/g, 
          "require('../../scripts/polyfills/ws-stream-polyfill')"
        );
        
        content = content.replace(
          /require\(['"]crypto['"]\)/g, 
          "require('../../scripts/polyfills/empty-crypto')"
        );
        
        content = content.replace(
          /require\(['"]http['"]\)/g, 
          "require('../../scripts/polyfills/empty-http')"
        );
        
        content = content.replace(
          /require\(['"]https['"]\)/g, 
          "require('../../scripts/polyfills/empty-https')"
        );
        
        content = content.replace(
          /require\(['"]net['"]\)/g, 
          "require('../../scripts/polyfills/empty-net')"
        );
        
        content = content.replace(
          /require\(['"]tls['"]\)/g, 
          "require('../../scripts/polyfills/empty-tls')"
        );
        
        content = content.replace(
          /require\(['"]zlib['"]\)/g, 
          "require('../../scripts/polyfills/empty-zlib')"
        );
        
        fs.writeFileSync(filePath, content);
        console.log(`Patched ${file} in ws/lib directory`);
      }
    });
  } catch (err) {
    console.error(`Error patching ws/lib files: ${err.message}`);
  }
}

// Fix for ws library's stream dependency
const wsSenderPath = path.join(nodeModulesDir, 'ws', 'lib', 'sender.js');
if (fs.existsSync(wsSenderPath)) {
  let senderContent = fs.readFileSync(wsSenderPath, 'utf8');
  
  // Replace stream import with our custom polyfill
  if (senderContent.includes("const { Readable } = require('stream');")) {
    senderContent = senderContent.replace(
      "const { Readable } = require('stream');",
      "const { Readable } = require('../../scripts/polyfills/ws-stream-polyfill');"
    );
    fs.writeFileSync(wsSenderPath, senderContent);
    console.log('Patched ws/lib/sender.js to use custom stream polyfill');
  }
}

// Create a shim for stream specifically in the ws lib directory
const wsLibDirPath = path.join(nodeModulesDir, 'ws', 'lib', 'stream');
if (!fs.existsSync(wsLibDirPath)) {
  fs.mkdirSync(wsLibDirPath, { recursive: true });
  
  // Copy our custom stream polyfill
  const customPolyfillSource = path.join(__dirname, 'polyfills', 'ws-stream-polyfill.js');
  const shimPath = path.join(wsLibDirPath, 'index.js');
  
  // Make sure the polyfills directory exists
  if (!fs.existsSync(path.join(__dirname, 'polyfills'))) {
    fs.mkdirSync(path.join(__dirname, 'polyfills'), { recursive: true });
  }
  
  if (fs.existsSync(customPolyfillSource)) {
    fs.copyFileSync(customPolyfillSource, shimPath);
  } else {
    fs.writeFileSync(shimPath, '// Empty shim for React Native\nmodule.exports = { Readable: {} };');
  }
  
  console.log('Created stream shim specifically for ws/lib/');
}

// Create empty shims for other Node.js modules in the polyfills directory
const createNamedEmptyShim = (moduleName) => {
  const shimPath = path.join(__dirname, 'polyfills', `empty-${moduleName}.js`);
  if (!fs.existsSync(shimPath)) {
    fs.writeFileSync(shimPath, `// Empty ${moduleName} shim for React Native\nmodule.exports = {};`);
    console.log(`Created empty ${moduleName} shim in polyfills directory`);
  }
};

// Create empty shims for all problematic modules
['crypto', 'http', 'https', 'net', 'tls', 'zlib'].forEach(createNamedEmptyShim);

// Create export-blocking shim for ws WebSocket implementation
const wsPath = path.join(nodeModulesDir, 'ws', 'index.js');
if (fs.existsSync(wsPath)) {
  const wsIndexContent = fs.readFileSync(wsPath, 'utf8');
  
  // Intercept the WebSocket export with a stub
  const modifiedContent = `// Modified for React Native compatibility
module.exports = {
  WebSocket: function MockWebSocket() {
    console.warn('WebSocket from ws package attempted to be used in React Native');
    return {
      on: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      removeAllListeners: function() {},
      close: function() {}
    };
  }
};
`;
  
  // Back up the original file first
  if (!fs.existsSync(`${wsPath}.backup`)) {
    fs.writeFileSync(`${wsPath}.backup`, wsIndexContent);
  }
  
  // Write the modified content
  fs.writeFileSync(wsPath, modifiedContent);
  console.log('Replaced WebSocket implementation in ws package with React Native compatible stub');
}

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

// Completely disable WebSocket package in @supabase/realtime-js
const realtimeClientPath = path.join(nodeModulesDir, '@supabase', 'realtime-js', 'dist', 'main', 'lib', 'websocket.js');
if (fs.existsSync(realtimeClientPath)) {
  const realtimeClientContent = `// Modified for React Native compatibility
module.exports = {
  default: class MockWebSocketClient {
    constructor() {
      console.warn('WebSocket client from Supabase realtime-js attempted to initialize in React Native');
    }
    connect() { return this; }
    disconnect() { return this; }
    isConnected() { return false; }
    on() { return this; }
    subscribe() { return { unsubscribe: () => {} }; }
  }
};
`;
  
  fs.writeFileSync(realtimeClientPath, realtimeClientContent);
  console.log('Replaced WebSocket client in @supabase/realtime-js with React Native compatible stub');
}

console.log('Polyfill setup complete!'); 