const Chai = require('chai');
const Fs = require('fs-extra');
const Path = require('path');
const Tmp = require('tmp');
const Git = require('../src/git');
const Submodule = require('../src/submodule');


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
    this.createRepo(this.fooModuleDir);
    this.createRepo(this.barModuleDir);
    this.createRepo(this.bazModuleDir);
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

      expect(stagedFiles).to.have.all.members([
        Path.basename(this.fooModuleDir),
        Path.basename(this.barModuleDir),
        Path.basename(this.bazModuleDir),
        '.gitmodules'
      ]);
    });
  });

  describe('remove()', function () {
    this.slow(2000);

    beforeEach(function () {
      this.tortilla(['submodule', 'add',
        this.fooModuleDir,
        this.barModuleDir,
        this.bazModuleDir
      ]);
    });

    it('should remove specified submodules from the root commit', function () {
      this.tortilla(['submodule', 'remove', Path.basename(this.fooModuleDir)]);

      expect(Submodule.list()).to.have.all.members([
        Path.basename(this.barModuleDir),
        Path.basename(this.bazModuleDir),
      ]);
    });

    it('should remove all submodules from the root commit if non was specified', function () {
      this.tortilla(['submodule', 'remove']);

      expect(Submodule.list()).to.deep.equal([]);
    });

    it('should stage removed submodules if editing the root commit', function () {
      this.tortilla(['step', 'edit', '--root']);
      this.tortilla(['submodule', 'remove', Path.basename(this.fooModuleDir)]);

      const isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      const stagedFiles = Git.stagedFiles();

      expect(stagedFiles).to.have.all.members([
        Path.basename(this.fooModuleDir),
        '.gitmodules'
      ]);
    });
  });

  describe('update()', function () {
    this.slow(2000);

    beforeEach(function () {
      this.tortilla(['submodule', 'add',
        this.fooModuleDir,
        this.barModuleDir,
        this.bazModuleDir
      ]);
    });

    it('should update specified submodules', function () {
      this.tortilla(['step', 'edit', '--root']);

      const fooPath = this.exec('realpath', [Path.basename(this.fooModuleDir)]);

      this.git(['checkout', 'HEAD~1'], { cwd: fooPath });
      this.git(['add', Path.basename(this.fooModuleDir)]);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      this.git(['rebase', '--continue']);

      this.tortilla(['submodule', 'update', Path.basename(this.fooModuleDir)]);

      expect(this.exists(`${fooPath}/hello_world`)).to.be.truthy;
    });
  });
});
