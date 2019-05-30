jest.mock('inquirer');

import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';
import './custom-matchers';
import { Paths } from '../src/paths';
import * as Tmp from 'tmp';
import * as Path from 'path';
import { Release } from '../src/release';

let context: any = {};

// process.env.DEBUG = '1';
process.env.TORTILLA_CACHE_DISABLED = '1';

describe('Release', () => {
  beforeAll(tortillaBeforeAll.bind(context));
  beforeEach(tortillaBeforeEach.bind(context));

  describe('with submodules', () => {
    beforeEach(() => {
      context.fooModuleDir = Tmp.dirSync({ unsafeCleanup: true }).name;
      context.createTortillaProject(context.fooModuleDir);
    });

    it('one tortilla project as submodule with one version: should point to the correct commit', async () => {
      context.setPromptAnswers([
        'master@0.1.0'
      ]);
      // Create a sub-project of Tortilla, add an empty commit and release a new version
      context.scopeEnv(() => {
        context.tortilla(['step', 'push', '-m', 'Create submodule', '--allow-empty']);
        context.tortilla(['release', 'bump', 'minor', '-m', 'submodule version test']);
      }, { TORTILLA_CWD: context.fooModuleDir });

      // Add the sub project as submodule
      context.tortilla(['submodule', 'add', Path.basename(context.fooModuleDir), context.fooModuleDir]);

      // Release a new version of the root
      const out = context.tortilla(['release', 'bump', 'minor', '-m', 'submodule root']);

      expect(out).toContain('Checking out "master@0.1.0" in Tortilla submodule ');
      expect(out).toContain('Release: 0.1.0');
    });

    it('two tortilla project as submodule with one version: should point to the correct commit', async () => {
      const barModuleDir = Tmp.dirSync({ unsafeCleanup: true }).name;
      context.createTortillaProject(barModuleDir);

      context.setPromptAnswers([
        'master@0.1.0',
        'master@1.0.0',
      ]);

      // Create a sub-project of Tortilla, add an empty commit and release a new version
      context.scopeEnv(() => {
        context.tortilla(['step', 'push', '-m', 'Create submodule', '--allow-empty']);
        context.tortilla(['release', 'bump', 'minor', '-m', 'submodule version test']);
      }, { TORTILLA_CWD: context.fooModuleDir });

      // Create a sub-project of Tortilla, add an empty commit and release a new version
      context.scopeEnv(() => {
        context.tortilla(['step', 'push', '-m', 'Create submodule', '--allow-empty']);
        context.tortilla(['release', 'bump', 'major', '-m', 'submodule version test']);
      }, { TORTILLA_CWD: barModuleDir });

      // Add the sub project as submodule
      context.tortilla(['submodule', 'add', Path.basename(context.fooModuleDir), context.fooModuleDir]);
      context.tortilla(['submodule', 'add', Path.basename(barModuleDir), barModuleDir]);

      // Release a new version of the root
      const out = context.tortilla(['release', 'bump', 'minor', '-m', 'submodule root']);

      expect(out).toContain('Checking out "master@0.1.0" in Tortilla submodule ');
      expect(out).toContain('Checking out "master@1.0.0" in Tortilla submodule ');
      expect(out).toContain('Release: 0.1.0');
    });
  });

  describe('bump()', () => {
    it('should bump a major version', () => {
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@1.0.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@1.0.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    });

    it('should bump a minor version', () => {
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@0.1.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@0.1.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    });

    it('should bump a patch version', () => {
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@0.0.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@0.0.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    });

    it('should bump to next version', () => {
      context.tortilla(['release', 'bump', 'next', '-m', 'next version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@next']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@next']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    });

    it('should override next version', () => {
      context.tortilla(['release', 'bump', 'next', '-m', 'next version test']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@next']);
      expect(tagExists).toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@next']);
      expect(tagExists).toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@0.0.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@0.0.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    })

    it('should bump a major, minor and patch versions', () => {
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@1.0.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@1.0.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@1.1.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@1.1.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    });

    it('should bump a version for all step tags', () => {
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);

      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@step1@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@step2@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@step3@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    });

    it('should change the prefix of the release based on the active branch', () => {
      context.git(['checkout', '-b', 'test']);

      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);

      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'test@root@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'test@step1@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'test@step2@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'test@step3@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'test@1.1.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    });

    it('should be able to handle multiple bumps for the same version type', () => {
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@0.0.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@0.0.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@0.1.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@0.1.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@1.0.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@1.0.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@2.0.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@2.0.0']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@root@2.0.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);

      tagExists = context.git.bind(context, ['rev-parse', 'master@2.0.1']);
      expect(tagExists).not.toThrowError(/(.|\n)*/);
    });

    it('should create a diff branch whose commits represent the releases', () => {
      context.exec('sh', ['-c', 'echo 1.0.0 > VERSION']);
      context.git(['add', 'VERSION']);
      context.tortilla(['step', 'push', '-m', 'Create version file']);
      context.tortilla(['step', 'tag', '-m', 'First step']);
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      context.tortilla(['step', 'edit', '1.1']);
      context.exec('sh', ['-c', 'echo 1.1.0 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);

      context.tortilla(['step', 'edit', '1.1']);
      context.exec('sh', ['-c', 'echo 1.1.1 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      context.git(['checkout', 'master-history']);

      let commitMessage;

      commitMessage = context.git(['log', '-1', '--format=%s']);
      expect(commitMessage).toEqual('master@1.1.1: patch version test');

      commitMessage = context.git(['log', '-1', '--skip=1', '--format=%s']);
      expect(commitMessage).toEqual('master@1.1.0: minor version test');

      commitMessage = context.git(['log', '-1', '--skip=2', '--format=%s']);
      expect(commitMessage).toEqual('master@1.0.0: major version test');

      const releaseDiff = context.git(['diff', 'HEAD', 'HEAD~2'], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).toContainSameContentAsFile('release-update.diff');
    });

    it.skip('should remove files which should not be included in the release', () => {
      context.exec('touch', ['.travis.yml']);
      context.exec('touch', ['renovate.json']);
      context.git(['add', '.travis.yml']);
      context.git(['add', 'renovate.json']);
      context.tortilla(['step', 'push', '-m', 'Add CI configurations']);
      context.tortilla(['step', 'tag', '-m', 'First step']);
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      const travisPath = Paths.travis;
      const renovatePath = Paths.renovate;

      expect(context.exists(travisPath)).toBeTruthy();
      expect(context.exists(renovatePath)).toBeTruthy();

      context.git(['checkout', 'master@1.0.0']);

      expect(context.exists(travisPath)).toBeFalsy();
      expect(context.exists(renovatePath)).toBeFalsy();

      context.git(['checkout', 'master-history']);

      expect(context.exists(travisPath)).toBeFalsy();
      expect(context.exists(renovatePath)).toBeFalsy();
    });

    it('should re-render all manuals using an updated release tag', () => {
      context.tortilla(['step', 'edit', '--root']);

      const pack = JSON.parse(context.exec('cat', ['package.json']));

      pack.repository = {
        type: 'git',
        url: 'https://github.com/test/repo.git'
      };

      const packString = JSON.stringify(pack, null, 2).replace(/"/g, '\\"');
      context.exec('sh', ['-c', `echo "${packString}" > package.json`]);
      context.exec('sh', ['-c', `echo "{{{resolvePath}}}" > .tortilla/manuals/templates/root.tmpl`]);

      context.git(['add', '.']);
      context.git(['commit', '--amend'], {
        env: {
          GIT_EDITOR: true
        }
      });
      context.git(['rebase', '--continue']);

      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      const manual = context.exec('cat', ['README.md']);
      expect(manual).toContainSameContentAsFile('release-path.md');
    });
  });

  describe('revert()', () => {
    it('should revert most recent release', () => {
      context.tortilla(['release', 'bump', 'major', '-m', 'first release']);
      context.tortilla(['release', 'bump', 'major', '-m', 'second release']);

      expect(context.tortilla(['release', 'current'])).toContain('2.0.0')

      context.tortilla(['release', 'revert']);

      expect(context.tortilla(['release', 'current'])).toContain('1.0.0')
    });
  });

  describe('current()', () => {
    it('should get the current version', () => {
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      context.tortilla(['release', 'bump', 'next', '-m', 'next version test']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      const currentVersion = context.tortilla(['release', 'current']);

      expect(currentVersion).toEqual(['🌟 Release: 1.1.1', '🌟 Branch:  master'].join('\n'));
    });
  });

  describe('diff()', () => {
    it('should run "git diff" between provided releases', () => {
      context.exec('sh', ['-c', 'echo 1.0.0 > VERSION']);
      context.git(['add', 'VERSION']);
      context.tortilla(['step', 'push', '-m', 'Create version file']);
      context.tortilla(['step', 'tag', '-m', 'First step']);
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      context.tortilla(['step', 'edit', '1.1']);
      context.exec('sh', ['-c', 'echo 1.1.0 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);

      context.tortilla(['step', 'edit', '1.1']);
      context.exec('sh', ['-c', 'echo 1.1.1 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      const releaseDiff = context.tortilla(['release', 'diff', '1.1.1', '1.0.0'], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).toContainSameContentAsFile('release-update.diff');
    });

    it('should concat the provided arguments vector', () => {
      context.exec('sh', ['-c', 'echo 1.0.0 > VERSION']);
      context.git(['add', 'VERSION']);
      context.tortilla(['step', 'push', '-m', 'Create version file']);
      context.tortilla(['step', 'tag', '-m', 'First step']);
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      context.tortilla(['step', 'edit', '1.1']);
      context.exec('sh', ['-c', 'echo 1.1.0 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);

      context.tortilla(['step', 'edit', '1.1']);
      context.exec('sh', ['-c', 'echo 1.1.1 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      const releaseDiff = context.tortilla(['release', 'diff', '1.1.1', '1.0.0', '--name-only'], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).toContainSameContentAsFile('release-update-names.diff');
    });

    it('should be able to run "git diff" for two releases with different roots', () => {
      context.tortilla(['step', 'edit', '--root']);
      context.exec('sh', ['-c', 'echo 1.0.0 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['step', 'tag', '-m', 'First step']);
      context.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      context.tortilla(['step', 'edit', '--root']);
      context.exec('sh', ['-c', 'echo 1.1.0 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);

      context.tortilla(['step', 'edit', '--root']);
      context.exec('sh', ['-c', 'echo 1.1.1 > VERSION']);
      context.git(['add', 'VERSION']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      const releaseDiff = context.tortilla(['release', 'diff', '1.1.1', '1.0.0'], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).toContainSameContentAsFile('release-update.diff');
    });

    it('it should be able to run "git diff" for nested submodules', () => {
      const submodule = `${context.testDir}/module`;

      context.tortilla(['step', 'edit', '--root']);
      context.tortilla(['create', submodule], { env: { GIT_EDITOR: true } });

      // Create submodule and release initial version
      context.scopeEnv(() => {
        context.exec('sh', ['-c', 'echo foo > file'], { cwd: submodule });
        context.git(['add', 'file'], { cwd: submodule });
        context.tortilla(['step', 'push', '-m', 'add file'], { cwd: submodule });
        context.tortilla(['step', 'tag', '-m', 'how to add file'], { cwd: submodule });
        context.tortilla(['release', 'bump', 'minor', '-m', 'release foo'], { cwd: submodule });
      }, {
        TORTILLA_CWD: submodule
      });

      // Amend submodule and release initial version
      context.git(['submodule', 'add', './module']);
      context.git(['add', '.']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.setPromptAnswers(['master@0.1.0']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'release foo']);

      context.tortilla(['step', 'edit', '--root']);

      // Release a second version of the submodule
      context.scopeEnv(() => {
        context.git(['checkout', 'master']);
        context.tortilla(['step', 'edit', '1.1'], { cwd: submodule });
        context.exec('sh', ['-c', 'echo bar > file'], { cwd: submodule });
        context.git(['add', 'file'], { cwd: submodule });
        context.git(['commit', '--amend'], { cwd: submodule, env: { GIT_EDITOR: true } });
        context.git(['rebase', '--continue'], { cwd: submodule });
        context.tortilla(['release', 'bump', 'major', '-m', 'release bar'], { cwd: submodule });
      }, {
        TORTILLA_CWD: submodule
      });

      // Release a second version of the main module
      context.git(['add', '.']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.setPromptAnswers(['master@1.0.0']);
      context.tortilla(['release', 'bump', 'major', '-m', 'release bar']);

      const releaseDiff = context.tortilla(['release', 'diff', '0.1.0', '1.0.0'], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).toContainSameContentAsFile('submodule-releases.diff');
    });

    it('should handle missing versions of submodules when forming diff', () => {
      const submodule = `${context.tempDir}/module`;

      context.tortilla(['step', 'edit', '--root']);
      context.tortilla(['create', submodule], { env: { GIT_EDITOR: true } });

      // Create submodule and release initial version
      context.scopeEnv(() => {
        context.exec('sh', ['-c', 'echo foo > file'], { cwd: submodule });
        context.git(['add', 'file'], { cwd: submodule });
        context.tortilla(['step', 'push', '-m', 'add file'], { cwd: submodule });
        context.tortilla(['step', 'tag', '-m', 'how to add file'], { cwd: submodule });
        context.tortilla(['release', 'bump', 'minor', '-m', 'release foo'], { cwd: submodule });
      }, {
        TORTILLA_CWD: submodule
      });

      // Amend submodule and release initial version
      context.git(['submodule', 'add', submodule, 'module']);
      context.git(['add', '.']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.setPromptAnswers(['master@0.1.0']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'release foo']);

      context.tortilla(['step', 'edit', '--root']);
      context.exec('rm', ['-rf', submodule]);
      context.tortilla(['create', submodule], { env: { GIT_EDITOR: true } });

      // Release a second version of the submodule
      context.scopeEnv(() => {
        context.exec('sh', ['-c', 'echo foo > file'], { cwd: submodule });
        context.git(['add', 'file'], { cwd: submodule });
        context.tortilla(['step', 'push', '-m', 'add file'], { cwd: submodule });
        context.tortilla(['step', 'tag', '-m', 'how to add file'], { cwd: submodule });
        context.tortilla(['release', 'bump', 'major', '-m', 'release foo'], { cwd: submodule });
      }, {
        TORTILLA_CWD: submodule
      });

      context.exec('rm', ['-rf', 'module']);
      context.git(['clone', submodule, 'module']);
      context.git(['add', '.']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.setPromptAnswers(['master@1.0.0']);
      context.tortilla(['release', 'bump', 'major', '-m', 'release bar']);

      const releaseDiff = context.tortilla(['release', 'diff', '0.1.0', '1.0.0'], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).toEqual('');
    });
  });
});
