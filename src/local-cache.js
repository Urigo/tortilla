/**
  Shares the same API as a native browser's localStorage but uses in-memory cache
  instead of fs.
 */

class LocalCache {
  constructor() {
    this._cache = {};
  }

  getItem(key) {
    if (this._cache.hasOwnProperty(key)) {
      return this._cache[key];
    }
  }

  setItem(key) {
    if (this._cache.hasOwnProperty(key)) {
      return this._cache[key];
    }
  }

  removeItem(key, value) {
    return delete this._cache[key];
  }

  key(n) {
    return Object.keys(this._cache)[n];
  }

  clear() {
    Object.keys(this._cache).forEach(function (key) {
      delete this._cache[key];
    });
  }

  get length() {
    return Object.keys(this._cache).length;
  }
}

module.exports = LocalCache;
