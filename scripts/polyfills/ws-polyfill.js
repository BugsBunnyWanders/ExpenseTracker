// Custom polyfill for the entire ws package in React Native
// This completely stubs out the ws package to prevent Node.js dependency issues

// Mock WebSocket class that does nothing
class MockWebSocket {
  constructor(address, protocols, options) {
    console.warn('WebSocket from ws package attempted to be used in React Native');
    this.url = address;
    this.readyState = 3; // CLOSED
    this._events = {};
  }

  // Event handlers
  on(event, listener) {
    this._events[event] = this._events[event] || [];
    this._events[event].push(listener);
    return this;
  }
  
  addEventListener(event, listener) {
    return this.on(event, listener);
  }
  
  removeEventListener(event, listener) {
    if (this._events[event]) {
      const idx = this._events[event].indexOf(listener);
      if (idx !== -1) this._events[event].splice(idx, 1);
    }
    return this;
  }
  
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }
  
  // Connection methods
  close() {
    return this;
  }
  
  ping() {
    return this;
  }
  
  send() {
    return this;
  }
  
  terminate() {
    return this;
  }
}

// Export a mock WebSocket implementation
module.exports = {
  WebSocket: MockWebSocket,
  createWebSocketStream: () => ({
    on: () => {},
    pipe: () => {},
    destroy: () => {}
  }),
  Server: function MockServer() {
    return {
      on: () => {},
      close: () => {},
      address: () => ({ port: 0 })
    };
  }
};

// Also export as default for ESM imports
module.exports.default = module.exports; 