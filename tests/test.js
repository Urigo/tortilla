const ChildProcess = require('child_process');
const Fs = require('fs-extra');
const Path = require('path');


before(function () {
  // Consts
  this.testDir = '/tmp/tortilla_test';
  this.libDir = Path.resolve(__dirname, '..');
});

beforeEach(function () {
  // Resetting test tortilla project
  ChildProcess.execFileSync('node', [
    this.libDir, '-m', 'Test tortilla project', '-o', this.testDir, '--override'
  ]);

  // Deleting cached modules
  Object.keys(require.cache)
    .filter(path => path.match(this.testDir))
    .forEach(path => delete require[path]);

  // Assigning utils for easy access
  Object.assign(this, require(`${this.testDir}/.tortilla/utils`));
  this.git = require(`${this.testDir}/.tortilla/git`);
});


// Tests
require('./step-test');
require('./hooks-test');