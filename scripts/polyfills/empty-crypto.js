// Empty polyfill for crypto module
// This prevents errors when Node.js modules are imported in React Native
module.exports = {
  createHash: function() {
    return {
      update: function() { return this; },
      digest: function() { return ''; }
    };
  },
  randomBytes: function() {
    return Buffer.from([]);
  }
}; 