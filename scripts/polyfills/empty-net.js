// Empty polyfill for net module
// This prevents errors when Node.js modules are imported in React Native
module.exports = {
  Socket: function() {
    return {
      on: function() {},
      connect: function() {},
      destroy: function() {}
    };
  },
  createServer: function() {
    return {
      listen: function() { return this; },
      on: function() { return this; },
      close: function() {}
    };
  }
}; 