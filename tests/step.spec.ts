import * as Fs from 'fs-extra';
import * as Path from 'path';
import * as Tmp from 'tmp';
import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';
import './custom-matchers';
import { Step } from '../src/step';
import { Paths } from '../src/paths';
import { Git } from '../src/git';

let context: any = {};

describe('Step', () => {
  beforeAll(tortillaBeforeAll.bind(context));
  beforeEach(tortillaBeforeEach.bind(context));

  describe('push()', () => {
    it('should push a new step to the top of the stack', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: target');
    });

    it('should add a new step with an updated sub-index', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: target');
    });

    it('should add a new step with an updated super-index', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 2.1: target');
    });
  });

  describe('pop()', () => {
    it('should push the last step from the top of the stack', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'pop']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: target');
    });

    it('should remove manual files', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'pop']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: target');

      const fileExists = context.exists(`${context.testDir}/.tortilla/manuals/templates/step1.tmpl`);
      expect(fileExists).toBeFalsy();
    });

    it('should delete branch referencing super step', () => {
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'pop']);

      let branchExists;
      try {
        branchExists = !!context.git(['rev-parse', 'master-step3']);
      } catch (e) {
        branchExists = false;
      }

      expect(branchExists).toBeFalsy();
    });
  });

  describe('tag()', () => {
    it('should push a new step to the top of the stack', () => {
      context.tortilla(['step', 'tag', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1: target');
    });

    it('should push a new step with an updated super-index', () => {
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 2: target');
    });

    it('should create a manual file', () => {
      context.tortilla(['step', 'tag', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1: target');

      const fileExists = context.exists(`${context.testDir}/.tortilla/manuals/templates/step1.tmpl`);
      expect(fileExists).toBeTruthy();
    });

    it('should use existing manual file if already exists', () => {
      const templateFile = `${context.testDir}/.tortilla/manuals/templates/step1.tmpl`;
      Fs.writeFileSync(templateFile, 'contents');

      context.tortilla(['step', 'tag', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1: target');

      const fileExists = context.exists(templateFile);
      expect(fileExists).toBeTruthy();

      const fileContents = Fs.readFileSync(templateFile).toString();
      expect(fileContents).toEqual('contents');
    });

    it('should create a new branch referencing the tagged step', () => {
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);

      expect(context.git(['rev-parse', 'HEAD~0'])).toEqual(context.git(['rev-parse', 'master-step3']));
      expect(context.git(['rev-parse', 'HEAD~1'])).toEqual(context.git(['rev-parse', 'master-step2']));
      expect(context.git(['rev-parse', 'HEAD~2'])).toEqual(context.git(['rev-parse', 'master-step1']));
      expect(context.git(['rev-parse', 'HEAD~3'])).toEqual(context.git(['rev-parse', 'master-root']));
    });
  });

  describe('reword()', () => {
    it('should reword the provided step', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'reword', '1.1', '-m', 'target']);

      const message = Step.recentCommit(1, '%s');
      expect(message).toEqual('Step 1.1: target');
    });

    it('should be able to reword root', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'reword', '--root', '-m', 'target']);

      const message = Git(['rev-list', '--max-parents=0', 'HEAD', '--format=%s']).split('\n')[1];

      expect(message).toEqual('target');
    });

    it('should reword the last step by default if no step specified', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'reword', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: target');
    });
  });

  describe('edit()', () => {
    it('should edit the provided step', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'edit', '1.1']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: target');
    });

    it('should map git-refs to step indexes', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'edit', 'HEAD~1']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: target');
    });

    it('should be able to edit steps with multiple digits', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);

      let size = 10;
      while (size--) {
        context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      }

      context.tortilla(['step', 'edit', '1.1']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: target');
    });

    it('should be able to edit root', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'edit', '--root']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const commitHash = Git.recentCommit(['--format=%H']);
      const rootHash = Git.rootHash();
      expect(commitHash).toEqual(rootHash);
    });

    it('should update step indices when pushing a step', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'old', '--allow-empty']);
      context.tortilla(['step', 'edit', '1.1']);
      context.tortilla(['step', 'push', '-m', 'new', '--allow-empty']);

      Git(['rebase', '--continue']);

      const newMessage = Step.recentCommit('%s');
      expect(newMessage).toEqual('Step 1.3: old');

      const oldMessage = Step.recentCommit(1, '%s');
      expect(oldMessage).toEqual('Step 1.2: new');
    });

    it('should update step indices when popping a step', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'old', '--allow-empty']);
      context.tortilla(['step', 'edit', '1.2']);
      context.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).toEqual('Step 1.2: old');
    });

    it('should update super-step indices when tagging a step', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'tag', '-m', 'old']);
      context.tortilla(['step', 'edit', '1.1']);
      context.tortilla(['step', 'tag', '-m', 'new']);

      Git(['rebase', '--continue']);

      const newMessage = Step.recentCommit('%s');
      expect(newMessage).toEqual('Step 2: old');

      const oldMessage = Step.recentCommit(1, '%s');
      expect(oldMessage).toEqual('Step 1: new');
    });

    it('should update sub-step indices when tagging a step', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'old', '--allow-empty']);
      context.tortilla(['step', 'edit', '1.1']);
      context.tortilla(['step', 'tag', '-m', 'new']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).toEqual('Step 2.1: old');
    });

    it('should update super-step indices when popping a super-step', () => {
      context.tortilla(['step', 'tag', '-m', 'target']);
      context.tortilla(['step', 'tag', '-m', 'old']);
      context.tortilla(['step', 'edit', '1']);
      context.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).toEqual('Step 1: old');
    });

    it('should update sub-step indices when popping a super-step', () => {
      context.tortilla(['step', 'tag', '-m', 'target']);
      context.tortilla(['step', 'push', '-m', 'old', '--allow-empty']);
      context.tortilla(['step', 'edit', '1']);
      context.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).toEqual('Step 1.1: old');
    });

    it('should resolve addition conflicts when tagging a step', () => {
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'tag', '-m', 'old']);
      context.tortilla(['step', 'edit', '1.1']);
      context.tortilla(['step', 'tag', '-m', 'new']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).toEqual('Step 2: old');

      const newMessage = Step.recentCommit(1, '%s');
      expect(newMessage).toEqual('Step 1: new');

      const oldFileExists = context.exists(`${context.testDir}/.tortilla/manuals/templates/step1.tmpl`);
      expect(oldFileExists).toBeTruthy();

      const newFileExists = context.exists(`${context.testDir}/.tortilla/manuals/templates/step2.tmpl`);
      expect(newFileExists).toBeTruthy();
    });

    it('should resolve removal conflicts when tagging a step', () => {
      context.tortilla(['step', 'tag', '-m', 'target']);
      context.tortilla(['step', 'tag', '-m', 'old']);
      context.tortilla(['step', 'edit', '1']);
      context.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).toEqual('Step 1: old');

      const oldFileExists = context.exists(`${context.testDir}/.tortilla/manuals/templates/step1.tmpl`);
      expect(oldFileExists).toBeTruthy();
    });

    it('should edit the last step by default if no step specified', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'edit']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: target');
    });

    it('should be able to edit multiple steps if specified to', () => {
      context.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);

      context.tortilla(['step', 'edit', '1.2', '1.4']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: target');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.4: target');
    });

    it('should be able to edit multiple steps in a random order', () => {
      context.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);

      context.tortilla(['step', 'edit', '1.4', '1.2']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: target');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.4: target');
    });

    it('should be able to edit multiple steps including the root commit', () => {
      // Keep-empty is not allowed when using the --root flag
      context.exec('touch', ['1.1']);

      context.git(['add', '1.1']);

      context.tortilla(['step', 'push', '-m', 'target']);

      context.tortilla(['step', 'edit', '1.1', '--root']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const commitHash = Git.recentCommit(['--format=%H']);
      const rootHash = Git.rootHash();
      expect(commitHash).toEqual(rootHash);

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: target');
    });

    it('should re-adjust indicies after editing multiple steps', () => {
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'pop', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);

      context.tortilla(['step', 'edit', '1.2', '1.4']);

      context.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      context.tortilla(['step', 'push', '-m', 'push', '--allow-empty']);

      Git(['rebase', '--continue']);

      const popMessage = context.git(['log', '--format=%s', '--grep=^Step 1.2']);
      expect(popMessage).toEqual('Step 1.2: dummy');

      const pushMessage = context.git(['log', '--format=%s', '--grep=^Step 1.4']);
      expect(pushMessage).toEqual('Step 1.4: push');
    });

    it('should be able to update diffStep() template helpers indexes', () => {
      context.exec('sh', ['-c', 'echo foo > file']);
      context.git(['add', 'file']);
      context.tortilla(['step', 'push', '-m', 'Create file']);

      context.exec('sh', ['-c', 'echo bar > file']);
      context.git(['add', 'file']);
      context.tortilla(['step', 'push', '-m', 'Edit file']);

      context.tortilla(['step', 'tag', '-m', 'File manipulation']);
      context.tortilla(['step', 'edit', '1']);

      const manualPath = context.exec('realpath', ['.tortilla/manuals/templates/step1.tmpl']);

      Fs.writeFileSync(manualPath, ['Create file:', '', '{{{diffStep 1.1}}}', '', 'Edit file:', '', '{{{diffStep 1.2}}}'].join('\n'));

      context.git(['add', manualPath]);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);

      context.tortilla(['step', 'edit', '1.1', '--udiff']);
      context.tortilla(['step', 'pop']);
      // Expected conflict
      try {
        context.git(['rebase', '--continue']);
      } catch (e) {}

      context.git(['add', 'file']);
      context.git(['rebase', '--continue'], {
        env: {
          TORTILLA_CHILD_PROCESS: '',
          GIT_EDITOR: true
        }
      });

      expect(Fs.readFileSync(manualPath).toString()).toEqual(['Create file:', '', '{{{diffStep XX.XX}}}', '', 'Edit file:', '', '{{{diffStep 1.1}}}'].join('\n'));

      context.tortilla(['step', 'edit', '--root', '--udiff']);
      context.exec('sh', ['-c', 'echo foo > file']);
      context.git(['add', 'file']);
      context.tortilla(['step', 'push', '-m', 'Create file']);
      // Expected conflict
      try {
        context.git(['rebase', '--continue']);
      } catch (e) {}

      context.exec('sh', ['-c', 'echo bar > file']);
      context.git(['add', 'file']);
      context.git(['rebase', '--continue'], {
        env: {
          TORTILLA_CHILD_PROCESS: '',
          GIT_EDITOR: true
        }
      });

      expect(Fs.readFileSync(manualPath).toString()).toEqual(['Create file:', '', '{{{diffStep XX.XX}}}', '', 'Edit file:', '', '{{{diffStep 1.2}}}'].join('\n'));
    });

    it.skip('should update all diffStep template helpers in manuals repo', async () => {
      context.exec('sh', ['-c', 'echo foo > file']);
      context.git(['add', 'file']);
      context.tortilla(['step', 'push', '-m', 'Create file']);
      context.exec('sh', ['-c', 'echo bar > file']);
      context.git(['add', 'file']);
      context.tortilla(['step', 'push', '-m', 'Edit file']);
      context.tortilla(['step', 'tag', '-m', 'File manipulation']);

      const textRepoDir = Tmp.tmpNameSync();
      context.tortilla(['create', textRepoDir, '-m', 'Manuals Repo']);

      let manualPath;

      context.scopeEnv(
        () => {
          context.tortilla(['step', 'tag', '-m', 'File manipulation']);
          context.tortilla(['submodule', 'add', context.cwd(), 'submodule']);

          manualPath = context.exec('realpath', ['.tortilla/manuals/templates/step1.tmpl']);

          Fs.writeFileSync(manualPath, ['Create file:', '', '{{{diffStep 1.1 module="submodule"}}}', '', 'Edit file:', '', '{{{diffStep 1.2 module="submodule"}}}'].join('\n'));

          context.git(['add', manualPath]);
          context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
        },
        {
          TORTILLA_CWD: textRepoDir
        }
      );

      context.tortilla(['step', 'edit', '1.1', `--udiff=${textRepoDir}`]);
      context.tortilla(['step', 'pop']);
      // Expected conflict
      try {
        context.git(['rebase', '--continue']);
      } catch (e) {}

      context.git(['add', 'file']);

      context.git(['rebase', '--continue'], {
        env: {
          TORTILLA_CHILD_PROCESS: '',
          GIT_EDITOR: true
        }
      });

      expect(Fs.readFileSync(manualPath).toString()).toEqual(['Create file:', '', '{{{diffStep XX.XX module="submodule"}}}', '', 'Edit file:', '', '{{{diffStep 1.1 module="submodule"}}}'].join('\n'));

      context.tortilla(['step', 'edit', '--root', `--udiff=${textRepoDir}`]);
      context.exec('sh', ['-c', 'echo foo > file']);
      context.git(['add', 'file']);
      context.tortilla(['step', 'push', '-m', 'Create file']);
      try {
        context.git(['rebase', '--continue']);
      } catch (e) {}

      context.exec('sh', ['-c', 'echo bar > file']);
      context.git(['add', 'file']);
      context.git(['rebase', '--continue'], {
        env: {
          TORTILLA_CHILD_PROCESS: '',
          GIT_EDITOR: true
        }
      });

      expect(Fs.readFileSync(manualPath).toString()).toEqual(['Create file:', '', '{{{diffStep XX.XX module="submodule"}}}', '', 'Edit file:', '', '{{{diffStep 1.2 module="submodule"}}}'].join('\n'));
    });

    it('should reset all branches referencing super steps', () => {
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);

      context.tortilla(['step', 'edit', '3']);

      context.tortilla(['step', 'pop']);
      context.tortilla(['step', 'pop']);
      context.tortilla(['step', 'pop']);

      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);

      context.git(['rebase', '--continue']);

      expect(context.git(['rev-parse', 'HEAD~0'])).toEqual(context.git(['rev-parse', 'master-step3']));
      expect(context.git(['rev-parse', 'HEAD~1'])).toEqual(context.git(['rev-parse', 'master-step2']));
      expect(context.git(['rev-parse', 'HEAD~2'])).toEqual(context.git(['rev-parse', 'master-step1']));
      expect(context.git(['rev-parse', 'HEAD~3'])).toEqual(context.git(['rev-parse', 'master-root']));
    });

    it('should edit a full range of provided steps', () => {
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);

      context.tortilla(['step', 'edit', '1.1..1.4']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.3: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.4: test');
    });

    it('should edit a range of provided steps with top limit only', () => {
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);

      context.tortilla(['step', 'edit', '..1.3']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const commitHash = Git.recentCommit(['--format=%H']);
      const rootHash = Git.rootHash();
      expect(commitHash).toEqual(rootHash);

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.3: test');
    });

    it('should edit a range of provided steps with bottom limit only', () => {
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);

      context.tortilla(['step', 'edit', '1.1..']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.3: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.4: test');
    });

    it('should edit all steps', () => {
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);
      context.tortilla(['step', 'push', '-m', 'test', '--allow-empty']);

      context.tortilla(['step', 'edit', '..']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      const commitHash = Git.recentCommit(['--format=%H']);
      const rootHash = Git.rootHash();
      expect(commitHash).toEqual(rootHash);

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.1: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.2: test');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).toBeTruthy();

      message = Step.recentCommit('%s');
      expect(message).toEqual('Step 1.3: test');
    });
  });

  describe('sort()', () => {
    it('should sort all step indexes from the given step', () => {
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);

      context.git(['commit', '-m', 'Step 2.3: target commit', '--allow-empty', '--no-verify'], {
        env: {
          TORTILLA_CHILD_PROCESS: ''
        }
      });

      context.tortilla(['step', 'push', '-m', 'target step', '--allow-empty']);
      context.tortilla(['step', 'sort', '2']);

      let stepCommitMessage = Step.recentCommit('%s');
      expect(stepCommitMessage).toEqual('Step 2.3: target step');

      stepCommitMessage = Step.recentCommit(1, '%s');
      expect(stepCommitMessage).toEqual('Step 2.2: target commit');
    });

    it('should sort all step indexes from root', () => {
      // Root re-basing can't be applied with `keep-empty`
      context.exec('touch', ['1.1']);
      context.exec('touch', ['1.3']);
      context.exec('touch', ['1.4']);
      context.exec('touch', ['2.1']);

      context.git(['add', '1.1']);
      context.tortilla(['step', 'push', '-m', 'dummy']);

      context.git(['add', '1.3']);
      context.git(['commit', '-m', 'Step 1.3: target commit', '--no-verify'], {
        env: {
          TORTILLA_CHILD_PROCESS: ''
        }
      });

      context.git(['add', '1.4']);
      context.tortilla(['step', 'push', '-m', 'target step', '--allow-empty']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.git(['add', '2.1']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      context.tortilla(['step', 'sort', '--root']);

      let stepCommitMessage = Step.recentCommit(2, '%s');
      expect(stepCommitMessage).toEqual('Step 1.3: target step');

      stepCommitMessage = Step.recentCommit(3, '%s');
      expect(stepCommitMessage).toEqual('Step 1.2: target commit');
    });

    it('should sort recent super step by default', () => {
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);

      context.git(['commit', '-m', 'Step 2.3: target commit', '--allow-empty', '--no-verify'], {
        env: {
          TORTILLA_CHILD_PROCESS: ''
        }
      });

      context.tortilla(['step', 'push', '-m', 'target step', '--allow-empty']);
      context.tortilla(['step', 'sort']);

      let stepCommitMessage = Step.recentCommit('%s');
      expect(stepCommitMessage).toEqual('Step 2.3: target step');

      stepCommitMessage = Step.recentCommit(1, '%s');
      expect(stepCommitMessage).toEqual('Step 2.2: target commit');
    });
  });

  describe('show()', () => {
    it('should run git-show for given step index', () => {
      context.tortilla(['step', 'tag', '-m', 'Testing tortilla-step-show']);
      const out = context.tortilla(['step', 'show', '1', '--format=%s']);

      expect(out).toEqual(context.freeText(`
        Step 1: Testing tortilla-step-show

        diff --git a/.tortilla/manuals/templates/step1.tmpl b/.tortilla/manuals/templates/step1.tmpl
        new file mode 100644
        index 0000000..e69de29
      `))
    })
  })
});
