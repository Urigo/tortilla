const Chai = require('chai');


const expect = Chai.expect;


describe('Template Helpers', function() {
  describe('diff_step', function() {
    this.slow(150);

    it('should render an added file', function () {
      this.git.apply('add-file');

      const view = this.handlebars.compile('{{{diff_step 1.1}}}')();
      expect(view).to.be.a.markdown('add-file');
    });

    it('should render changes made in file', function () {
      this.git.apply('add-file');
      this.git.apply('change-file');

      const view = this.handlebars.compile('{{{diff_step 1.2}}}')();
      expect(view).to.be.a.markdown('change-file');
    });

    it('should render a deleted file', function () {
      this.git.apply('add-file');
      this.git.apply('delete-file');

      const view = this.handlebars.compile('{{{diff_step 1.2}}}')();
      expect(view).to.be.a.markdown('delete-file');
    });

    it('should render a renamed file', function () {
      this.git.apply('add-file');
      this.git.apply('rename-file');

      const view = this.handlebars.compile('{{{diff_step 1.2}}}')();
      expect(view).to.be.a.markdown('rename-file');
    });

    it('should render an error message if step not found', function () {
      this.git.apply('add-file');

      const view = this.handlebars.compile('{{{diff_step 1.3}}}')();
      expect(view).to.be.a.markdown('step-not-found');
    });
  });

  describe('nav_step', function () {
    this.slow(500);

    beforeEach(function () {
      this.npm.step(['tag', '-m', 'dummy']);
      this.npm.step(['tag', '-m', 'dummy']);
      this.npm.step(['tag', '-m', 'dummy']);
    });

    it('should render a button referencing to the first step when editing the root commit', function () {
      this.npm.step(['edit', '--root']);

      const view = this.handlebars.compile('{{{nav_step}}}')();
      expect(view).to.be.a.markdown('begin-tutorial');
    });

    it('should render a button referencing to the second step when editing the first step', function () {
      this.npm.step(['edit', '1']);

      const view = this.handlebars.compile('{{{nav_step}}}')();
      expect(view).to.be.a.markdown('next-step');
    });

    it('should render a button referencing to the previous step when editing the last step', function () {
      this.npm.step(['edit', '3']);

      const view = this.handlebars.compile('{{{nav_step}}}')();
      expect(view).to.be.a.markdown('prev-step');
    });

    it('should render navigation buttons when editing a step in the middle of the stack', function () {
      this.npm.step(['edit', '2']);

      const view = this.handlebars.compile('{{{nav_step}}}')();
      expect(view).to.be.a.markdown('nav-steps');
    });
  });
});