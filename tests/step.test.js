const Chai = require('chai');


const expect = Chai.expect;


describe('Step', function () {
  beforeEach(function () {
    this.step = require(`${this.testDir}/.tortilla/step`);

    this.npm.step = (argv, ...args) => this.npm([
      'run', 'step', '--'
    ].concat(argv), ...args);
  });

  describe('push()', function () {
    this.slow(1500);

    it('should push a new step to the top of the stack', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should add a new step with an updated sub-index', function () {
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['push', '-m', 'target', '--allow-empty']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1.2: target');
    });

    it('should add a new step with an updated super-index', function () {
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['tag', '-m', 'dummy']);
      this.npm.step(['push', '-m', 'target', '--allow-empty']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 2.1: target');
    });
  });

  describe('pop()', function () {
    this.slow(1500);

    it('should push the last step from the top of the stack', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['pop']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should remove tags', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['tag', '-m', 'dummy']);
      this.npm.step(['pop']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');

      const tagExists = this.tagExists('step1');
      expect(tagExists).to.be.falsy;
    });

    it('should remove instruction files', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['tag', '-m', 'dummy']);
      this.npm.step(['pop']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');

      const fileExists = this.exists(`${this.testDir}/steps/step1.md`);
      expect(fileExists).to.be.falsy;
    });
  });

  describe('tag()', function () {
    this.slow(1500);

    it('should push a new step to the top of the stack', function () {
      this.npm.step(['tag', '-m', 'target']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1: target');
    });

    it('should push a new step with an updated super-index', function () {
      this.npm.step(['tag', '-m', 'dummy']);
      this.npm.step(['tag', '-m', 'target']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 2: target');
    });

    it('should add a new tag', function () {
      this.npm.step(['tag', '-m', 'target']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1: target');

      const tagExists = this.tagExists('step1');
      expect(tagExists).to.be.truthy;

      const tagHash = this.git(['rev-parse', 'step1']);
      const commitHash = this.git(['rev-parse', 'HEAD']);
      expect(tagHash).to.equal(commitHash);
    });

    it('should create an instruction file', function () {
      this.npm.step(['tag', '-m', 'target']);

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1: target');

      const fileExists = this.exists(`${this.testDir}/steps/step1.md`);
      expect(fileExists).to.be.truthy;
    });
  });

  describe('reword()', function () {
    this.slow(2000);

    it('should reword the provided step', function () {
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['reword', '1.1', '-m', 'target']);

      const message = this.step.recentCommit(1, '%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should be able to reword root', function () {
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['reword', '--root', '-m', 'target']);

      const message = this.git([
        'rev-list', '--max-parents=0', 'HEAD', '--format=%s'
      ]).split('\n')[1];

      expect(message).to.equal('target');
    });

    it('should update hash references', function () {
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['tag', '-m', 'dummy']);
      this.npm.step(['reword', '1.1', '-m', 'target']);

      const message = this.step.recentCommit(1, '%s');
      expect(message).to.equal('Step 1.1: target');

      const rootTagHash = this.git(['rev-parse', 'root']);
      const rootCommitHash = this.git(['rev-list', '--max-parents=0', 'HEAD']);
      expect(rootTagHash).to.equal(rootCommitHash);

      const stepTagHash = this.git(['rev-parse', 'step1']);
      const stepCommitHash = this.step.recentCommit('%H');
      expect(stepTagHash).to.equal(stepCommitHash);
    });
  });

  describe('edit()', function () {
    this.slow(3000);

    it('should edit the provided step', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['edit', '1.1']);

      const isRebasing = this.rebasing();
      expect(isRebasing).to.be.truthy;

      const message = this.step.recentCommit('%s');
      expect(message).to.equal('Step 1.1: target');
    });

    it('should be able to edit root', function () {
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['edit', '--root']);

      const isRebasing = this.rebasing();
      expect(isRebasing).to.be.truthy;

      const commitHash = this.recentCommit(['--format=%H']);
      const rootHash = this.git(['rev-list', '--max-parents=0', 'HEAD']);
      expect(commitHash).to.equal(rootHash);
    });

    it('should update hash references', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['tag', '-m', 'dummy']);
      this.npm.step(['edit', '1.1']);

      this.git(['rebase', '--continue']);

      const rootTagHash = this.git(['rev-parse', 'root']);
      const rootCommitHash = this.git(['rev-list', '--max-parents=0', 'HEAD']);
      expect(rootTagHash).to.equal(rootCommitHash);

      const stepTagHash = this.git(['rev-parse', 'step1']);
      const stepCommitHash = this.step.recentCommit('%H');
      expect(stepTagHash).to.equal(stepCommitHash);
    });

    it('should update step indices when pushing a step', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['push', '-m', 'old', '--allow-empty']);
      this.npm.step(['edit', '1.1']);
      this.npm.step(['push', '-m', 'new', '--allow-empty']);

      this.git(['rebase', '--continue']);

      const newMessage = this.step.recentCommit('%s');
      expect(newMessage).to.equal('Step 1.3: old');

      const oldMessage = this.step.recentCommit(1, '%s');
      expect(oldMessage).to.equal('Step 1.2: new');
    });

    it('should update step indices when popping a step', function () {
      this.npm.step(['push', '-m', 'dummy', '--allow-empty']);
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['push', '-m', 'old', '--allow-empty']);
      this.npm.step(['edit', '1.2']);
      this.npm.step(['pop']);

      this.git(['rebase', '--continue']);

      const oldMessage = this.step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 1.2: old');
    });

    it('should update super-step indices when tagging a step', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['tag', '-m', 'old']);
      this.npm.step(['edit', '1.1']);
      this.npm.step(['tag', '-m', 'new']);

      this.git(['rebase', '--continue']);

      const newMessage = this.step.recentCommit('%s');
      expect(newMessage).to.equal('Step 2: old');

      const oldMessage = this.step.recentCommit(1, '%s');
      expect(oldMessage).to.equal('Step 1: new');
    });

    it('should update sub-step indices when tagging a step', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['push', '-m', 'old', '--allow-empty']);
      this.npm.step(['edit', '1.1']);
      this.npm.step(['tag', '-m', 'new']);

      this.git(['rebase', '--continue']);

      const oldMessage = this.step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 2.1: old');
    });

    it('should update super-step indices when popping a super-step', function () {
      this.npm.step(['tag', '-m', 'target']);
      this.npm.step(['tag', '-m', 'old']);
      this.npm.step(['edit', '1']);
      this.npm.step(['pop']);

      this.git(['rebase', '--continue']);

      const oldMessage = this.step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 1: old');
    });

    it('should update sub-step indices when popping a super-step', function () {
      this.npm.step(['tag', '-m', 'target']);
      this.npm.step(['push', '-m', 'old', '--allow-empty']);
      this.npm.step(['edit', '1']);
      this.npm.step(['pop']);

      this.git(['rebase', '--continue']);

      const oldMessage = this.step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 1.1: old');
    });

    it('should resolve addition conflicts when tagging a step', function () {
      this.npm.step(['push', '-m', 'target', '--allow-empty']);
      this.npm.step(['tag', '-m', 'old']);
      this.npm.step(['edit', '1.1']);
      this.npm.step(['tag', '-m', 'new']);

      this.git(['rebase', '--continue']);

      const oldMessage = this.step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 2: old');

      const newMessage = this.step.recentCommit(1, '%s');
      expect(newMessage).to.equal('Step 1: new');

      const oldFileExists = this.exists(`${this.testDir}/steps/step1.md`);
      expect(oldFileExists).to.be.truthy;

      const newFileExists = this.exists(`${this.testDir}/steps/step2.md`);
      expect(newFileExists).to.be.truthy;
    });

    it('should resolve removal conflicts when tagging a step', function () {
      this.npm.step(['tag', '-m', 'target']);
      this.npm.step(['tag', '-m', 'old']);
      this.npm.step(['edit', '1']);
      this.npm.step(['pop']);

      this.git(['rebase', '--continue']);

      const oldMessage = this.step.recentCommit('%s');
      expect(oldMessage).to.equal('Step 1: old');

      const oldFileExists = this.exists(`${this.testDir}/steps/step1.md`);
      expect(oldFileExists).to.be.truthy;
    });
  });
});