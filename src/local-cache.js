/*
  Shares the same API as a native browser's localStorage but uses in-memory cache
  instead of fs.
 */

function LocalCache() {
  this._cache = {};
}

LocalCache.prototype = Object.create(Object.prototype, {
  getItem: {
    value: function (key) {
      if (this._cache.hasOwnProperty(key)) {
        return this._cache[key];
      }
    }
  },

  setItem: {
    value: function (key, value) {
      return this._cache[key] = value;
    }
  },

  removeItem: {
    value: function (key, value) {
      return delete this._cache[key];
    }
  },

  key: {
    value: function (n) {
      return Object.keys(this._cache)[n];
    }
  },

  clear: {
    value: function () {
      Object.keys(this._cache).forEach(function (key) {
        delete this._cache[key];
      });
    }
  },

  length: {
    get: function () {
      return Object.keys(this._cache).length;
    }
  }
});


module.exports = LocalCache;