const Chai = require('chai');
const MDRenderer = require('../src/md-renderer');


const expect = Chai.expect;


describe('Template Helpers', function() {
  describe('diff_step', function() {
    this.slow(150);

    it('should render an added file', function () {
      this.applyTestPatch('add-file');

      const view = MDRenderer.renderTemplate('{{{diff_step 1.1}}}');
      expect(view).to.be.a.file('add-file.md');
    });

    it('should render changes made in file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('change-file');

      const view = MDRenderer.renderTemplate('{{{diff_step 1.2}}}');
      expect(view).to.be.a.file('change-file.md');
    });

    it('should render a deleted file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('delete-file');

      const view = MDRenderer.renderTemplate('{{{diff_step 1.2}}}');
      expect(view).to.be.a.file('delete-file.md');
    });

    it('should render a renamed file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('rename-file');

      const view = MDRenderer.renderTemplate('{{{diff_step 1.2}}}');
      expect(view).to.be.a.file('rename-file.md');
    });

    it('should render only the file matching the pattern', function () {
      this.applyTestPatch('add-multiple-files');

      const view = MDRenderer.renderTemplate('{{{diff_step 1.1 files="test-file.js"}}}');
      expect(view).to.be.a.file('add-multiple-files.md');
    });

    it('should render an error message if step not found', function () {
      this.applyTestPatch('add-file');

      const view = MDRenderer.renderTemplate('{{{diff_step 1.3}}}');
      expect(view).to.be.a.file('step-not-found.md');
    });

    describe('render target set to Medium', function () {
      before(function () {
        this.oldRenderTarget = process.env.TORTILLA_RENDER_TARGET;
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      after(function () {
        process.env.TORTILLA_RENDER_TARGET = this.oldRenderTarget;
      });

      it('should render an added file', function () {
        this.applyTestPatch('add-file');

        const view = MDRenderer.renderTemplate('{{{diff_step 1.1}}}');
        expect(view).to.be.a.file('medium/add-file.md');
      });

      it('should render changes made in file', function () {
        this.applyTestPatch('add-file');
        this.applyTestPatch('change-file');

        const view = MDRenderer.renderTemplate('{{{diff_step 1.2}}}');
        expect(view).to.be.a.file('medium/change-file.md');
      });

      it('should not render a deleted file', function () {
        this.applyTestPatch('add-file');
        this.applyTestPatch('delete-file');

        const view = MDRenderer.renderTemplate('{{{diff_step 1.2}}}');
        expect(view).to.be.a.file('medium/delete-file.md');
      });

      it('should render only the file matching the pattern', function () {
        this.applyTestPatch('add-multiple-files');

        const view = MDRenderer.renderTemplate('{{{diff_step 1.1 files="test-file.js"}}}');
        expect(view).to.be.a.file('medium/add-multiple-files.md');
      });

      it('should render an error message if step not found', function () {
        this.applyTestPatch('add-file');

        const view = MDRenderer.renderTemplate('{{{diff_step 1.3}}}');
        expect(view).to.be.a.file('medium/step-not-found.md');
      });

      it('it should escape expressions', function () {
        this.applyTestPatch('change-view');

        const view = MDRenderer.renderTemplate('{{{diff_step 1.2}}}');
        expect(view).to.be.a.file('medium/escaped-diff.md');
      });
    });
  });

  describe('nav_step', function () {
    this.slow(1000);

    beforeEach(function () {
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
    });

    it('should render a button referencing to the first step when editing the root commit', function () {
      this.tortilla(['step', 'edit', '--root']);

      const view = MDRenderer.renderTemplate('{{{nav_step}}}');
      expect(view).to.be.a.file('begin-tutorial.md');
    });

    it('should render a button referencing to the second step when editing the first step', function () {
      this.tortilla(['step', 'edit', '1']);

      const view = MDRenderer.renderTemplate('{{{nav_step}}}');
      expect(view).to.be.a.file('next-step.md');
    });

    it('should render a button referencing to the previous step when editing the last step', function () {
      this.tortilla(['step', 'edit', '3']);

      const view = MDRenderer.renderTemplate('{{{nav_step}}}');
      expect(view).to.be.a.file('prev-step.md');
    });

    it('should render navigation buttons when editing a step in the middle of the stack', function () {
      this.tortilla(['step', 'edit', '2']);

      const view = MDRenderer.renderTemplate('{{{nav_step}}}');
      expect(view).to.be.a.file('nav-steps.md');
    });

    it('should create navigation buttons with custom specified reference', function () {
      this.tortilla(['step', 'edit', '2']);

      const view = MDRenderer.renderTemplate('{{{nav_step prev_ref="http://test.com/prev/" next_ref="http://test.com/next/"}}}');
      expect(view).to.be.a.file('nav-steps-ref.md');
    });

    describe('render target set to Medium', function () {
      before(function () {
        this.oldRenderTarget = process.env.TORTILLA_RENDER_TARGET;
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      after(function () {
        process.env.TORTILLA_RENDER_TARGET = this.oldRenderTarget;
      });

      it('should render a button referencing to the first step when editing the root commit', function () {
        this.tortilla(['step', 'edit', '--root']);

        const view = MDRenderer.renderTemplate('{{{nav_step}}}');
        expect(view).to.be.a.file('medium/begin-tutorial.md');
      });

      it('should render a button referencing to the second step when editing the first step', function () {
        this.tortilla(['step', 'edit', '1']);

        const view = MDRenderer.renderTemplate('{{{nav_step}}}');
        expect(view).to.be.a.file('medium/next-step.md');
      });

      it('should render a button referencing to the previous step when editing the last step', function () {
        this.tortilla(['step', 'edit', '3']);

        const view = MDRenderer.renderTemplate('{{{nav_step}}}');
        expect(view).to.be.a.file('medium/prev-step.md');
      });

      it('should render navigation buttons when editing a step in the middle of the stack', function () {
        this.tortilla(['step', 'edit', '2']);

        const view = MDRenderer.renderTemplate('{{{nav_step}}}');
        expect(view).to.be.a.file('medium/nav-steps.md');
      });

      it('should create navigation buttons with custom specified reference', function () {
        this.tortilla(['step', 'edit', '2']);

        const view = MDRenderer.renderTemplate('{{{nav_step prev_ref="http://test.com/prev/" next_ref="http://test.com/next/"}}}');
        expect(view).to.be.a.file('medium/nav-steps-ref.md');
      });
    });
  });
});