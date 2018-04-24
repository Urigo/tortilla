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
        TORTILLA_CHILD_PROCESS: '',
        GIT_EDITOR: true
      }
    });

    expect(commit).toThrowError('New commits are prohibited! Use `$ tortilla step push` instead');
  });
});
