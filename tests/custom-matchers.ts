import * as Path from 'path';
import * as Fs from 'fs-extra';
import * as EscapeRegExp from 'escape-string-regexp';

declare namespace jest {
  interface Matchers<R> {
    toContainSameContentAsFile(path: string): R;
  }
}

// Lets us compare a specified string with a given file's content. A random hash can be
// replaced with a series of X's for general length comparison;
// e.g. fooXXXbar will match foo123bar or fooabcbar
function toContainSameContentAsFile(received: string, fileName: string) {
  const expectedFilePath = Path.resolve(__dirname, 'fs-data/out', fileName);
  const expectedContent = Fs.readFileSync(expectedFilePath, 'utf8');

  const actualChunks = [];
  const expectedChunks = [];
  let recentChunkLength = 0;

  // Sometimes the received content might be too long to put in a single RegExp, thus
  // we need to split it into multiple shorter comparison
  received.split('\n').forEach((line, index, { length }) => {
    recentChunkLength += line.length;

    // 3000 characters will be the splitting segment of which the current line will be
    // accumulated into the current chunk
    if (recentChunkLength < 3000 && index != length - 1) return;

    const start = actualChunks.reduce((sum, { length }) => sum + length, 0);
    const end = recentChunkLength + line.length;
    const actualChunk = received.substr(start, end);

    const expectedChunk = new RegExp(
      EscapeRegExp(expectedContent.substr(start, end))
        .replace(/X{3,}/g, ({ length }) => {
          return Array.apply(null, { length })
            .map(() => '.')
            .join('');
        })
        .replace(/(?:\\\?){3}(.|\n)/g, (match, char) => {
          return `[^${char}]+${char}`;
        })
    );

    actualChunks.push(actualChunk);
    expectedChunks.push(expectedChunk);
    recentChunkLength = 0;
  });

  return {
    message: () =>
      `expected
 ${received}
 to contain the same content as the file (${fileName}):
 ${expectedContent}`,
    pass: expectedChunks.every((expectedChunk, index) => {
      const actualChunk = actualChunks[index];
      return expectedChunk.test(actualChunk);
    })
  };
}

expect.extend({
  toContainSameContentAsFile
});
