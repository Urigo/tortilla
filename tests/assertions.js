const Chai = require('chai');
const EscapeRegExp = require('escape-string-regexp');
const Fs = require('fs-extra');
const Path = require('path');


const Assertion = Chai.Assertion;


// Matches content to given file in fs-data/out dir. We can use the XXX pattern
// if we would like to ignore some parts of the matched content
Assertion.addMethod('file', function (expectedFileName, extension) {
  const expectedFile = expectedFileName;

  if (extension) expectedFile += '.' + extension;

  let actualContent = this._obj;

  new Assertion(actualContent).to.be.a('string');

  const expectedFilePath = Path.resolve(__dirname, 'fs-data/out', expectedFile);
  const expectedContent = Fs.readFileSync(expectedFilePath, 'utf8');

  let pattern = expectedContent
    .split('XXX')
    .map(EscapeRegExp)
    .map(chunk => '(' + chunk + ')')
    .join('(.+)')
  pattern = '^' + pattern;
  pattern = pattern + '$';
  pattern = new RegExp(pattern);

  const matches = actualContent.match(pattern) || [actualContent];

  if (matches.length > 1) {
    actualContent = matches.slice(1).reduce((actualContent, match, index) => {
      if (index % 2 == 1) match = 'XXX';
      return actualContent + match;
    });
  }

  new Assertion(actualContent).to.equal(expectedContent,
    'Expected file to have the same content as \'' + expectedFile + '\''
  );
});
