import * as Fs from 'fs-extra';
import * as Tmp from 'tmp';
import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';

let context: any = {};

describe('Git', () => {
  beforeAll(tortillaBeforeAll.bind(context));
  beforeEach(tortillaBeforeEach.bind(context));

  beforeAll(() => {
    context.hostRepo = Tmp.dirSync({ unsafeCleanup: true }).name;
    context.localRepo = Tmp.dirSync({ unsafeCleanup: true }).name;
  });

  beforeEach(() => {
    context.createRepo(context.hostRepo, context.localRepo);
  });

  describe('pushTutorial()', () => {
    it('should push tutorial based on specified branch and all related git-refs', () => {
      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-history'], { cwd: context.localRepo });
      }).toThrowError();

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-root'], { cwd: context.localRepo });
      }).toThrowError();

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-step1'], { cwd: context.localRepo });
      }).toThrowError();

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master@next'], { cwd: context.localRepo });
      }).toThrowError();

      context.tortilla(['step', 'tag', '-m', 'Chapter I'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['release', 'bump', 'next', '-m', 'Test Release'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['push', 'origin', 'master'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });

      Fs.removeSync(context.localRepo);

      context.git(['clone', context.hostRepo, context.localRepo]);

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-history'], { cwd: context.localRepo });
      }).not.toThrowError();

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-root'], { cwd: context.localRepo });
      }).not.toThrowError();

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-step1'], { cwd: context.localRepo });
      }).not.toThrowError();

      expect(() => {
        context.git(['rev-parse', 'master@next'], { cwd: context.localRepo });
      }).not.toThrowError();
    });

    it('should push deleted refs', () => {
      context.tortilla(['step', 'tag', '-m', 'Chapter I'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['release', 'bump', 'major', '-m', 'Test Release I'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['push', 'origin', 'master'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });

      context.tortilla(['step', 'tag', '-m', 'Chapter II'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['release', 'bump', 'major', '-m', 'Test Release II'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['push', 'origin', 'master'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });

      Fs.removeSync(context.localRepo);
      context.git(['clone', context.hostRepo, context.localRepo]);
      context.tortilla(['init'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-history'], { cwd: context.localRepo });
      }).not.toThrowError();

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-root'], { cwd: context.localRepo });
      }).not.toThrowError();

      expect(() => {
        context.git(['rev-parse', 'remotes/origin/master-step1'], { cwd: context.localRepo });
      }).not.toThrowError();

      expect(() => {
        context.git(['rev-parse', 'master@2.0.0'], { cwd: context.localRepo });
      }).not.toThrowError();

      context.tortilla(['release', 'revert'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['push', 'origin', 'master'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });

      Fs.removeSync(context.localRepo);
      context.git(['clone', context.hostRepo, context.localRepo]);

      expect(() => {
        context.git(['rev-parse', 'master@2.0.0'], { cwd: context.localRepo });
      }).toThrowError();
    });
  });

  describe('pullTutorial()', () => {
    it('should pull tutorial based on specified branch and all related git-refs', () => {
      const localRepo = Tmp.dirSync({ unsafeCleanup: true }).name;

      context.git(['clone', context.hostRepo, localRepo]);
      context.tortilla(['init'], { cwd: localRepo, env: { TORTILLA_CWD: localRepo } });

      context.tortilla(['step', 'tag', '-m', 'Chapter I'], { cwd: localRepo, env: { TORTILLA_CWD: localRepo } });
      context.tortilla(['release', 'bump', 'next', '-m', 'Test Release'], { cwd: localRepo, env: { TORTILLA_CWD: localRepo } });

      context.tortilla(['step', 'tag', '-m', 'Chapter I'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['release', 'bump', 'next', '-m', 'Test Release'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });
      context.tortilla(['push', 'origin', 'master'], { cwd: context.localRepo, env: { TORTILLA_CWD: context.localRepo } });

      expect(
        context.git(['rev-parse', 'master-history'], { cwd: localRepo })
      ).not.toEqual(
        context.git(['rev-parse', 'master-history'], { cwd: context.localRepo })
      );

      expect(
        context.git(['rev-parse', 'master-root'], { cwd: localRepo })
      ).not.toEqual(
        context.git(['rev-parse', 'master-root'], { cwd: context.localRepo })
      );

      expect(
        context.git(['rev-parse', 'master-step1'], { cwd: localRepo })
      ).not.toEqual(
        context.git(['rev-parse', 'master-step1'], { cwd: context.localRepo })
      );

      expect(
        context.git(['rev-parse', 'master@next^{}'], { cwd: localRepo })
      ).not.toEqual(
        context.git(['rev-parse', 'master@next^{}'], { cwd: context.localRepo })
      );

      context.tortilla(['pull', 'origin', 'master'], { cwd: localRepo, env: { TORTILLA_CWD: localRepo } });

      expect(
        context.git(['rev-parse', 'master-history'], { cwd: localRepo })
      ).toEqual(
        context.git(['rev-parse', 'master-history'], { cwd: context.localRepo })
      );

      expect(
        context.git(['rev-parse', 'master-root'], { cwd: localRepo })
      ).toEqual(
        context.git(['rev-parse', 'master-root'], { cwd: context.localRepo })
      );

      expect(
        context.git(['rev-parse', 'master-step1'], { cwd: localRepo })
      ).toEqual(
        context.git(['rev-parse', 'master-step1'], { cwd: context.localRepo })
      );

      expect(
        context.git(['rev-parse', 'master@next^{}'], { cwd: localRepo })
      ).toEqual(
        context.git(['rev-parse', 'master@next^{}'], { cwd: context.localRepo })
      );
    });
  });

  describe('tutorialStatus()', () => {
    it('should show step being edited', () => {
      Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
      context.git(['add', 'foo']);
      context.tortilla(['step', 'push', '-m', 'foo']);

      Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
      context.git(['add', 'bar']);
      context.tortilla(['step', 'push', '-m', 'bar']);

      Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
      context.git(['add', 'baz']);
      context.tortilla(['step', 'push', '-m', 'baz']);

      context.tortilla(['step', 'edit', '1.2']);

      expect(
        context.tortilla(['status'])
      ).toMatch(
        /Editing 1\.2$/
      );
    });

    it('should show conflicting steps', () => {
      Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
      context.git(['add', 'foo']);
      context.tortilla(['step', 'push', '-m', 'foo']);

      Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
      context.git(['add', 'bar']);
      context.tortilla(['step', 'push', '-m', 'bar']);

      Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
      context.git(['add', 'baz']);
      context.tortilla(['step', 'push', '-m', 'baz']);

      context.tortilla(['step', 'edit', '1.2']);
      Fs.writeFileSync(`${context.cwd()}/baz`, 'bazooka');
      context.tortilla(['add', 'baz']);
      context.tortilla(['step', 'push', '-m', 'baz']);

      try {
        context.git(['rebase', '--continue']);
      }
      catch (e) {
        // Error is expected
      }

      expect(
        context.tortilla(['status'])
      ).toMatch(
        /Solving conflict between 1\.2 and 1\.3$/
      );
    });

    it('should print root', () => {
      Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
      context.git(['add', 'foo']);
      context.tortilla(['step', 'push', '-m', 'foo']);

      Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
      context.git(['add', 'bar']);
      context.tortilla(['step', 'push', '-m', 'bar']);

      Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
      context.git(['add', 'baz']);
      context.tortilla(['step', 'push', '-m', 'baz']);

      context.tortilla(['step', 'edit', '--root']);

      expect(
        context.tortilla(['status'])
      ).toMatch(
        /Editing root$/
      );
    });

    describe('branching out', () => {
      test('REBEASE_HEAD behind of HEAD', () => {
        Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
        context.git(['add', 'foo']);
        context.tortilla(['step', 'push', '-m', 'foo']);

        Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
        context.git(['add', 'bar']);
        context.tortilla(['step', 'push', '-m', 'bar']);

        Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
        context.git(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        context.tortilla(['step', 'edit', '1.2']);
        context.tortilla(['step', 'pop']);

        expect(
          context.tortilla(['status'])
        ).toMatch(
          /Branched out from 1\.2 to 1\.1$/
        );
      });

      test('REBEASE_HEAD ahead of HEAD', () => {
        Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
        context.git(['add', 'foo']);
        context.tortilla(['step', 'push', '-m', 'foo']);

        Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
        context.git(['add', 'bar']);
        context.tortilla(['step', 'push', '-m', 'bar']);

        Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
        context.git(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        context.tortilla(['step', 'edit', '1.2']);
        Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
        context.git(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        expect(
          context.tortilla(['status'])
        ).toMatch(
          /Branched out from 1\.2 to 1\.3$/
        );
      });

      test('REBEASE_HEAD parallel to HEAD', () => {
        Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
        context.git(['add', 'foo']);
        context.tortilla(['step', 'push', '-m', 'foo']);

        Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
        context.git(['add', 'bar']);
        context.tortilla(['step', 'push', '-m', 'bar']);

        Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
        context.git(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        context.tortilla(['step', 'edit', '1.2']);
        context.tortilla(['step', 'pop']);
        Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
        context.git(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        expect(
          context.tortilla(['status'])
        ).toMatch(
          /Branched out from 1\.2 to 1\.2$/
        );
      });
    });

    describe('instruct', () => {
      test('edit', () => {
        Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
        context.git(['add', 'foo']);
        context.tortilla(['step', 'push', '-m', 'foo']);

        Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
        context.git(['add', 'bar']);
        context.tortilla(['step', 'push', '-m', 'bar']);

        Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
        context.git(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        context.tortilla(['step', 'edit', '1.2']);

        expect(context.tortilla(['status', '-i'])).toContain(context.freeText(`
          To edit the current step, stage your changes and amend them:

              $ git add xxx
              $ git commit --amend

          Feel free to push or pop steps:

              $ tortilla step push/pop

          Once you finish, continue the rebase and Tortilla will take care of the rest:

              $ git rebase --continue

          You can go back to re-edit previous steps at any point, but be noted that this will discard all your changes thus far:

              $ tortilla step back

          If for some reason, at any point you decide to quit, use the comand:

              $ git rebase --abort
        `))
      });

      test('edit (branch out)', () => {
        Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
        context.git(['add', 'foo']);
        context.tortilla(['step', 'push', '-m', 'foo']);

        Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
        context.git(['add', 'bar']);
        context.tortilla(['step', 'push', '-m', 'bar']);

        Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
        context.git(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        context.tortilla(['step', 'edit', '1.2']);
        context.tortilla(['step', 'pop']);

        expect(context.tortilla(['status', '-i'])).toContain(context.freeText(`
          To edit the current step, stage your changes and amend them:

              $ git add xxx
              $ git commit --amend

          Feel free to push or pop steps:

              $ tortilla step push/pop

          Once you finish, continue the rebase and Tortilla will take care of the rest:

              $ git rebase --continue

          You can go back to re-edit previous steps at any point, but be noted that this will discard all your changes thus far:

              $ tortilla step back

          If for some reason, at any point you decide to quit, use the comand:

              $ git rebase --abort
        `))
      });

      test('conflict', () => {
        Fs.writeFileSync(`${context.cwd()}/foo`, 'foo');
        context.git(['add', 'foo']);
        context.tortilla(['step', 'push', '-m', 'foo']);

        Fs.writeFileSync(`${context.cwd()}/bar`, 'bar');
        context.git(['add', 'bar']);
        context.tortilla(['step', 'push', '-m', 'bar']);

        Fs.writeFileSync(`${context.cwd()}/baz`, 'baz');
        context.git(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        context.tortilla(['step', 'edit', '1.2']);
        Fs.writeFileSync(`${context.cwd()}/baz`, 'bazooka');
        context.tortilla(['add', 'baz']);
        context.tortilla(['step', 'push', '-m', 'baz']);

        try {
          context.git(['rebase', '--continue']);
        }
        catch (e) {
          // Error is expected
        }

        expect(context.tortilla(['status', '-i'])).toContain(context.freeText(`
          Once you solved the conflict, stage your changes and continue the rebase.
          DO NOT amend your changes, push or pop steps:

              $ git add xxx
              $ git rebase --continue

          You can go back to re-edit previous steps at any point, but be noted that this will discard all your changes thus far:

              $ tortilla step back

          If for some reason, at any point you decide to quit, use the comand:

              $ git rebase --abort
        `))
      });
    });
  });
});
