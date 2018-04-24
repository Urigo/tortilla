/**
  Shares the same API as a native browser's localStorage but uses in-memory cache
  instead of fs.
 */

export class LocalCache<T = any> {
  public _cache: {[key: string]: T};

  constructor() {
    this._cache = {};
  }

  public getItem(key: string): T | null {
    if (this._cache.hasOwnProperty(key)) {
      return this._cache[key];
    }

    return null;
  }

  public setItem(key: string, value: T): void {
    this._cache[key] = value;
  }

  public removeItem(key): void {
    delete this._cache[key];
  }

  public key(n: number): string {
    return Object.keys(this._cache)[n];
  }

  public clear(): void {
    Object.keys(this._cache).forEach(function(key) {
      delete this._cache[key];
    });
  }

  get length(): number {
    return Object.keys(this._cache).length;
  }
}
