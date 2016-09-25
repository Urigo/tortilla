const Fs = require('fs-extra');


before(function () {
  // Consts
  this.tempDir = '/tmp/tortilla_test';
  this.tortillaDir = Path.resolve('..');
});

beforeEach(function () {
  // Resetting temp dir
  Fs.removeSync(this.tempDir);
  Fs.copySync(this.tortillaDir, this.tempDir);

  // Deleting cached modules
  Object.keys(require.cache)
    .filter(path => path.contains(this.tempDir));
    .forEach(path => delete require[path]);

  // Assigning utils for easy access
  Object.assign(this, require(`${this.tempDir}/.tortilla/utils`));

  // Initializing
  this.node(['.', '--sure']);
  this.npm(['install']);
});


// Tests
require('./step.test');