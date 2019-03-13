import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';
import './custom-matchers';
import * as Fs from 'fs-extra';
import * as Tmp from 'tmp';
import { Paths } from '../src/paths';

let context: any = {};

describe('Dump', () => {
  beforeAll(() => {
    tortillaBeforeAll.bind(context)();

    context.dumpFile = Tmp.tmpNameSync();

    context.readDumpFile = parse => {
      const dumpContent = Fs.readFileSync(context.dumpFile).toString();

      return parse ? JSON.parse(dumpContent) : dumpContent;
    };
  });

  beforeEach(tortillaBeforeEach.bind(context));

  afterEach(() => {
    Fs.removeSync(context.dumpFile);
  });

  describe('create()', () => {
    it('should dump all branches which has at least a single release', () => {
      const testBranches = ['foo', 'bar', 'baz'];

      testBranches.forEach(branchName => {
        context.git(['checkout', '-b', branchName]);
        context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
        context.git(['checkout', 'master']);
      });

      context.tortilla(['dump', 'create', context.dumpFile]);

      expect(context.readDumpFile()).toContainSameContentAsFile('dumps/branches-dump.json');
    });

    it('should track history branch from remotes/origin if not exists', () => {
      const testBranches = ['foo', 'bar', 'baz'];

      testBranches.forEach(branchName => {
        context.git(['checkout', '-b', branchName]);
        context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
        context.git(['checkout', 'master']);
      });

      context.git(['push', 'origin', '--all']);

      testBranches.forEach(branchName => {
        context.git(['branch', '-D', `${branchName}-history`])
      });

      context.tortilla(['dump', 'create', context.dumpFile]);

      testBranches.forEach(branchName => {
        expect(() => {
          context.git(['rev-parse', `${branchName}-history`]);
        }).not.toThrowError();
      });
    });

    it('should dump all releases - sorted by chronological order', () => {
      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 1']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 2']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 3']);
      context.tortilla(['dump', 'create', context.dumpFile]);

      expect(context.readDumpFile()).toContainSameContentAsFile('dumps/releases-dump.json');
    });

    it('should dump all manuals - views should have no headers nor footers', () => {
      const comments = ['foo', 'bar', 'baz'];

      comments.forEach((comment, index) => {
        const step = index + 1;

        context.tortilla(['step', 'tag', '-m', comment]);
        context.tortilla(['step', 'edit', step]);
        Fs.writeFileSync(`${Paths.manuals.templates}/step${step}.tmpl`, comment);
        context.tortilla(['manual', 'render', step]);
        context.git(['add', '.']);
        context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
        context.git(['rebase', '--continue']);
      });

      context.tortilla(['release', 'bump', 'minor', '-m', 'master release']);
      context.tortilla(['dump', 'create', context.dumpFile]);

      expect(context.readDumpFile()).toContainSameContentAsFile('dumps/manuals-dump.json');
    });

    it('should dump distinct manuals for 2 different releases', () => {
      context.tortilla(['step', 'edit', '--root']);
      Fs.writeFileSync(`${Paths.manuals.templates}/root.tmpl`, 'release 1');
      context.git(['add', Paths.manuals.templates])
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 1']);

      context.tortilla(['step', 'edit', '--root']);
      Fs.writeFileSync(`${Paths.manuals.templates}/root.tmpl`, 'release 2');
      context.git(['add', Paths.manuals.templates])
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 2']);

      context.tortilla(['step', 'edit', '--root']);
      Fs.writeFileSync(`${Paths.manuals.templates}/root.tmpl`, 'release 3');
      context.git(['add', Paths.manuals.templates])
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 3']);

      context.tortilla(['dump', 'create', context.dumpFile]);

      expect(context.readDumpFile()).toContainSameContentAsFile('dumps/distinct-dump.json');
    });

    it('should dump all - mixed scenario', () => {
      // Manuals dump
      const comments = ['foo', 'bar', 'baz'];

      comments.forEach((comment, index) => {
        const step = index + 1;

        context.tortilla(['step', 'tag', '-m', comment]);
        context.tortilla(['step', 'edit', step]);
        Fs.writeFileSync(`${Paths.manuals.templates}/step${step}.tmpl`, comment);
        context.tortilla(['manual', 'render', step]);
        context.git(['add', '.']);
        context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
        context.git(['rebase', '--continue']);
      });

      const testBranches = ['foo', 'bar', 'baz'];

      testBranches.forEach(branchName => {
        context.git(['checkout', '-b', branchName]);
        context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 1`]);
        context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 2`]);
        context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 3`]);
        context.git(['checkout', 'master']);
      });

      context.tortilla(['dump', 'create', context.dumpFile]);

      expect(context.readDumpFile()).toContainSameContentAsFile('dumps/mixed-dump.json');
    });

    it('should be able to filter branches', () => {
      const testBranches = ['foo', 'bar', 'baz', 'qux'];

      testBranches.forEach(branchName => {
        context.git(['checkout', '-b', branchName]);
        context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
        context.git(['checkout', 'master']);
      });

      context.tortilla(['dump', 'create', context.dumpFile, '--filter', 'foo bar baz']);

      expect(context.readDumpFile()).toContainSameContentAsFile('dumps/branches-dump.json');
    });

    it('should be able to reject branches', () => {
      const testBranches = ['foo', 'bar', 'baz', 'qux'];

      testBranches.forEach(branchName => {
        context.git(['checkout', '-b', branchName]);
        context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
        context.git(['checkout', 'master']);
      });

      context.tortilla(['dump', 'create', context.dumpFile, '--reject', 'qux']);

      expect(context.readDumpFile()).toContainSameContentAsFile('dumps/branches-dump.json');
    });

    it('should create dirs recursively if output not dir not exist', () => {
      const out = `${context.dumpFile}/foo/bar/baz.json`;
      context.tortilla(['dump', 'create', out]);

      expect(context.exists(out, 'file')).toBeTruthy();
    });

    it('should create a tutorial.json file inside dir if already exists', () => {
      Fs.mkdirSync(context.dumpFile);
      context.tortilla(['dump', 'create', context.dumpFile]);

      expect(context.exists(`${context.dumpFile}/tutorial.json`, 'file'));
    });

    it('should create a dump file for a tutorial which includes submodules', () => {
      const submodule = `${context.testDir}/module`;

      context.tortilla(['step', 'edit', '--root']);
      context.tortilla(['create', 'submodule', '-o', submodule], { env: { GIT_EDITOR: true } });

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

      context.tortilla(['dump', 'create', context.dumpFile]);

      expect(context.readDumpFile()).toContainSameContentAsFile('dumps/submodules-dump.json');
    });
  });

  describe('diffReleases()', () => {
    it('should print the differences between 2 specified releases based on given dump file', () => {
      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 1']);

      Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
      context.git(['add', `${context.cwd()}/foo`]);
      context.tortilla(['step', 'push', '-m', 'added foo']);

      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 2']);

      Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
      context.git(['add', `${context.cwd()}/bar`]);
      context.tortilla(['step', 'push', '-m', 'added bar']);

      context.tortilla(['release', 'bump', 'minor', '-m', 'master release 3']);

      context.tortilla(['dump', 'create', context.dumpFile]);

      const diff = context.tortilla(['dump', 'diff-releases', context.dumpFile, 'master@0.1.0', 'master@0.3.0']);

      expect(diff).toContainSameContentAsFile('releases.diff');
    });

    it('should handle changes in binary files', () => {
      const dumpPath = context.resolveInputPath('dumps/binary-dump.json');
      let diff;

      // Binary added
      diff = context.tortilla(['dump', 'diff-releases', dumpPath, 'master@0.1.0', 'master@0.2.0']);
      expect(diff).toEqual(context.trimIndents(`
        diff --git a/img.png b/img.png
        new file mode 100644
        index 0000000..4f8375a
        Binary files /dev/null and b/img.png differ
      `));

      // Binary renamed
      diff = context.tortilla(['dump', 'diff-releases', dumpPath, 'master@0.2.0', 'master@0.3.0']);
      expect(diff).toEqual(context.trimIndents(`
        diff --git a/img.png b/re_img.png
        similarity index 100%
        rename from img.png
        rename to re_img.png
      `));

      // Binary removed
      diff = context.tortilla(['dump', 'diff-releases', dumpPath, 'master@0.3.0', 'master@0.4.0']);
      expect(diff).toEqual(context.trimIndents(`
        diff --git a/re_img.png b/re_img.png
        deleted file mode 100644
        index 4f8375a..0000000
        Binary files a/re_img.png and /dev/null differ
      `));
    })
  });
});
