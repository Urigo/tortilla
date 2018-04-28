import * as Path from 'path';
import * as Tmp from 'tmp';
import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';
import { Git } from '../src/git';
import { Submodule } from '../src/submodule';

let context: any = {};

describe('Submodule', () => {
  beforeAll(tortillaBeforeAll.bind(context));
  beforeEach(tortillaBeforeEach.bind(context));
  beforeAll(() => {
    context.fooModuleDir = Tmp.dirSync({ unsafeCleanup: true }).name;
    context.barModuleDir = Tmp.dirSync({ unsafeCleanup: true }).name;
    context.bazModuleDir = Tmp.dirSync({ unsafeCleanup: true }).name;
  });

  beforeEach(function () {
    // Initializing repos
    context.createRepo(context.fooModuleDir);
    context.createRepo(context.barModuleDir);
    context.createRepo(context.bazModuleDir);
  });

  describe('add()', function () {
    it('should add specified submodules to the root commit', function () {
      context.tortilla(['submodule', 'add',
        context.fooModuleDir,
        context.barModuleDir,
        context.bazModuleDir
      ]);

      const isRebasing = Git.rebasing();
      expect(isRebasing).toBeFalsy();

      context.tortilla(['step', 'edit', '--root']);

      let remote;

      remote = context.git(['config', '--get', 'remote.origin.url'], {
        cwd: `${context.testDir}/${Path.basename(context.fooModuleDir)}`
      });
      expect(remote).toEqual(context.fooModuleDir);

      remote = context.git(['config', '--get', 'remote.origin.url'], {
        cwd: `${context.testDir}/${Path.basename(context.barModuleDir)}`
      });
      expect(remote).toEqual(context.barModuleDir);

      remote = context.git(['config', '--get', 'remote.origin.url'], {
        cwd: `${context.testDir}/${Path.basename(context.bazModuleDir)}`
      });
      expect(remote).toEqual(context.bazModuleDir);
    });

    it('should stage specified submodules if editing the root commit', function () {
      context.tortilla(['step', 'edit', '--root']);

      context.tortilla(['submodule', 'add',
        context.fooModuleDir,
        context.barModuleDir,
        context.bazModuleDir
      ]);

      const isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const stagedFiles = Git.stagedFiles();

      expect(stagedFiles).toEqual(expect.arrayContaining([
        Path.basename(context.fooModuleDir),
        Path.basename(context.barModuleDir),
        Path.basename(context.bazModuleDir),
        '.gitmodules'
      ]));
    });
  });

  describe('remove()', function () {
    beforeEach(function () {
      context.tortilla(['submodule', 'add',
        context.fooModuleDir,
        context.barModuleDir,
        context.bazModuleDir
      ]);
    });

    it('should remove specified submodules from the root commit', function () {
      context.tortilla(['submodule', 'remove', Path.basename(context.fooModuleDir)]);

      expect(Submodule.list()).toEqual(expect.arrayContaining([
        Path.basename(context.barModuleDir),
        Path.basename(context.bazModuleDir),
      ]))
    });

    it('should remove all submodules from the root commit if non was specified', function () {
      context.tortilla(['submodule', 'remove']);

      expect(Submodule.list()).toEqual([]);
    });

    it('should stage removed submodules if editing the root commit', function () {
      context.tortilla(['step', 'edit', '--root']);
      context.tortilla(['submodule', 'remove', Path.basename(context.fooModuleDir)]);

      const isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const stagedFiles = Git.stagedFiles();

      expect(stagedFiles).toEqual(expect.arrayContaining([
        Path.basename(context.fooModuleDir),
        '.gitmodules'
      ]));
    });
  });

  describe('update()', function () {
    beforeEach(function () {
      context.tortilla(['submodule', 'add',
        context.fooModuleDir,
        context.barModuleDir,
        context.bazModuleDir
      ]);
    });

    it('should update specified submodules', function () {
      context.tortilla(['step', 'edit', '--root']);

      const fooPath = context.exec('realpath', [Path.basename(context.fooModuleDir)]);

      context.git(['checkout', 'HEAD~1'], { cwd: fooPath });
      context.git(['add', Path.basename(context.fooModuleDir)]);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      debugger;

      context.tortilla(['submodule', 'update', Path.basename(context.fooModuleDir)]);

      expect(context.exists(`${fooPath}/hello_world`)).toBeTruthy();
    });
  });

  describe('reset()', function () {
    beforeEach(function () {
      context.tortilla(['submodule', 'add',
        context.fooModuleDir,
        context.barModuleDir,
        context.bazModuleDir
      ]);
    });

    it('should result in submodules which are referencing the most recent hash', function () {
      context.tortilla(['step', 'edit', '--root']);

      const fooPath = context.exec('realpath', [Path.basename(context.fooModuleDir)]);

      context.git(['checkout', 'HEAD~1'], { cwd: fooPath });
      context.exec('touch', ['hello_planet'], { cwd: fooPath });
      context.git(['add', 'hello_planet'], { cwd: fooPath });
      context.git(['commit', '-m', 'hello_planet'], { cwd: fooPath });
      context.git(['branch', '-D', 'master'], { cwd: fooPath });
      context.git(['checkout', '-b', 'master'], { cwd: fooPath });
      context.git(['push', 'origin', 'master', '-f'], { cwd: fooPath });

      context.git(['add', Path.basename(context.fooModuleDir)]);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      context.git(['rebase', '--continue']);

      context.tortilla(['submodule', 'reset', Path.basename(context.fooModuleDir)]);

      expect(context.exists(`${fooPath}/hello_world`)).toBeFalsy();
      expect(context.exists(`${fooPath}/hello_planet`)).toBeTruthy();
    });
  });
});
