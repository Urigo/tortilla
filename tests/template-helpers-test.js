const Chai = require('chai');
const Path = require('path');
const Renderer = require('../src/renderer');
const Translator = require('../src/translator');


const expect = Chai.expect;


describe('Template Helpers', function() {
  describe('diffStep', function() {
    this.slow(150);

    it('should render an added file', function () {
      this.applyTestPatch('add-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.1}}}');
      expect(view).to.be.a.file('add-file.md');
    });

    it('should render changes made in file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('change-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
      expect(view).to.be.a.file('change-file.md');
    });

    it('should render a deleted file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('delete-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
      expect(view).to.be.a.file('delete-file.md');
    });

    it('should render a renamed file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('rename-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
      expect(view).to.be.a.file('rename-file.md');
    });

    it('should render only the file matching the pattern', function () {
      this.applyTestPatch('add-multiple-files');

      const view = Renderer.renderTemplate('{{{diffStep 1.1 files="test-file.js"}}}');
      expect(view).to.be.a.file('add-multiple-files.md');
    });

    it('should render an error message if step not found', function () {
      this.applyTestPatch('add-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.3}}}');
      expect(view).to.be.a.file('step-not-found.md');
    });

    it('should reference commit if repo URL is defined in package.json', function () {
      this.applyTestPatch('add-file');

      const view = Renderer.renderTemplate('{{{diffStep 1.1}}}', {
        viewPath: 'dummy'
      });

      expect(view).to.be.a.file('referenced-diff.md');
    });

    it('should render step from the specified submodule', function () {
      this.slow(4000);

      const repoDir = this.createRepo();

      this.tortilla(['submodule', 'add', repoDir]);

      const view = Renderer.renderTemplate(`{{{diffStep 1.1 module="${Path.basename(repoDir)}"}}}`);

      expect(view).to.be.a.file('submodule-diff.md');
    });

    describe('render target set to Medium', function () {
      before(function () {
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      after(function () {
        delete process.env.TORTILLA_RENDER_TARGET;
      });

      it('should render an added file', function () {
        this.applyTestPatch('add-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.1}}}');
        expect(view).to.be.a.file('medium/add-file.md');
      });

      it('should render changes made in file', function () {
        this.applyTestPatch('add-file');
        this.applyTestPatch('change-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).to.be.a.file('medium/change-file.md');
      });

      it('should render only the file matching the pattern', function () {
        this.applyTestPatch('add-multiple-files');

        const view = Renderer.renderTemplate('{{{diffStep 1.1 files="test-file.js"}}}');
        expect(view).to.be.a.file('medium/add-multiple-files.md');
      });

      it('should render an error message if step not found', function () {
        this.applyTestPatch('add-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.3}}}');
        expect(view).to.be.a.file('medium/step-not-found.md');
      });

      it('it should escape expressions', function () {
        this.applyTestPatch('change-view');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).to.be.a.file('medium/escaped-diff.md');
      });
    });

    describe('translations', function () {
      before(function () {
        Translator.translator.changeLanguage('he');
      });

      beforeEach(function () {
        this.oldHEResource = Translator.getResourceBundle('he', 'translation');
      });

      afterEach(function () {
        Translator.addResourceBundle('he', 'translation', this.oldHEResource);
      });

      after(function () {
        Translator.translator.changeLanguage('en');
      });

      it('should render an added file', function () {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.1: 'הוספת קובץ'
          }
        });

        this.applyTestPatch('add-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.1}}}');

        expect(view).to.be.a.file('he/add-file.md');
      });

      it('should render changes made in file', function () {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.2: 'שינוי קובץ',
          }
        });

        this.applyTestPatch('add-file');
        this.applyTestPatch('change-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).to.be.a.file('he/change-file.md');
      });

      it('should render a deleted file', function () {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.2: 'מחיקת קובץ',
          }
        });

        this.applyTestPatch('add-file');
        this.applyTestPatch('delete-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).to.be.a.file('he/delete-file.md');
      });

      it('should render a renamed file', function () {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.2: 'שינוי שם קובץ',
          }
        });

        this.applyTestPatch('add-file');
        this.applyTestPatch('rename-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.2}}}');
        expect(view).to.be.a.file('he/rename-file.md');
      });

      it('should render only the file matching the pattern', function () {
        Translator.addResourceBundle('he', 'translation', {
          step: {
            1.1: 'הוספת מיספר קבצים',
          }
        });

        this.applyTestPatch('add-multiple-files');

        const view = Renderer.renderTemplate('{{{diffStep 1.1 files="test-file.js"}}}');
        expect(view).to.be.a.file('he/add-multiple-files.md');
      });

      it('should render an error message if step not found', function () {
        this.applyTestPatch('add-file');

        const view = Renderer.renderTemplate('{{{diffStep 1.3}}}');
        expect(view).to.be.a.file('he/step-not-found.md');
      });
    });
  });

  describe('navStep', function () {
    this.slow(1000);

    beforeEach(function () {
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
    });

    it('should render a button referencing to the first step when editing the root commit', function () {
      this.tortilla(['step', 'edit', '--root']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).to.be.a.file('begin-tutorial.md');
    });

    it('should render a button referencing to the second step when editing the first step', function () {
      this.tortilla(['step', 'edit', '1']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).to.be.a.file('next-step.md');
    });

    it('should render a button referencing to the previous step when editing the last step', function () {
      this.tortilla(['step', 'edit', '3']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).to.be.a.file('prev-step.md');
    });

    it('should render navigation buttons when editing a step in the middle of the stack', function () {
      this.tortilla(['step', 'edit', '2']);

      const view = Renderer.renderTemplate('{{{navStep}}}');
      expect(view).to.be.a.file('nav-steps.md');
    });

    it('should create navigation buttons with custom specified reference', function () {
      this.tortilla(['step', 'edit', '2']);

      const view = Renderer.renderTemplate('{{{navStep prevRef="http://test.com/prev/" nextRef="http://test.com/next/"}}}');
      expect(view).to.be.a.file('nav-steps-ref.md');
    });

    describe('render target set to Medium', function () {
      before(function () {
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      after(function () {
        delete process.env.TORTILLA_RENDER_TARGET;
      });

      it('should render a button referencing to the first step when editing the root commit', function () {
        this.tortilla(['step', 'edit', '--root']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).to.be.a.file('medium/begin-tutorial.md');
      });

      it('should render a button referencing to the second step when editing the first step', function () {
        this.tortilla(['step', 'edit', '1']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).to.be.a.file('medium/next-step.md');
      });

      it('should render a button referencing to the previous step when editing the last step', function () {
        this.tortilla(['step', 'edit', '3']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).to.be.a.file('medium/prev-step.md');
      });

      it('should render navigation buttons when editing a step in the middle of the stack', function () {
        this.tortilla(['step', 'edit', '2']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).to.be.a.file('medium/nav-steps.md');
      });

      it('should create navigation buttons with custom specified reference', function () {
        this.tortilla(['step', 'edit', '2']);

        const view = Renderer.renderTemplate('{{{navStep prevRef="http://test.com/prev/" nextRef="http://test.com/next/"}}}');
        expect(view).to.be.a.file('medium/nav-steps-ref.md');
      });
    });

    describe('translations', function () {
      before(function () {
        Translator.translator.changeLanguage('he');
      });

      beforeEach(function () {
        this.oldHEResource = Translator.getResourceBundle('he', 'translation');
      });

      afterEach(function () {
        Translator.addResourceBundle('he', 'translation', this.oldHEResource);
      });

      after(function () {
        Translator.translator.changeLanguage('en');
      });

      it('should render a button referencing to the first step when editing the root commit', function () {
        this.tortilla(['step', 'edit', '--root']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).to.be.a.file('he/begin-tutorial.md');
      });

      it('should render a button referencing to the second step when editing the first step', function () {
        this.tortilla(['step', 'edit', '1']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).to.be.a.file('he/next-step.md');
      });

      it('should render a button referencing to the previous step when editing the last step', function () {
        this.tortilla(['step', 'edit', '3']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).to.be.a.file('he/prev-step.md');
      });

      it('should render navigation buttons when editing a step in the middle of the stack', function () {
        this.tortilla(['step', 'edit', '2']);

        const view = Renderer.renderTemplate('{{{navStep}}}');
        expect(view).to.be.a.file('he/nav-steps.md');
      });

      it('should create navigation buttons with custom specified reference', function () {
        this.tortilla(['step', 'edit', '2']);

        const view = Renderer.renderTemplate('{{{navStep prevRef="http://test.com/prev/" nextRef="http://test.com/next/"}}}');
        expect(view).to.be.a.file('he/nav-steps-ref.md');
      });
    });
  });
});