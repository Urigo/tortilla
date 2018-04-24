/**
  Shares the same API as a native browser's localStorage but uses in-memory cache
  instead of fs.
 */

export class LocalCache<T = any> {
  _cache: {[key: string]: T};

  constructor() {
    this._cache = {};
  }

  getItem(key: string): T | null {
    if (this._cache.hasOwnProperty(key)) {
      return this._cache[key];
    }

    return null;
  }

  setItem(key: string, value: T): void {
    this._cache[key] = value;
  }

  removeItem(key): void {
    delete this._cache[key];
  }

  key(n: number): string {
    return Object.keys(this._cache)[n];
  }

  clear(): void {
    Object.keys(this._cache).forEach(function (key) {
      delete this._cache[key];
    });
  }

  get length(): number {
    return Object.keys(this._cache).length;
  }
}
