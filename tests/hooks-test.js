const Chai = require('chai');


const expect = Chai.expect;


describe('Hooks', function () {
  this.slow(1000);

  it('should disallow new commits to be added', function () {
    const commit = this.git.bind(this, ['commit', '--allow-empty'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_SEQUENCE_EDITOR: true
      }
    });

    expect(commit).to.throw(Error);
  });

  it('should disallow amending', function () {
    const commit = this.git.bind(this, ['commit', '--amend', '--allow-empty'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_SEQUENCE_EDITOR: true
      }
    });

    expect(commit).to.throw(Error);
  });

  it('should disallow rebasing', function () {
    const rebase = this.git.bind(this, ['rebase', '-i', '--root'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_SEQUENCE_EDITOR: true
      }
    });

    expect(rebase).to.throw(Error);
  });

  it('should disallow changes made in the steps dir', function () {
    const commit = this.git.bind(this, ['commit'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_SEQUENCE_EDITOR: true
      }
    });

    this.exec('mkdir', ['steps']);
    this.exec('touch', ['steps/step0.md']);
    this.git(['add', 'steps/step0.md']);

    expect(commit).to.throw(Error);
  });

  it('should disallow changes made in README.md', function () {
    const commit = this.git.bind(this, ['commit'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_SEQUENCE_EDITOR: true
      }
    });

    this.exec('rm', ['manuals/README.md']);
    this.git(['add', 'manuals/README.md']);

    expect(commit).to.throw(Error);
  });

  it('should disallow changes made in the inappropriate step manual file', function () {
    const commit = this.git.bind(this, ['commit', '--amend'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    this.tortilla(['step', 'tag', '-m', 'dummy']);
    this.tortilla(['step', 'edit', '1']);
    this.exec('touch', ['manuals/steps/step2.md']);
    this.git(['add', 'manuals/steps/step2.md']);

    expect(commit).to.throw(Error);
  });

  it('should allow amending during step editing', function () {
    const commit = this.git.bind(this, ['commit', '--amend', '--allow-empty'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    this.tortilla(['step', 'edit', '--root']);

    expect(commit).to.not.throw(Error);
  });

  it('should allow changes made in the appropriate step manual file', function () {
    const commit = this.git.bind(this, ['commit', '--amend'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    this.tortilla(['step', 'tag', '-m', 'dummy']);
    this.tortilla(['step', 'edit', '1']);
    this.exec('sh', ['-c', 'echo test > manuals/steps/step1.md']);
    this.git(['add', 'manuals/steps/step1.md']);

    expect(commit).to.not.throw(Error);
  });
});