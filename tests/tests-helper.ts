import * as Tmp from 'tmp';
import * as Path from 'path';
import * as Fs from 'fs-extra';
import * as ChildProcess from 'child_process';
import { type } from 'os';

process.env.TORTILLA_CWD = Tmp.dirSync({ unsafeCleanup: true }).name;
// process.env.DEBUG = '1';

import { Utils } from '../src/utils';

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
  process.env.TORTILLA_DURING_TESTS = '1';

  const tortillaPath = Path.resolve(__dirname, '../dist/cli/tortilla.js');

  // Initializing test tortilla project
  ChildProcess.execFileSync('node', [tortillaPath, 'create', '-m', 'Test tortilla project', '-o', this.plainDir, '--override']);

  // Initializing test tortilla project
  ChildProcess.execFileSync('git', ['config', 'user.email', 'test@tortilla.com'], { cwd: this.plainDir });
  ChildProcess.execFileSync('git', ['config', 'user.name', 'Tortilla'], { cwd: this.plainDir });

  // Utils
  Object.assign(this, Utils);

  // Executes tortilla
  this.tortilla = (args, options?) => this.exec('node', [tortillaPath, ...args], options);

  // Read the provided test data located in 'fs-data'
  this.readTestData = (put, file) => {
    const filePath = Path.resolve(__dirname, 'fs-data', put, file);
    return Fs.readFileSync(filePath, 'utf8');
  };

  // Git-am patch located in 'fs-data/in'
  this.applyTestPatch = patchName => {
    const patchPath = Path.resolve(__dirname, 'fs-data/in', `${patchName}.patch`);
    return this.git(['am', patchPath]);
  };

  this.createTortillaProject = dir => {
    // Initializing test tortilla project
    ChildProcess.execFileSync('node', [tortillaPath, 'create', '-m', 'Test tortilla project', '-o', dir, '--override']);

    // Initializing test tortilla project
    ChildProcess.execFileSync('git', ['config', 'user.email', 'test@tortilla.com'], { cwd: dir });
    ChildProcess.execFileSync('git', ['config', 'user.name', 'Tortilla'], { cwd: dir });
  };

  this.createGitProject = dir => {
    // Initializing test tortilla project
    ChildProcess.execFileSync('git', ['init'], { cwd: dir });

    // Initializing test tortilla project
    ChildProcess.execFileSync('git', ['config', 'user.email', 'test@tortilla.com'], { cwd: dir });
    ChildProcess.execFileSync('git', ['config', 'user.name', 'Tortilla'], { cwd: dir });
  };

  this.setPromptAnswers = (answersArray) => {
    process.env.TORTILLA_PROMPT_ANSWERS = answersArray.join(',');
  };

  // Creates a new local repository with a single commit
  this.createRepo = dir => {
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

  this.newEditor = fn => {
    const body = fn
      .toString()
      .replace(/`/g, '\\`')
      .replace(/\\/g, '\\\\');
    const scriptFile = Tmp.fileSync({ unsafeCleanup: true });

    Fs.writeFileSync(
      scriptFile.name,
      `
      const Fs = require('fs');

      const file = process.argv[process.argv.length - 1];
      let content = Fs.readFileSync(file).toString();
      content = new Function(\`return (${body}).apply(this, arguments)\`)(content);
      Fs.writeFileSync(file, content);
      Fs.unlinkSync('${scriptFile.name}');
    `
    );

    return `node ${scriptFile.name}`;
  };

  this.wait = async (time = 1000) => new Promise(resolve => setTimeout(resolve, time));
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
