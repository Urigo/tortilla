const Chai = require('chai');
const MDRenderer = require('../src/md-renderer');


const expect = Chai.expect;


describe('Template Helpers', function() {
  describe('diff_step', function() {
    this.slow(150);

    it('should render an added file', function () {
      this.applyTestPatch('add-file');

      const view = MDRenderer.renderTemplate('{{{ diff_step 1.1 }}}');
      expect(view).to.be.a.markdown('add-file');
    });

    it('should render changes made in file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('change-file');

      const view = MDRenderer.renderTemplate('{{{ diff_step 1.2 }}}');
      expect(view).to.be.a.markdown('change-file');
    });

    it('should render a deleted file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('delete-file');

      const view = MDRenderer.renderTemplate('{{{ diff_step 1.2 }}}');
      expect(view).to.be.a.markdown('delete-file');
    });

    it('should render a renamed file', function () {
      this.applyTestPatch('add-file');
      this.applyTestPatch('rename-file');

      const view = MDRenderer.renderTemplate('{{{ diff_step 1.2 }}}');
      expect(view).to.be.a.markdown('rename-file');
    });

    it('should render only the file matching the pattern', function () {
      this.applyTestPatch('add-multiple-files');

      const view = MDRenderer.renderTemplate('{{{ diff_step 1.1 files="test-file.js" }}}');
      expect(view).to.be.a.markdown('add-multiple-files');
    });

    it('should render an error message if step not found', function () {
      this.applyTestPatch('add-file');

      const view = MDRenderer.renderTemplate('{{{ diff_step 1.3 }}}');
      expect(view).to.be.a.markdown('step-not-found');
    });
  });

  describe('nav_step', function () {
    this.slow(500);

    beforeEach(function () {
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
    });

    it('should render a button referencing to the first step when editing the root commit', function () {
      this.tortilla(['step', 'edit', '--root']);

      const view = MDRenderer.renderTemplate('{{{ nav_step }}}');
      expect(view).to.be.a.markdown('begin-tutorial');
    });

    it('should render a button referencing to the second step when editing the first step', function () {
      this.tortilla(['step', 'edit', '1']);

      const view = MDRenderer.renderTemplate('{{{ nav_step }}}');
      expect(view).to.be.a.markdown('next-step');
    });

    it('should render a button referencing to the previous step when editing the last step', function () {
      this.tortilla(['step', 'edit', '3']);

      const view = MDRenderer.renderTemplate('{{{ nav_step }}}');
      expect(view).to.be.a.markdown('prev-step');
    });

    it('should render navigation buttons when editing a step in the middle of the stack', function () {
      this.tortilla(['step', 'edit', '2']);

      const view = MDRenderer.renderTemplate('{{{ nav_step }}}');
      expect(view).to.be.a.markdown('nav-steps');
    });

    it('should create navigation buttons with custom specified reference', function () {
      this.tortilla(['step', 'edit', '2']);

      const view = MDRenderer.renderTemplate('{{{ nav_step prev_ref="http://test.com/prev/" next_ref="http://test.com/next/" }}}');
      expect(view).to.be.a.markdown('nav-steps-ref');
    });
  });
});