// Empty polyfill for http module
// This prevents errors when Node.js modules are imported in React Native
module.exports = {
  createServer: function() {
    return {
      listen: function() { return this; },
      on: function() { return this; },
      close: function() {}
    };
  },
  request: function() {
    return {
      on: function() { return this; },
      end: function() {}
    };
  }
}; 