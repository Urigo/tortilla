const Chai = require('chai');
const Fs = require('fs-extra');
const Path = require('path');
const Tmp = require('tmp');
const Git = require('../src/git');


const expect = Chai.expect;


describe('Submodule', function () {
  before(function () {
    // Consts
    this.fooModuleDir = Tmp.dirSync({ unsafeCleanup: true }).name;
    this.barModuleDir = Tmp.dirSync({ unsafeCleanup: true }).name;
    this.bazModuleDir = Tmp.dirSync({ unsafeCleanup: true }).name;
  });

  beforeEach(function () {
    // Initializing repos
    Fs.removeSync(this.fooModuleDir);
    Fs.removeSync(this.barModuleDir);
    Fs.removeSync(this.bazModuleDir);

    this.git(['init', this.fooModuleDir, '--bare']);
    this.git(['init', this.barModuleDir, '--bare']);
    this.git(['init', this.bazModuleDir, '--bare']);
  });

  describe('add()', function () {
    this.slow(2000);

    it('should add specified submodules to the root commit', function () {
      this.tortilla(['submodule', 'add',
        this.fooModuleDir,
        this.barModuleDir,
        this.bazModuleDir
      ]);

      const isRebasing = Git.rebasing();
      expect(isRebasing).to.be.falsy;

      this.tortilla(['step', 'edit', '--root']);

      let remote;

      remote = this.git(['config', '--get', 'remote.origin.url'], {
        cwd: `${this.testDir}/${Path.basename(this.fooModuleDir)}`
      });
      expect(remote).to.equal(this.fooModuleDir);

      remote = this.git(['config', '--get', 'remote.origin.url'], {
        cwd: `${this.testDir}/${Path.basename(this.barModuleDir)}`
      });
      expect(remote).to.equal(this.barModuleDir);

      remote = this.git(['config', '--get', 'remote.origin.url'], {
        cwd: `${this.testDir}/${Path.basename(this.bazModuleDir)}`
      });
      expect(remote).to.equal(this.bazModuleDir);
    });

    it('should stage specified submodules if editing the root commit', function () {
      this.tortilla(['step', 'edit', '--root']);

      this.tortilla(['submodule', 'add',
        this.fooModuleDir,
        this.barModuleDir,
        this.bazModuleDir
      ]);

      const isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      const stagedFiles = Git.stagedFiles();

      expect(stagedFiles).to.equal([
        Path.basename(this.fooModuleDir),
        Path.basename(this.barModuleDir),
        Path.basename(this.bazModuleDir),
        '.gitmodules'
      ]);
    });
  });

  describe('remove()', function () {
    beforeEach(function () {
      this.tortilla(['submodule', 'add',
        this.fooModuleDir,
        this.barModuleDir,
        this.bazModuleDir
      ]);
    });

    it('should remove specified submodules from the root commit', function () {
      this.tortilla(['submodule', 'remove', Path.basename(this.fooModuleDir)]);

      expect(Submodule.list()).to.equal([
        Path.basename(this.barModuleDir),
        Path.basename(this.bazModuleDir),
      ]);
    });

    it('should remove all submodules from the root commit if non was specified', function () {
      this.tortilla(['submodule', 'remove']);

      expect(Submodule.list()).to.equal([]);
    });

    it('should stage removed submodules if editing the root commit', function () {
      this.tortilla(['step', 'edit', '--root']);

      this.tortilla(['submodule', 'remove',
        this.fooModuleDir
      ]);

      const isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      const stagedFiles = Git.stagedFiles();

      expect(stagedFiles).to.equal([
        Path.basename(this.fooModuleDir),
        '.gitmodules'
      ]);
    });
  });
});
