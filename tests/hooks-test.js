const Chai = require('chai');


const expect = Chai.expect;


describe('Hooks', function () {
  this.slow(1000);

  it('should disallow new commits to be added', function () {
    const commit = this.git.bind(this, ['commit', '--allow-empty'], {
      TORTILLA_CHILD_PROCESS: false,
      GIT_SEQUENCE_EDITOR: true
    });

    expect(commit).to.throw(Error);
  });

  it('should disallow amending', function () {
    const commit = this.git.bind(this, ['commit', '--amend', '--allow-empty'], {
      TORTILLA_CHILD_PROCESS: false,
      GIT_SEQUENCE_EDITOR: true
    });

    expect(commit).to.throw(Error);
  });

  it('should disallow rebasing', function () {
    const rebase = this.git.bind(this, ['rebase', '-i', '--root'], {
      TORTILLA_CHILD_PROCESS: false,
      GIT_SEQUENCE_EDITOR: true
    });

    expect(rebase).to.throw(Error);
  });

  it('should disallow changes made in the steps dir', function () {
    const commit = this.git.bind(this, ['commit'], {
      TORTILLA_CHILD_PROCESS: false,
      GIT_SEQUENCE_EDITOR: true
    });

    this.exec('mkdir', ['steps']);
    this.exec('touch', ['steps/step0.md']);
    this.git(['add', 'steps/step0.md']);

    expect(commit).to.throw(Error);
  });

  it('should disallow changes made in README.md', function () {
    const commit = this.git.bind(this, ['commit'], {
      TORTILLA_CHILD_PROCESS: false,
      GIT_SEQUENCE_EDITOR: true
    });

    this.exec('rm', ['README.md']);
    this.git(['add', 'README.md']);

    expect(commit).to.throw(Error);
  });

  it('should disallow changes made in the inappropriate step manual file', function () {
    const commit = this.git.bind(this, ['commit', '--amend'], {
      TORTILLA_CHILD_PROCESS: false,
      GIT_EDITOR: true
    });

    this.npm(['run', 'step', '--', 'tag', '-m', 'dummy']);
    this.npm(['run', 'step', '--', 'edit', '1']);
    this.exec('touch', ['steps/step2.md']);
    this.git(['add', 'steps/step2.md']);

    expect(commit).to.throw(Error);
  });

  it('should allow amending during step editing', function () {
    const commit = this.git.bind(this, ['commit', '--amend', '--allow-empty'], {
      TORTILLA_CHILD_PROCESS: false,
      GIT_EDITOR: true
    });

    this.npm(['run', 'step', '--', 'edit', '--root']);

    expect(commit).to.not.throw(Error);
  });

  it('should allow changes made in the appropriate step manual file', function () {
    const commit = this.git.bind(this, ['commit', '--amend'], {
      TORTILLA_CHILD_PROCESS: false,
      GIT_EDITOR: true
    });

    this.npm(['run', 'step', '--', 'tag', '-m', 'dummy']);
    this.npm(['run', 'step', '--', 'edit', '1']);
    this.exec('sh', ['-c', 'echo test > steps/step1.md']);
    this.git(['add', 'steps/step1.md']);

    expect(commit).to.not.throw(Error);
  });
});