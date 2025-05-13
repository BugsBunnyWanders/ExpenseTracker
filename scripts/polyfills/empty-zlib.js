// Empty polyfill for zlib module
// This prevents errors when Node.js modules are imported in React Native
module.exports = {
  createGzip: function() {
    return {
      on: function() { return this; },
      pipe: function() { return this; },
      write: function() {},
      end: function() {}
    };
  },
  createGunzip: function() {
    return {
      on: function() { return this; },
      pipe: function() { return this; },
      write: function() {},
      end: function() {}
    };
  }
}; 