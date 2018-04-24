import * as Tmp from 'tmp';
import * as Path from 'path';
import * as Fs from 'fs-extra';
import * as ChildProcess from 'child_process';
import { type } from 'os';
import {Utils} from '../src/utils';

process.env.TORTILLA_CWD = Tmp.dirSync({ unsafeCleanup: true }).name;

export function tortillaBeforeAll() {
  if (type() === 'Darwin') {
    try {
      ChildProcess.spawnSync('which realpath');
    } catch (e) {
      throw new Error(`Unable to find realpath command. Please install is using: "brew install coreutils"`);
    }
  }

  // Consts
  this.testDir = process.env.TORTILLA_CWD;
  this.plainDir = Tmp.dirSync({ unsafeCleanup: true }).name;
  this.repoDir = Tmp.dirSync({ unsafeCleanup: true }).name;
  this.tempDir = Tmp.dirSync({ unsafeCleanup: true }).name;

  // Setup
  // Set environment from which Tortilla calculations are gonna be made from
  process.env.TORTILLA_CWD = this.testDir;
  // Print test dir so it can be observed in case of failure
  console.log(`Test Dir: ${this.testDir}`);

  const tortillaPath = Path.resolve(__dirname, '../dist/cli/tortilla');

  // Initializing test tortilla project
  ChildProcess.execFileSync('node', [
    tortillaPath, 'create', '-m', 'Test tortilla project', '-o', this.plainDir, '--override',
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

  // Creates a new local repository with a single commit
  this.createRepo = (dir) => {
    dir = dir || Tmp.dirSync({ unsafeCleanup: true }).name;

    Fs.removeSync(dir);
    Fs.removeSync(this.tempDir);

    this.git(['init', dir, '--bare']);
    this.tortilla(['create', this.tempDir, '-m', 'New Repo']);
    this.git(['remote', 'add', 'origin', dir], { cwd: this.tempDir });
    this.exec('sh', ['-c', 'echo "Hello World" > hello_world'], { cwd: this.tempDir });
    this.git(['add', 'hello_world'], { cwd: this.tempDir });
    this.tortilla(['step', 'push', '-m', 'Hello World'], {
      cwd: this.tempDir,
      env: { TORTILLA_CWD: this.tempDir }
    });
    this.git(['push', 'origin', 'master'], { cwd: this.tempDir });

    return dir;
  };

  this.newEditor = (fn) => {
    const body = fn.toString().replace(/`/g, '\\`');
    const scriptFile = Tmp.fileSync({ unsafeCleanup: true });

    Fs.writeFileSync(scriptFile.name, `
      const Fs = require('fs');

      const file = process.argv[process.argv.length - 1];
      let content = Fs.readFileSync(file).toString();
      content = new Function(\`return (${body}).apply(this, arguments)\`)(content);
      Fs.writeFileSync(file, content);
      Fs.unlinkSync('${scriptFile.name}');
    `);

    return `node ${scriptFile.name}`;
  };
}

export function tortillaBeforeEach() {
  // Copy the plain project into the test dir, rather than recreating it over
  // and over again
  Fs.removeSync(this.testDir);
  Fs.copySync(this.plainDir, this.testDir);

  // Initializing repo
  Fs.removeSync(this.repoDir);
  this.git(['init', this.repoDir, '--bare']);
  this.git(['remote', 'add', 'origin', this.repoDir]);
}
