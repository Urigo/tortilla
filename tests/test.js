const ChildProcess = require('child_process');
const Fs = require('fs-extra');
const Path = require('path');


before(function () {
  // Consts
  this.testDir = '/tmp/tortilla_test';
  this.libDir = Path.resolve(__dirname, '..');

  // Utils
  this.readFile = (put, file) => {
    const filePath = Path.resolve(__dirname, 'fs-data', put, file);
    return Fs.readFileSync(filePath, 'utf8');
  };
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

  // Project executors
  this.git = require(`${this.testDir}/.tortilla/git`);
  this.mdParser = require(`${this.testDir}/.tortilla/md-parser`);
  this.mdRenderer = require(`${this.testDir}/.tortilla/md-renderer`);
  this.step = require(`${this.testDir}/.tortilla/step`);

  // Project utils
  this.npm.step = (argv, ...args) => this.npm([
    'run', 'step', '--'
  ].concat(argv), ...args);

  this.git.apply = (patchName) => {
    const patchPath = Path.resolve(__dirname, 'fs-data/in', patchName + '.patch');
    return this.git(['am', patchPath]);
  };
});


// Plugins
require('./assertions');
// Tests
require('./step-test');
require('./hooks-test');
require('./md-renderer-test');
require('./md-parser-test');
require('./template-helpers-test');