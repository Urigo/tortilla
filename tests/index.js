const ChildProcess = require('child_process');
const Fs = require('fs-extra');
const Path = require('path');


before(function () {
  // Consts
  this.tempDir = '/tmp/tortilla_test';
  this.libDir = Path.resolve(__dirname, '..');
});

beforeEach(function () {
  // Resetting test tortilla project
  ChildProcess.execFileSync('node', [
    this.libDir, '-m', 'Test tortilla project', '-o', this.tempDir, '--override'
  ]);

  // Deleting cached modules
  Object.keys(require.cache)
    .filter(path => path.match(this.tempDir))
    .forEach(path => delete require[path]);

  // Assigning utils for easy access
  Object.assign(this, require(`${this.tempDir}/.tortilla/utils`));
});


// Tests
require('./step.test');