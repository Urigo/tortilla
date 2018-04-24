declare module '*{!package}.json' {
  const value: any;
  export default value;
}

declare module '*package.json' {
  export const version: string;
  export const description: string;
}

declare module 'node-localstorage' {
  export class LocalStorage {
    public length: number;

    constructor(path: string)

    public setItem(key: string, value: string | number): void;
    public getItem(key: string): string;
    public removeItem(key: string): void;
    public key(keyIndex: number): string;
    public clear(): void;
  }
}
