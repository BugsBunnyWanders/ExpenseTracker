// Custom polyfill for the Node.js stream module specifically for the ws library
// This replaces the stream functionality with minimal implementations
// that work in the React Native environment

class ReadableStream {
  constructor(options) {
    this.options = options || {};
    this.readable = true;
    this._events = {};
  }

  on(event, callback) {
    this._events[event] = this._events[event] || [];
    this._events[event].push(callback);
    return this;
  }

  removeListener(event, callback) {
    if (this._events[event]) {
      const idx = this._events[event].indexOf(callback);
      if (idx !== -1) this._events[event].splice(idx, 1);
    }
    return this;
  }

  emit(event, ...args) {
    const callbacks = this._events[event] || [];
    callbacks.forEach(callback => callback(...args));
    return callbacks.length > 0;
  }

  pipe() {
    console.warn('Stream.pipe called in React Native environment (not implemented)');
    return this;
  }

  // Other necessary stream methods
  pause() { return this; }
  resume() { return this; }
  destroy() { this.readable = false; return this; }
}

// Export the minimal implementation required by ws
module.exports = {
  Readable: ReadableStream
}; 