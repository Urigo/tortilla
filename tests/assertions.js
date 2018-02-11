const Chai = require('chai');
const EscapeRegExp = require('escape-string-regexp');
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

  const expectedRegExp = new RegExp(EscapeRegExp(expectedContent)
    .replace(/X{3,}/g, ({ length }) => {
      return Array.apply(null, { length }).map(() => '.').join('');
    })
    .replace(/(?:\\\?){3}(.|\n)/g, (match, char) => {
      return `[^${char}]+${char}`;
    })
  );

  new Assertion(actualContent).to.match(expectedRegExp,
    'Expected file to have the same content as \'' + expectedFile + '\''
  );
});
