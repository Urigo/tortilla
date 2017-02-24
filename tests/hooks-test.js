const Chai = require('chai');


const expect = Chai.expect;


describe('Hooks', function () {
  this.slow(2000);

  it('should disallow new commits to be added', function () {
    const commit = this.git.bind(this, [
      'commit', '--allow-empty', '--allow-empty-message'
    ], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    expect(commit).to.throw(Error);
  });

  it('should disallow amending', function () {
    const commit = this.git.bind(this, [
      'commit', '--amend', '--allow-empty', '--allow-empty-message'
    ], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
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
        GIT_EDITOR: true
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
        GIT_EDITOR: true
      }
    });

    this.exec('touch', ['README.md']);
    this.git(['add', 'README.md']);

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
    this.exec('touch', ['manuals/templates/step2.md']);
    this.git(['add', 'manuals/templates/step2.md']);

    expect(commit).to.throw(Error);
  });

  it('should disable pre-commit restrictions if strict mode is disabled', function () {
    this.tortilla(['strict', 'set', 'false']);

    const commit = this.git.bind(this, ['commit', '--allow-empty', '--allow-empty-message'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    expect(commit).to.not.throw(Error);
  });

  it('should disable pre-rebase restrictions if strict mode is disabled', function () {
    this.tortilla(['strict', 'set', 'false']);

    const rebase = this.git.bind(this, ['rebase', '-i', '--root'], {
      env: {
        TORTILLA_CHILD_PROCESS: '',
        GIT_SEQUENCE_EDITOR: true
      }
    });

    expect(rebase).to.not.throw(Error);
  });

  it('should allow amending during step editing', function () {
    const commit = this.git.bind(this, [
      'commit', '--amend', '--allow-empty', '--allow-empty-message'
    ], {
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
    this.exec('sh', ['-c', 'echo test > manuals/templates/step1.md.tmpl']);
    this.git(['add', 'manuals/templates/step1.md.tmpl']);

    expect(commit).to.not.throw(Error);
  });
});