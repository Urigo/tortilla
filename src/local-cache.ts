/**
  Shares the same API as a native browser's localStorage but uses in-memory cache
  instead of fs.
 */

export class LocalCache<T = any> {
  public cache: {[key: string]: T};

  constructor() {
    this.cache = {};
  }

  public getItem(key: string): T | null {
    if (this.cache.hasOwnProperty(key)) {
      return this.cache[key];
    }

    return null;
  }

  public setItem(key: string, value: T): void {
    this.cache[key] = value;
  }

  public removeItem(key): void {
    delete this.cache[key];
  }

  public key(n: number): string {
    return Object.keys(this.cache)[n];
  }

  public clear(): void {
    Object.keys(this.cache).forEach(function(key) {
      delete this.cache[key];
    });
  }

  get length(): number {
    return Object.keys(this.cache).length;
  }
}
