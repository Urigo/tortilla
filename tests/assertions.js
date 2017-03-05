const Chai = require('chai');
const Fs = require('fs-extra');
const Path = require('path');


const Assertion = Chai.Assertion;


Assertion.addMethod('file', function (expectedFileName, extension) {
  const expectedFile = expectedFileName;

  if (extension) expectedFile += '.' + extension;

  const actualContent = this._obj;

  new Assertion(actualContent).to.be.a('string');

  const expectedFilePath = Path.resolve(__dirname, 'fs-data/out', expectedFile);
  const expectedContent = Fs.readFileSync(expectedFilePath, 'utf8');

  new Assertion(actualContent).to.equal(expectedContent,
    'Expected file to have the same content as \'' + expectedFile + '\''
  );
});

Assertion.addMethod('diff', function (expectedFileName, extension) {
  const expectedFile = expectedFileName;

  if (extension) expectedFile += '.' + extension;

  let actualContent = this._obj;

  new Assertion(actualContent).to.be.a('string');

  const expectedFilePath = Path.resolve(__dirname, 'fs-data/out', expectedFile);
  let expectedContent = Fs.readFileSync(expectedFilePath, 'utf8');

  const stepTitlePattern = /^(#### \[Step \d\.\d\: .+\]\().+(\))$/mg;
  actualContent = actualContent.replace(stepTitlePattern, '$1xxx$2');
  expectedContent = expectedContent.replace(stepTitlePattern, '$1xxx$2');

  new Assertion(actualContent).to.equal(expectedContent,
    'Expected diff file to have the same content as \'' + expectedFile + '\''
  );
});
