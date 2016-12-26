const Chai = require('chai');
const Fs = require('fs-extra');
const Path = require('path');


const Assertion = Chai.Assertion;


Assertion.addMethod('file', function (expectedFileName, extension) {
  let expectedFile = expectedFileName;

  if (extension) expectedFile += '.' + extension;

  const actualContent = this._obj;

  new Assertion(actualContent).to.be.a('string');

  const expectedFilePath = Path.resolve(__dirname, 'fs-data/out', expectedFile);
  const expectedContent = Fs.readFileSync(expectedFilePath, 'utf8');

  new Assertion(actualContent).to.equal(expectedContent,
    'Expected file to have the same content as \'' + expectedFile + '\''
  );
});

Assertion.addMethod('diff', function (expectedMDName) {
  new Assertion(this._obj).to.be.a.file(expectedMDName, 'diff');
});

Assertion.addMethod('markdown', function (expectedMDName) {
  new Assertion(this._obj).to.be.a.file(expectedMDName, 'md');
});