// Empty polyfill for stream module
// This prevents errors when Node.js modules are imported in React Native
module.exports = {
  Readable: function() {
    return {
      on: function() {},
      pipe: function() {},
      destroy: function() {}
    };
  },
  Writable: function() {
    return {
      on: function() {},
      write: function() {},
      end: function() {}
    };
  },
  Duplex: function() {
    return {
      on: function() {},
      pipe: function() {},
      write: function() {},
      end: function() {}
    };
  }
}; 