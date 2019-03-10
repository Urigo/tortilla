import * as Fs from 'fs-extra';
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
    context.hostRepo = Tmp.dirSync({ unsafeCleanup: true }).name;
    context.localRepo = Tmp.dirSync({ unsafeCleanup: true }).name;
  });

  beforeEach(() => {
    context.createRepo(context.hostRepo, context.localRepo);
  });

  describe('add()', () => {
    it('should throw an error if not at root commit', () => {
      context.tortilla(['step', 'push', '--allow-empty', '-m', 'dummy message'])

      expect(() => {
        context.tortilla(['submodule', 'add', Path.basename(context.hostRepo), context.hostRepo]);
      }).toThrowError();

      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      expect(context.exists(submoduleLocalPath)).toBe(false);
    });

    it('should add specified submodule based on provided url', () => {
      context.tortilla(['submodule', 'add', Path.basename(context.hostRepo), context.hostRepo]);

      const remote = context.git(['config', '--get', 'remote.origin.url'], {
        cwd: `${context.testDir}/${Path.basename(context.hostRepo)}`
      });
      expect(remote).toEqual(context.hostRepo);

      const stagedFiles = Git.stagedFiles();

      expect(stagedFiles).toEqual(expect.arrayContaining([Path.basename(context.hostRepo), '.gitmodules']));

      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      expect(context.exists(submoduleLocalPath)).toBe(true);
    });

    it('should detach HEAD', () => {
      context.tortilla(['submodule', 'add', Path.basename(context.hostRepo), context.hostRepo]);

      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      expect(Git.activeBranchName(submoduleLocalPath)).not.toEqual('master')
    });
  });

  describe('remove()', () => {
    beforeEach(() => {
      context.tortilla(['submodule', 'add', Path.basename(context.hostRepo), context.hostRepo]);
    });

    it('should throw an error if not at root commit', () => {
      context.tortilla(['step', 'push', '-m', 'dummy message']);

      expect(() => {
        context.tortilla(['submodule', 'remove', Path.basename(context.hostRepo)]);
      }).toThrowError();

      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      expect(context.exists(submoduleLocalPath)).toBe(true);
    });

    it('should remove specified submodule', () => {
      context.tortilla(['submodule', 'remove', Path.basename(context.hostRepo)]);

      const stagedFiles = Git.stagedFiles();

      expect(stagedFiles).toEqual(expect.arrayContaining(['.gitmodules']));

      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      expect(context.exists(submoduleLocalPath)).toBe(false);
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      context.tortilla(['submodule', 'add', Path.basename(context.hostRepo), context.hostRepo]);

      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      Fs.removeSync(submoduleLocalPath)
      context.git(['checkout', submoduleLocalPath])
    });

    it('should init specified submodule if not yet so', () => {
      const submoduleGitDir = `${context.testDir}/${Path.basename(context.hostRepo)}/.git`

      expect(context.exists(submoduleGitDir)).toBe(false)

      context.tortilla(['submodule', 'update', Path.basename(context.hostRepo)])

      expect(context.exists(submoduleGitDir)).toBe(true)
    });

    it('should update specified submodule', () => {
      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      context.tortilla(['submodule', 'update', Path.basename(context.hostRepo)])

      expect(context.exists(`${submoduleLocalPath}/hello_world`)).toBe(true);

      context.git(['checkout', 'HEAD~1'], { cwd: submoduleLocalPath });

      expect(context.exists(`${submoduleLocalPath}/hello_world`)).toBe(false);

      context.tortilla(['submodule', 'update', Path.basename(context.hostRepo)]);

      expect(context.exists(`${submoduleLocalPath}/hello_world`)).toBe(true);
    });
  });

  describe('reset()', () => {
    it('should empty submodule dir content, but keep it initialized', () => {
      context.tortilla(['submodule', 'add', Path.basename(context.hostRepo), context.hostRepo]);

      context.tortilla(['step', 'push', '-m', 'dummy message']);

      let remote
      const submoduleGitDir = `${context.testDir}/${Path.basename(context.hostRepo)}/.git`

      expect(context.exists(submoduleGitDir)).toBe(true);

      remote = context.git(['config', '--file', '.gitmodules', '--get', `submodule.${Path.basename(context.hostRepo)}.url`]);

      expect(remote).toEqual(context.hostRepo);

      context.tortilla(['submodule', 'reset', Path.basename(context.hostRepo)])

      expect(context.exists(submoduleGitDir)).toBe(false);

      remote = context.git(['config', '--file', '.gitmodules', '--get', `submodule.${Path.basename(context.hostRepo)}.url`]);

      expect(remote).toEqual(context.hostRepo);
    });
  });

  describe('fetch()', () => {
    beforeEach(() => {
      context.tortilla(['submodule', 'add', Path.basename(context.hostRepo), context.hostRepo]);
      context.tortilla(['step', 'push', '--allow-empty', '-m', 'dummy message'])
      context.tortilla(['release', 'bump', 'minor', '-m', 'Initial Release'], {
        cwd: context.localRepo,
        env: { TORTILLA_CWD: context.localRepo }
      });
      context.git(['push', 'origin', '--all', '-f'], { cwd: context.localRepo });
      context.git(['push', 'origin', '--tags', '-f'], { cwd: context.localRepo });
    });

    it('should throw an error if submodule is not updated', () => {
      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      Fs.removeSync(submoduleLocalPath)
      context.git(['checkout', submoduleLocalPath])

      expect(() => {
        context.tortilla(['submodule', 'fetch', Path.basename(context.hostRepo)]);
      }).toThrowError();

      const submoduleTags = context.git(['tag', '-l'], { cwd: submoduleLocalPath })

      expect(submoduleTags).toEqual('')
    });

    it('should fetch most recent changes, including tags', () => {
      let submoduleTags;
      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      submoduleTags = context.git(['tag', '-l'], { cwd: submoduleLocalPath })

      expect(submoduleTags).toEqual('')

      context.tortilla(['submodule', 'fetch', Path.basename(context.hostRepo)]);

      submoduleTags = context.git(['tag', '-l'], { cwd: submoduleLocalPath })

      expect(submoduleTags).toEqual('master@0.1.0\nmaster@root@0.1.0')
    });
  });

  describe('checkout()', () => {
    beforeEach(() => {
      context.tortilla(['release', 'bump', 'minor', '-m', 'Initial Release'], {
        cwd: context.localRepo,
        env: { TORTILLA_CWD: context.localRepo }
      });
      context.git(['push', 'origin', '--all', '-f'], { cwd: context.localRepo });
      context.git(['push', 'origin', '--tags', '-f'], { cwd: context.localRepo });
      context.tortilla(['submodule', 'add', Path.basename(context.hostRepo), context.hostRepo]);
      context.tortilla(['step', 'push', '--allow-empty', '-m', 'dummy message'])
    });

    it('should throw an error if not at root commit', () => {
      expect(() => {
        context.tortilla(['submodule', 'checkout', Path.basename(context.hostRepo), 'master@0.1.0']);
      }).toThrowError();

      context.tortilla(['step', 'edit', '--root'])

      expect(() => {
        context.tortilla(['submodule', 'checkout', Path.basename(context.hostRepo), 'master@0.1.0']);
      }).not.toThrowError();
    });

    it('should throw an error if submodule is not updated', () => {
      context.tortilla(['step', 'edit', '--root'])

      expect(() => {
        context.tortilla(['submodule', 'checkout', Path.basename(context.hostRepo), 'master@0.1.0']);
      }).not.toThrowError();

      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`

      Fs.removeSync(submoduleLocalPath);
      context.git(['checkout', submoduleLocalPath]);

      expect(() => {
        context.tortilla(['submodule', 'checkout', Path.basename(context.hostRepo), 'master@0.1.0']);
      }).toThrowError();
    });

    it('should throw an error if reference does not exist', () => {
      context.tortilla(['step', 'edit', '--root'])

      expect(() => {
        context.tortilla(['submodule', 'checkout', Path.basename(context.hostRepo), 'master@1.0.0']);
      }).toThrowError();
    });

    it('should checkout submodule to specified ref', () => {
      context.tortilla(['step', 'edit', '--root']);
      context.tortilla(['submodule', 'checkout', Path.basename(context.hostRepo), 'master@0.1.0']);

      const submoduleLocalPath = `${context.testDir}/${Path.basename(context.hostRepo)}`
      const head = context.git(['rev-parse', 'HEAD'], { cwd: submoduleLocalPath });
      const tag = context.git(['rev-parse', 'master@0.1.0^{}'], { cwd: submoduleLocalPath });

      expect(head).toEqual(tag);
    });
  });
});
