// Empty polyfill for fs module
// This prevents errors when Node.js modules are imported in React Native
module.exports = {
  readFile: function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
    }
    if (callback) {
      callback(new Error('fs.readFile is not supported in React Native'));
    }
  },
  writeFile: function(path, data, options, callback) {
    if (typeof options === 'function') {
      callback = options;
    }
    if (callback) {
      callback(new Error('fs.writeFile is not supported in React Native'));
    }
  },
  existsSync: function() { return false; },
  mkdirSync: function() {},
  readdirSync: function() { return []; }
}; 