import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';

let context: any = {};

describe('Hooks', () => {
  beforeAll(tortillaBeforeAll.bind(context));
  beforeEach(tortillaBeforeEach.bind(context));

  it('should disallow new commits to be added', async () => {
    const commit = context.git.bind(context, [
      'commit', '--allow-empty', '--allow-empty-message'
    ], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true,
      }
    });

    expect(commit).toThrowError('New commits are prohibited! Use `$ tortilla step push` instead');
  });

  it('should disallow amending', function () {
    const commit = context.git.bind(context, [
      'commit', '--amend', '--allow-empty', '--allow-empty-message'
    ], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    expect(commit).toThrowError('Changes are not allowed outside editing mode!');
  });

  it('should disallow rebasing', function () {
    const rebase = context.git.bind(context, ['rebase', '-i', '--root'], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_SEQUENCE_EDITOR: true
      }
    });

    expect(rebase).toThrowError('Rebase mode is prohibited! Use \'$ tortilla step edit\' instead');
  });

  it('should disallow changes made in the steps dir', function () {
    const commit = context.git.bind(context, ['commit'], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    context.exec('mkdir', ['steps']);
    context.exec('touch', ['steps/step0.md']);
    context.git(['add', 'steps/step0.md']);

    expect(commit).toThrowError('New commits are prohibited! Use `$ tortilla step push` instead');
  });

  it('should disallow changes made in README.md', function () {
    const commit = context.git.bind(context, ['commit'], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    context.exec('touch', ['README.md']);
    context.git(['add', 'README.md']);

    expect(commit).toThrowError('New commits are prohibited! Use `$ tortilla step push` instead');
  });

  it('should disallow changes made in the inappropriate step manual file', function () {
    const commit = context.git.bind(context, ['commit', '--amend'], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    context.tortilla(['step', 'tag', '-m', 'dummy']);
    context.tortilla(['step', 'edit', '1']);
    context.exec('touch', ['.tortilla/manuals/templates/step2.md']);
    context.git(['add', '.tortilla/manuals/templates/step2.md']);

    expect(commit).toThrowError('Staged files must be one of');
  });

  it('should disable pre-commit restrictions if strict mode is disabled', function () {
    context.tortilla(['strict', 'set', 'false']);

    const commit = context.git.bind(context, ['commit', '--allow-empty', '--allow-empty-message'], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    expect(commit).not.toThrow();
  });

  it('should disable pre-rebase restrictions if strict mode is disabled', function () {
    context.tortilla(['strict', 'set', 'false']);

    const rebase = context.git.bind(context, ['rebase', '-i', '--root'], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_SEQUENCE_EDITOR: true
      }
    });

    expect(rebase).not.toThrow();
  });

  it('should allow amending during step editing', function () {
    context.tortilla(['step', 'edit', '--root']);

    const commit = context.git.bind(context, [
      'commit', '--amend', '--allow-empty', '--allow-empty-message'
    ], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    expect(commit).not.toThrow();
  });

  it('should allow changes made in the appropriate step manual file', function () {
    const commit = context.git.bind(context, ['commit', '--amend'], {
      env: {
        ...process.env,
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    context.tortilla(['step', 'tag', '-m', 'dummy']);
    context.tortilla(['step', 'edit', '1']);
    context.exec('sh', ['-c', 'echo test > .tortilla/manuals/templates/step1.tmpl']);
    context.git(['add', '.tortilla/manuals/templates/step1.tmpl']);

    expect(commit).not.toThrow();
  });
});
