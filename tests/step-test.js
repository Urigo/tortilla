const Chai = require('chai');
const Path = require('path');
const Fs = require('fs-extra');
const Git = require('../src/git');
const Step = require('../src/step');


const expect = Chai.expect;


describe('Step', function () {
  describe('push()', function () {
    this.slow(3000);

    it('should push a new step to the top of the stack', function () {
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should add a new step with an updated sub-index', function () {
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.2: target');
    });

    it('should add a new step with an updated super-index', function () {
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 2.1: target');
    });
  });

  describe('pop()', function () {
    this.slow(2000);

    it('should push the last step from the top of the stack', function () {
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'pop']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should remove manual files', function () {
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'pop']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');

      const fileExists = this.exists(`${this.testDir}/.tortilla/manuals/templates/step1.tmpl`);
      expect(fileExists).to.be.falsy;
    });

    it('should delete branch referencing super step', function () {
      this.slow(3000);

      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);

      this.tortilla(['step', 'pop']);

      let branchExists;
      try {
        branchExists = !!this.git(['rev-parse', 'master-step3']);
      }
      catch (e) {
        branchExists = false;
      }

      expect(branchExists).to.be.falsy;
    });
  });

  describe('tag()', function () {
    this.slow(2000);

    it('should push a new step to the top of the stack', function () {
      this.tortilla(['step', 'tag', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1: target');
    });

    it('should push a new step with an updated super-index', function () {
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 2: target');
    });

    it('should create a manual file', function () {
      this.tortilla(['step', 'tag', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1: target');

      const fileExists = this.exists(`${this.testDir}/.tortilla/manuals/templates/step1.tmpl`);
      expect(fileExists).to.be.truthy;
    });

    it('should create a new branch referencing the tagged step', function () {
      this.slow(3000);

      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);

      expect(this.git(['rev-parse', 'HEAD~0'])).to.equal(this.git(['rev-parse', 'master-step3']));
      expect(this.git(['rev-parse', 'HEAD~1'])).to.equal(this.git(['rev-parse', 'master-step2']));
      expect(this.git(['rev-parse', 'HEAD~2'])).to.equal(this.git(['rev-parse', 'master-step1']));
      expect(this.git(['rev-parse', 'HEAD~3'])).to.equal(this.git(['rev-parse', 'master-root']));
    });

    it('should set submodule to right revision based on checkouts file', function () {
      this.slow(15000);

      this.tortilla(['step', 'edit', '--root']);

      const checkoutsPath = this.exec('realpath', ['.tortilla/checkouts.json']);
      Fs.writeFileSync(checkoutsPath, JSON.stringify({
        test_submodule: {
          head: 'master',
          steps: ['root', 1, 'root'],
        }
      }));

      const testRemote = this.createRepo();
      const testModuleName = 'test_submodule';
      this.git(['submodule', 'add', testRemote, testModuleName]);

      const testModulePath = Path.resolve(this.testDir, testModuleName);
      const testFilePath = `${testModulePath}/test.txt`;

      Fs.writeFileSync(testFilePath, '');
      this.git(['add', testFilePath], { cwd: testModulePath });
      this.git(['commit', '-m', 'Step 1: Test'], { cwd: testModulePath });

      this.git(['add', '.']);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);

      this.tortilla(['step', 'tag', '-m', 'foo']);
      this.tortilla(['step', 'tag', '-m', 'bar']);

      const msg = this.git(['log', '--format=%s'], { cwd: testModulePath });
      expect(msg).to.equal('New Repo');
    });
  });

  describe('reword()', function () {
    this.slow(3000);

    it('should reword the provided step', function () {
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'reword', '1.1', '-m', 'target']);

      const message = Step.recentCommit(1, '%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should be able to reword root', function () {
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'reword', '--root', '-m', 'target']);

      const message = Git([
        'rev-list', '--max-parents=0', 'HEAD', '--format=%s'
      ]).split('\n')[1];

      expect(message).to.equal('target');
    });

    it('should reword the last step by default if no step specified', function () {
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'reword', '-m', 'target']);

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.2: target');
    });
  });

  describe('edit()', function () {
    this.slow(5000);

    it('should edit the provided step', function () {
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'edit', '1.1']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should be able to edit steps with multiple digits', function () {
      this.slow(10000);
      this.timeout(20000);

      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);

      let size = 10;
      while (size--) {
        this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      }

      this.tortilla(['step', 'edit', '1.1']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should be able to edit root', function () {
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'edit', '--root']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      const commitHash = Git.recentCommit(['--format=%H']);
      const rootHash = Git.rootHash();
      expect(commitHash).to.equal(rootHash);
    });

    it('should update step indices when pushing a step', function () {
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'old', '--allow-empty']);
      this.tortilla(['step', 'edit', '1.1']);
      this.tortilla(['step', 'push', '-m', 'new', '--allow-empty']);

      Git(['rebase', '--continue']);

      const newMessage = Step.recentCommit('%s');
      expect(newMessage).to.equal('Step 1.3: old');

      const oldMessage = Step.recentCommit(1, '%s');
      expect(oldMessage).to.equal('Step 1.2: new');
    });

    it('should update step indices when popping a step', function () {
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'old', '--allow-empty']);
      this.tortilla(['step', 'edit', '1.2']);
      this.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 1.2: old');
    });

    it('should update super-step indices when tagging a step', function () {
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'tag', '-m', 'old']);
      this.tortilla(['step', 'edit', '1.1']);
      this.tortilla(['step', 'tag', '-m', 'new']);

      Git(['rebase', '--continue']);

      const newMessage = Step.recentCommit('%s');
      expect(newMessage).to.equal('Step 2: old');

      const oldMessage = Step.recentCommit(1, '%s');
      expect(oldMessage).to.equal('Step 1: new');
    });

    it('should update sub-step indices when tagging a step', function () {
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'old', '--allow-empty']);
      this.tortilla(['step', 'edit', '1.1']);
      this.tortilla(['step', 'tag', '-m', 'new']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 2.1: old');
    });

    it('should update super-step indices when popping a super-step', function () {
      this.tortilla(['step', 'tag', '-m', 'target']);
      this.tortilla(['step', 'tag', '-m', 'old']);
      this.tortilla(['step', 'edit', '1']);
      this.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 1: old');
    });

    it('should update sub-step indices when popping a super-step', function () {
      this.tortilla(['step', 'tag', '-m', 'target']);
      this.tortilla(['step', 'push', '-m', 'old', '--allow-empty']);
      this.tortilla(['step', 'edit', '1']);
      this.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 1.1: old');
    });

    it('should resolve addition conflicts when tagging a step', function () {
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'tag', '-m', 'old']);
      this.tortilla(['step', 'edit', '1.1']);
      this.tortilla(['step', 'tag', '-m', 'new']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 2: old');

      const newMessage = Step.recentCommit(1, '%s');
      expect(newMessage).to.equal('Step 1: new');

      const oldFileExists = this.exists(`${this.testDir}/.tortilla/manuals/templates/step1.tmpl`);
      expect(oldFileExists).to.be.truthy;

      const newFileExists = this.exists(`${this.testDir}/.tortilla/manuals/templates/step2.tmpl`);
      expect(newFileExists).to.be.truthy;
    });

    it('should resolve removal conflicts when tagging a step', function () {
      this.tortilla(['step', 'tag', '-m', 'target']);
      this.tortilla(['step', 'tag', '-m', 'old']);
      this.tortilla(['step', 'edit', '1']);
      this.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      const oldMessage = Step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 1: old');

      const oldFileExists = this.exists(`${this.testDir}/.tortilla/manuals/templates/step1.tmpl`);
      expect(oldFileExists).to.be.truthy;
    });

    it('should edit the last step by default if no step specified', function () {
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'edit']);

      const isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      const message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.2: target');
    });

    it('should be able to edit multiple steps if specified to', function () {
      this.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);

      this.tortilla(['step', 'edit', '1.2', '1.4']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.2: target');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.4: target');
    });

    it('should be able to edit multiple steps in a random order', function () {
      this.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'target', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'placeholder', '--allow-empty']);

      this.tortilla(['step', 'edit', '1.4', '1.2']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.2: target');

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.4: target');
    });

    it('should be able to edit multiple steps including the root commit', function () {
      // Keep-empty is not allowed when using the --root flag
      this.exec('touch', ['1.1']);

      this.git(['add', '1.1']);

      this.tortilla(['step', 'push', '-m', 'target']);

      this.tortilla(['step', 'edit', '1.1', '--root']);

      let isRebasing, message;

      isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      const commitHash = Git.recentCommit(['--format=%H']);
      const rootHash = Git.rootHash();
      expect(commitHash).to.equal(rootHash);

      Git(['rebase', '--continue']);

      isRebasing = Git.rebasing();
      expect(isRebasing).to.be.truthy;

      message = Step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should re-adjust indicies after editing multiple steps', function () {
      this.slow(10000);

      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'pop', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);

      this.tortilla(['step', 'edit', '1.2', '1.4']);

      this.tortilla(['step', 'pop']);

      Git(['rebase', '--continue']);

      this.tortilla(['step', 'push', '-m', 'push', '--allow-empty']);

      Git(['rebase', '--continue']);

      const popMessage = Step.recentCommit('%s', '^Step 1.2');
      expect(popMessage).to.equal('Step 1.2: dummy');

      const pushMessage = Step.recentCommit('%s', '^Step 1.4');
      expect(pushMessage).to.equal('Step 1.4: push');
    });

    it('should be able to update diffStep() template helpers indexes', function () {
      this.slow(10000);

      this.exec('sh', ['-c', 'echo foo > file']);
      this.git(['add', 'file']);
      this.tortilla(['step', 'push', '-m', 'Create file']);

      this.exec('sh', ['-c', 'echo bar > file']);
      this.git(['add', 'file']);
      this.tortilla(['step', 'push', '-m', 'Edit file']);

      this.tortilla(['step', 'tag', '-m', 'File manipulation']);
      this.tortilla(['step', 'edit', '1']);

      const manualPath = this.exec('realpath', ['.tortilla/manuals/templates/step1.tmpl']);

      Fs.writeFileSync(manualPath, [
        'Create file:',
        '',
        '{{{diffStep 1.1}}}',
        '',
        'Edit file:',
        '',
        '{{{diffStep 1.2}}}',
      ].join('\n'));

      this.git(['add', manualPath]);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);

      this.tortilla(['step', 'edit', '1.1', '--udiff']);
      this.tortilla(['step', 'pop']);
      try {
        this.git(['rebase', '--continue']);
      }
      catch (e) {
      }

      this.git(['add', 'file']);
      this.git(['rebase', '--continue'], {
        env: {
          TORTILLA_CHILD_PROCESS: '',
          GIT_EDITOR: true
        }
      });

      expect(Fs.readFileSync(manualPath).toString()).to.equal([
        'Create file:',
        '',
        '{{{diffStep XX.XX}}}',
        '',
        'Edit file:',
        '',
        '{{{diffStep 1.1}}}',
      ].join('\n'));

      this.tortilla(['step', 'edit', '--root', '--udiff']);
      this.exec('sh', ['-c', 'echo foo > file']);
      this.git(['add', 'file']);
      this.tortilla(['step', 'push', '-m', 'Create file']);
      try {
        this.git(['rebase', '--continue']);
      }
      catch (e) {
      }

      this.exec('sh', ['-c', 'echo bar > file']);
      this.git(['add', 'file']);
      this.git(['rebase', '--continue'], {
        env: {
          TORTILLA_CHILD_PROCESS: '',
          GIT_EDITOR: true
        }
      });

      expect(Fs.readFileSync(manualPath).toString()).to.equal([
        'Create file:',
        '',
        '{{{diffStep XX.XX}}}',
        '',
        'Edit file:',
        '',
        '{{{diffStep 1.2}}}',
      ].join('\n'));
    });

    it('should reset all branches referencing super steps', function () {
      this.slow(10000);

      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);

      this.tortilla(['step', 'edit', '3']);

      this.tortilla(['step', 'pop']);
      this.tortilla(['step', 'pop']);
      this.tortilla(['step', 'pop']);

      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);

      this.git(['rebase', '--continue']);

      expect(this.git(['rev-parse', 'HEAD~0'])).to.equal(this.git(['rev-parse', 'master-step3']));
      expect(this.git(['rev-parse', 'HEAD~1'])).to.equal(this.git(['rev-parse', 'master-step2']));
      expect(this.git(['rev-parse', 'HEAD~2'])).to.equal(this.git(['rev-parse', 'master-step1']));
      expect(this.git(['rev-parse', 'HEAD~3'])).to.equal(this.git(['rev-parse', 'master-root']));
    });

    it('should adjust submodules on the run when editing a step', function () {
      this.slow(15000);

      this.tortilla(['step', 'tag', '-m', 'foo']);
      this.tortilla(['step', 'tag', '-m', 'bar']);

      this.tortilla(['step', 'edit', '--root']);

      const testRemote = this.createRepo();
      const testModuleName = 'test_submodule';

      this.git(['submodule', 'add', testRemote, testModuleName]);
      this.git(['add', testModuleName]);

      const testModulePath = Path.resolve(this.testDir, testModuleName);
      const testFilePath = `${testModulePath}/test.txt`;

      Fs.writeFileSync(testFilePath, '');
      this.git(['add', testFilePath], { cwd: testModulePath });
      this.git(['commit', '-m', 'Step 1: Test'], { cwd: testModulePath });

      const checkoutsPath = this.exec('realpath', ['.tortilla/checkouts.json']);
      Fs.writeFileSync(checkoutsPath, JSON.stringify({
        [testModuleName]: {
          head: 'master',
          steps: [1, 1, 'root'],
        }
      }));
      this.git(['add', checkoutsPath]);

      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);

      const msg = this.git(['log', '--format=%s', '-1'], { cwd: testModulePath });
      expect(msg).to.equal('New Repo');
    });
  });

  describe('sort()', function () {
    this.slow(10000);

    it('should sort all step indexes from the given step', function () {
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);

      this.git([
        'commit', '-m', 'Step 2.3: target commit', '--allow-empty', '--no-verify'
      ], {
        env: {
          TORTILLA_CHILD_PROCESS: ''
        }
      });

      this.tortilla(['step', 'push', '-m', 'target step', '--allow-empty']);
      this.tortilla(['step', 'sort', '2']);

      let stepCommitMessage = Step.recentCommit('%s');
      expect(stepCommitMessage).to.equal('Step 2.3: target step');

      stepCommitMessage = Step.recentCommit(1, '%s');
      expect(stepCommitMessage).to.equal('Step 2.2: target commit');
    });

    it('should sort all step indexes from root', function () {
      // Root re-basing can't be applied with `keep-empty`
      this.exec('touch', ['1.1']);
      this.exec('touch', ['1.3']);
      this.exec('touch', ['1.4']);
      this.exec('touch', ['2.1']);

      this.git(['add', '1.1']);
      this.tortilla(['step', 'push', '-m', 'dummy']);

      this.git(['add', '1.3']);
      this.git([
        'commit', '-m', 'Step 1.3: target commit', '--no-verify'
      ], {
        env: {
          TORTILLA_CHILD_PROCESS: ''
        }
      });

      this.git(['add', '1.4']);
      this.tortilla(['step', 'push', '-m', 'target step', '--allow-empty']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.git(['add', '2.1']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);
      this.tortilla(['step', 'sort', '--root']);

      let stepCommitMessage = Step.recentCommit(2, '%s');
      expect(stepCommitMessage).to.equal('Step 1.3: target step');

      stepCommitMessage = Step.recentCommit(3, '%s');
      expect(stepCommitMessage).to.equal('Step 1.2: target commit');
    });

    it('should sort recent super step by default', function () {
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'push', '-m', 'dummy', '--allow-empty']);

      this.git([
        'commit', '-m', 'Step 2.3: target commit', '--allow-empty', '--no-verify'
      ], {
        env: {
          TORTILLA_CHILD_PROCESS: ''
        }
      });

      this.tortilla(['step', 'push', '-m', 'target step', '--allow-empty']);
      this.tortilla(['step', 'sort']);

      let stepCommitMessage = Step.recentCommit('%s');
      expect(stepCommitMessage).to.equal('Step 2.3: target step');

      stepCommitMessage = Step.recentCommit(1, '%s');
      expect(stepCommitMessage).to.equal('Step 2.2: target commit');
    });
  });
});