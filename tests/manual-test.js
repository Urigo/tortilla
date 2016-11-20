var Chai = require('chai');


var expect = Chai.expect;


describe('Manual', function () {
  describe('render()', function () {
    this.slow(5000);

    beforeEach(function () {
      for (let step = 1; step <= 3; step++) {
        const manualPath = 'manuals/src/step' + step + '.md';
        const manual = 'Step ' + step + ' manual';

        this.tortilla(['step', 'tag', '-m', 'dummy']);
        this.tortilla(['step', 'edit', step]);
        this.exec('bash', ['-c', 'echo "' + manual + '" > ' + manualPath]);
        this.git(['add', manualPath]);
        this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
        this.git(['rebase', '--continue']);
      }
    });

    it('should render a specified manual file to production format', function () {
      this.tortilla(['manual', 'render', '2']);

      const manual = this.exec('cat', ['manuals/dist/step2.md']);
      expect(manual).to.be.a.markdown('manuals/dist/step2');
    });

    it('should render last manual by default if non is provided', function () {
      this.tortilla(['manual', 'render']);

      const manual = this.exec('cat', ['manuals/dist/step3.md']);
      expect(manual).to.be.a.markdown('manuals/dist/step3');
    });

    it('should render root manual if specified and create a symlink to it', function () {
      this.tortilla(['manual', 'render', '--root']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.markdown('manuals/README');

      manual = this.exec('cat', ['manuals/dist/root.md']);
      expect(manual).to.be.a.markdown('manuals/README');
    });

    it('should not create a symlink to root manual if already exists', function () {
      this.tortilla(['manual', 'render', '--root']);
      this.tortilla(['manual', 'render', '--root']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.markdown('manuals/README');

      manual = this.exec('cat', ['manuals/dist/root.md']);
      expect(manual).to.be.a.markdown('manuals/README');
    });

    it('should render all manual files through out history', function () {
      this.tortilla(['manual', 'render', '--all']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.file('manuals/README.md');

      manual = this.exec('cat', ['manuals/dist/step1.md']);
      expect(manual).to.be.a.file('manuals/dist/step1.md');

      manual = this.exec('cat', ['manuals/dist/step2.md']);
      expect(manual).to.be.a.file('manuals/dist/step2.md');

      manual = this.exec('cat', ['manuals/dist/step3.md']);
      expect(manual).to.be.a.file('manuals/dist/step3.md');
    });
  });
});