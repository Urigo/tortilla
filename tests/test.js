const ChildProcess = require('child_process');
const Fs = require('fs-extra');
const Path = require('path');
const Tmp = require('tmp');
const Translator = require('../src/translator');
const Utils = require('../src/utils');


before(function () {
  // Consts
  this.plainDir = Tmp.dirSync({ unsafeCleanup: true }).name;
  this.testDir = Tmp.dirSync({ unsafeCleanup: true }).name;
  this.repoDir = Tmp.dirSync({ unsafeCleanup: true }).name;

  // Setup
  // Set environment from which Tortilla calculations are gonna be made from
  process.env.TORTILLA_CWD = this.testDir;
  // Print test dir so it can be observed in case of failure
  console.log(`Test Dir: ${this.testDir}`);

  // Initializing test tortilla project
  ChildProcess.execFileSync(Path.resolve(__dirname, '../cli/tortilla'), [
    'create', '-m', 'Test tortilla project', '-o', this.plainDir, '--override',
  ]);

  // Utils
  Object.assign(this, Utils);

  // Executes tortilla
  this.tortilla = (...args) => {
    const tortillaCLI = Path.resolve(__dirname, '../cli/tortilla');
    return this.exec(tortillaCLI, ...args);
  };

  // Read the provided test data located in 'fs-data'
  this.readTestData = (put, file) => {
    const filePath = Path.resolve(__dirname, 'fs-data', put, file);
    return Fs.readFileSync(filePath, 'utf8');
  };

  // Git-am patch located in 'fs-data/in'
  this.applyTestPatch = (patchName) => {
    const patchPath = Path.resolve(__dirname, 'fs-data/in', `${patchName}.patch`);
    return this.git(['am', patchPath]);
  };
});

beforeEach(function () {
  // Copy the plain project into the test dir, rather than recreating it over
  // and over again
  Fs.removeSync(this.testDir);
  Fs.copySync(this.plainDir, this.testDir);

  // Initializing repo
  Fs.removeSync(this.repoDir);
  this.git(['init', this.repoDir, '--bare']);
  this.git(['remote', 'add', 'origin', this.repoDir]);
});


// Plugins
require('./assertions');
// Tests
require('./step-test');
require('./hooks-test');
require('./renderer-test');
require('./template-helpers-test');
require('./manual-test');
require('./release-test');
