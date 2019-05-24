import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';
import './custom-matchers';
import * as Fs from 'fs-extra';
import * as Path from 'path';
import { Renderer } from '../src/renderer';
import { Translator } from '../src/translator';

const Pack = require('../package.json');

let context: any = {};

describe('Template Helpers', () => {
  beforeAll(tortillaBeforeAll.bind(context));
  beforeEach(tortillaBeforeEach.bind(context));

  describe('diffStep', function() {
    it('should render an added file', function() {
      context.applyTestPatch('add-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.1}}}');
      expect(view).toContainSameContentAsFile('add-file.md');
    });

    it('should escape file path with __pattern__', function() {
      context.applyTestPatch('add-private-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.1}}}');
      expect(view).toContainSameContentAsFile('add-private-file.md');
    });

    it('should render changes made in file', function() {
      context.applyTestPatch('add-file');
      context.applyTestPatch('change-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
      expect(view).toContainSameContentAsFile('change-file.md');
    });

    it('should render a deleted file', function() {
      context.applyTestPatch('add-file');
      context.applyTestPatch('delete-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
      expect(view).toContainSameContentAsFile('delete-file.md');
    });

    it('should render a renamed file', function() {
      context.applyTestPatch('add-file');
      context.applyTestPatch('rename-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
      expect(view).toContainSameContentAsFile('rename-file.md');
    });

    it('should render root diff', function() {
      const view = Renderer.renderTemplate('{{{diffStep "root"}}}');
      expect(view).toContainSameContentAsFile('root.md');
    });

    it('should render only the file matching the pattern', function() {
      context.applyTestPatch('add-multiple-files');

      const view = Renderer.renderTemplate('{{{diffStep 1.1 files="test-file.js"}}}');
      expect(view).toContainSameContentAsFile('add-multiple-files.md');
    });

    it('should render an error message if step not found', function() {
      context.applyTestPatch('add-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.3}}}');
      expect(view).toContainSameContentAsFile('step-not-found.md');
    });

    it('should reference commit if repo URL is defined in package.json', function() {
      context.applyTestPatch('add-file');

      const packPath = context.exec('realpath', ['package.json']);
      const pack = Fs.readJsonSync(packPath);

      pack.repository = Pack.repository;
      Fs.writeFileSync(packPath, JSON.stringify(pack));

      const view = Renderer.renderTemplate('{{{diffStep 1.1}}}', {
        viewPath: 'dummy'
      });

      expect(view).toContainSameContentAsFile('referenced-diff.md');
    });

    it('should render step from the specified submodule', function() {
      const repoDir = context.createRepo();

      context.tortilla(['submodule', 'add', Path.basename(repoDir), repoDir]);

      const view = Renderer.renderTemplate(`{{{diffStep 1.1 module="${Path.basename(repoDir)}"}}}`);

      expect(view).toContainSameContentAsFile('submodule-diff.md');
    });

    it('should not render title if specified not to', function() {
      context.applyTestPatch('add-file');
      context.applyTestPatch('change-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.2 noTitle=true}}}');
      expect(view).toContainSameContentAsFile('change-file-notitle.md');
    });

    describe('render target set to Medium', function() {
      beforeAll(function() {
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      afterAll(function() {
        delete process.env.TORTILLA_RENDER_TARGET;
      });

      it('should render an added file', function() {
        context.applyTestPatch('add-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.1}}}');
        expect(view).toContainSameContentAsFile('medium/add-file.md');
      });

      it('should render changes made in file', function() {
        context.applyTestPatch('add-file');
        context.applyTestPatch('change-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).toContainSameContentAsFile('medium/change-file.md');
      });

      it('should render only the file matching the pattern', function() {
        context.applyTestPatch('add-multiple-files');

        const view = Renderer.renderTemplate('{{{diffStep 1.1 files="test-file.js"}}}');
        expect(view).toContainSameContentAsFile('medium/add-multiple-files.md');
      });

      it('should render an error message if step not found', function() {
        context.applyTestPatch('add-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.3}}}');
        expect(view).toContainSameContentAsFile('medium/step-not-found.md');
      });

      it('it should escape expressions', function() {
        context.applyTestPatch('change-view');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).toContainSameContentAsFile('medium/escaped-diff.md');
      });
    });

    describe('translations', function() {
      beforeAll(function() {
        Translator.translator.changeLanguage('he');
      });

      beforeEach(function() {
        context.oldHEResource = Translator.getResourceBundle('he', 'translation');
      });

      afterEach(function() {
        Translator.addResourceBundle('he', 'translation', context.oldHEResource);
      });

      afterAll(function() {
        Translator.translator.changeLanguage('en');
      });

      it('should render an added file', function() {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.1: 'הוספת קובץ'
          }
        });

        context.applyTestPatch('add-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.1}}}');

        expect(view).toContainSameContentAsFile('he/add-file.md');
      });

      it('should render changes made in file', function() {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.2: 'שינוי קובץ'
          }
        });

        context.applyTestPatch('add-file');
        context.applyTestPatch('change-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).toContainSameContentAsFile('he/change-file.md');
      });

      it('should render a deleted file', function() {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.2: 'מחיקת קובץ'
          }
        });

        context.applyTestPatch('add-file');
        context.applyTestPatch('delete-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).toContainSameContentAsFile('he/delete-file.md');
      });

      it('should render a renamed file', function() {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.2: 'שינוי שם קובץ'
          }
        });

        context.applyTestPatch('add-file');
        context.applyTestPatch('rename-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).toContainSameContentAsFile('he/rename-file.md');
      });

      it('should render only the file matching the pattern', function() {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.1: 'הוספת מיספר קבצים'
          }
        });

        context.applyTestPatch('add-multiple-files');

        const view = Renderer.renderTemplate('{{{diffStep 1.1 files="test-file.js"}}}');
        expect(view).toContainSameContentAsFile('he/add-multiple-files.md');
      });

      it('should render an error message if step not found', function() {
        context.applyTestPatch('add-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.3}}}');
        expect(view).toContainSameContentAsFile('he/step-not-found.md');
      });
    });
  });

  describe('navStep', function() {
    beforeEach(function() {
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'tag', '-m', 'dummy']);
    });

    it('should render a button referencing to the first step when editing the root commit', function() {
      context.tortilla(['step', 'edit', '--root']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).toContainSameContentAsFile('begin-tutorial.md');
    });

    it('should render a button referencing to the second step when editing the first step', function() {
      context.tortilla(['step', 'edit', '1']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).toContainSameContentAsFile('next-step.md');
    });

    it('should render a button referencing to the previous step when editing the last step', function() {
      context.tortilla(['step', 'edit', '3']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).toContainSameContentAsFile('prev-step.md');
    });

    it('should render navigation buttons when editing a step in the middle of the stack', function() {
      context.tortilla(['step', 'edit', '2']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).toContainSameContentAsFile('nav-steps.md');
    });

    it('should create navigation buttons with custom specified reference', function() {
      context.tortilla(['step', 'edit', '2']);

      const view = Renderer.renderTemplate('{{{navStep prevRef="http://test.com/prev/" nextRef="http://test.com/next/"}}}');
      expect(view).toContainSameContentAsFile('nav-steps-ref.md');
    });

    it('should create a single button referencing the README.md file', function() {
      context.tortilla(['step', 'pop']);
      context.tortilla(['step', 'pop']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).toContainSameContentAsFile('prev-root.md');
    });

    describe('render target set to Medium', function() {
      beforeAll(function() {
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      afterAll(function() {
        delete process.env.TORTILLA_RENDER_TARGET;
      });

      it('should render a button referencing to the first step when editing the root commit', function() {
        context.tortilla(['step', 'edit', '--root']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('medium/begin-tutorial.md');
      });

      it('should render a button referencing to the second step when editing the first step', function() {
        context.tortilla(['step', 'edit', '1']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('medium/next-step.md');
      });

      it('should render a button referencing to the previous step when editing the last step', function() {
        context.tortilla(['step', 'edit', '3']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('medium/prev-step.md');
      });

      it('should render navigation buttons when editing a step in the middle of the stack', function() {
        context.tortilla(['step', 'edit', '2']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('medium/nav-steps.md');
      });

      it('should create navigation buttons with custom specified reference', function() {
        context.tortilla(['step', 'edit', '2']);

        const view = Renderer.renderTemplate('{{{navStep prevRef="http://test.com/prev/" nextRef="http://test.com/next/"}}}');
        expect(view).toContainSameContentAsFile('medium/nav-steps-ref.md');
      });

      it('should create a single button referencing the README.md file', function() {
        context.tortilla(['step', 'pop']);
        context.tortilla(['step', 'pop']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('medium/prev-root.md');
      });
    });

    describe('translations', function() {
      beforeAll(function() {
        Translator.translator.changeLanguage('he');
      });

      beforeEach(function() {
        context.oldHEResource = Translator.getResourceBundle('he', 'translation');
      });

      afterEach(function() {
        Translator.addResourceBundle('he', 'translation', context.oldHEResource);
      });

      afterAll(function() {
        Translator.translator.changeLanguage('en');
      });

      it('should render a button referencing to the first step when editing the root commit', function() {
        context.tortilla(['step', 'edit', '--root']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('he/begin-tutorial.md');
      });

      it('should render a button referencing to the second step when editing the first step', function() {
        context.tortilla(['step', 'edit', '1']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('he/next-step.md');
      });

      it('should render a button referencing to the previous step when editing the last step', function() {
        context.tortilla(['step', 'edit', '3']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('he/prev-step.md');
      });

      it('should render navigation buttons when editing a step in the middle of the stack', function() {
        context.tortilla(['step', 'edit', '2']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('he/nav-steps.md');
      });

      it('should create navigation buttons with custom specified reference', function() {
        context.tortilla(['step', 'edit', '2']);

        const view = Renderer.renderTemplate('{{{navStep prevRef="http://test.com/prev/" nextRef="http://test.com/next/"}}}');
        expect(view).toContainSameContentAsFile('he/nav-steps-ref.md');
      });

      it('should create a single button referencing the README.md file', function() {
        context.tortilla(['step', 'pop']);
        context.tortilla(['step', 'pop']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).toContainSameContentAsFile('he/prev-root.md');
      });
    });
  });
});
