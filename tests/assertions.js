const Chai = require('chai');
const Fs = require('fs-extra');
const Path = require('path');


const Assertion = Chai.Assertion;


// Matches content to given file in fs-data/out dir. We can use the XXX pattern
// if we would like to ignore some parts of the matched content
Assertion.addMethod('file', function (expectedFileName, extension) {
  let expectedFile = expectedFileName;

  if (extension) expectedFile += '.' + extension;

  let actualContent = this._obj;

  new Assertion(actualContent).to.be.a('string');

  const expectedFilePath = Path.resolve(__dirname, 'fs-data/out', expectedFile);
  const expectedContent = Fs.readFileSync(expectedFilePath, 'utf8');
  let xMatch = expectedContent.match(/X{3,}/);
  let index = 0;
  let prevIndex = 0;
  let length;
  let expectedChunk;
  let actualChunk;

  while (xMatch) {
    index = xMatch.index;
    length = xMatch[0].length;
    expectedChunk = expectedContent.substr(prevIndex, index);
    actualChunk = actualContent.substr(prevIndex, index);

    new Assertion(actualChunk).to.equal(expectedChunk,
      'Expected file to have the same content as \'' + expectedFile + '\''
    );

    prevIndex += index + length;
    xMatch = expectedContent.substr(prevIndex).match(/X{3,}/);
  }

  expectedChunk = expectedContent.slice(prevIndex).trim();
  actualChunk = actualContent.slice(prevIndex).trim();

  new Assertion(actualChunk).to.equal(expectedChunk,
    'Expected file to have the same content as \'' + expectedFile + '\''
  );
});
