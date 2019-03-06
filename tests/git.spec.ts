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
  });
});
