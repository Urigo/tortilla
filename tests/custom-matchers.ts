import * as Path from 'path';
import * as Fs from 'fs-extra';
import * as EscapeRegExp from 'escape-string-regexp';

declare namespace jest {
  interface Matchers<R> {
    toContainSameContentAsFile(path: string): R;
  }
}

function toContainSameContentAsFile(received: string, fileName: string) {
  const expectedFilePath = Path.resolve(__dirname, 'fs-data/out', fileName);
  const expectedContent = Fs.readFileSync(expectedFilePath, 'utf8');

  const expectedRegExp = new RegExp(
    EscapeRegExp(expectedContent)
      .replace(/X{3,}/g, ({ length }) => {
        return Array.apply(null, { length })
          .map(() => '.')
          .join('');
      })
      .replace(/(?:\\\?){3}(.|\n)/g, (match, char) => {
        return `[^${char}]+${char}`;
      })
  );

  return {
    message: () =>
      `expected 
 ${received}
 not contain the same content as the file (${fileName}):
 ${expectedRegExp}`,
    pass: expectedRegExp.test(received)
  };
}

expect.extend({
  toContainSameContentAsFile
});
