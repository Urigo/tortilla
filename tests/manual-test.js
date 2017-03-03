var Chai = require('chai');


var expect = Chai.expect;


describe('Manual', function () {
  describe('render()', function () {
    this.slow(5000);

    beforeEach(function () {
      for (let step = 1; step <= 3; step++) {
        const manualPath = 'manuals/templates/step' + step + '.md.tmpl';
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

      const manual = this.exec('cat', ['manuals/views/step2.md']);
      expect(manual).to.be.a.file('manuals/step2.md');
    });

    it('should render last manual by default if non is provided', function () {
      this.tortilla(['manual', 'render']);

      const manual = this.exec('cat', ['manuals/views/step3.md']);
      expect(manual).to.be.a.file('manuals/step3.md');
    });

    it('should render root manual if specified and create a symlink to it', function () {
      this.tortilla(['manual', 'render', '--root']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.file('manuals/root.md');

      manual = this.exec('cat', ['manuals/views/root.md']);
      expect(manual).to.be.a.file('manuals/root.md');
    });

    it('should not create a symlink to root manual if already exists', function () {
      this.slow(7000);

      this.tortilla(['manual', 'render', '--root']);
      this.tortilla(['manual', 'render', '--root']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.file('manuals/root.md');

      manual = this.exec('cat', ['manuals/views/root.md']);
      expect(manual).to.be.a.file('manuals/root.md');
    });

    it('should render all manual files through out history', function () {
      this.tortilla(['manual', 'render', '--all']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.file('manuals/root.md');

      manual = this.exec('cat', ['manuals/views/step1.md']);
      expect(manual).to.be.a.file('manuals/step1.md');

      manual = this.exec('cat', ['manuals/views/step2.md']);
      expect(manual).to.be.a.file('manuals/step2.md');

      manual = this.exec('cat', ['manuals/views/step3.md']);
      expect(manual).to.be.a.file('manuals/step3.md');
    });

    describe('render target set to Medium', function () {
      before(function () {
        this.oldRenderTarget = process.env.TORTILLA_RENDER_TARGET;
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      after(function () {
        process.env.TORTILLA_RENDER_TARGET = this.oldRenderTarget;
      });

      it('should render a specified manual file to production format', function () {
        this.tortilla(['manual', 'render', '2']);

        const manual = this.exec('cat', ['manuals/views/medium/step2.md']);
        expect(manual).to.be.a.file('manuals/medium/step2.md');
      });

      it('should render last manual by default if non is provided', function () {
        this.tortilla(['manual', 'render']);

        const manual = this.exec('cat', ['manuals/views/medium/step3.md']);
        expect(manual).to.be.a.file('manuals/medium/step3.md');
      });

      it('should render root manual if specified', function () {
        this.tortilla(['manual', 'render', '--root']);

        const manual = this.exec('cat', ['manuals/views/medium/root.md']);
        expect(manual).to.be.a.file('manuals/medium/root.md');
      });

      it('should render all manual files through out history', function () {
        this.tortilla(['manual', 'render', '--all']);

        let manual = this.exec('cat', ['manuals/views/medium/root.md']);
        expect(manual).to.be.a.file('manuals/medium/root.md');

        manual = this.exec('cat', ['manuals/views/medium/step1.md']);
        expect(manual).to.be.a.file('manuals/medium/step1.md');

        manual = this.exec('cat', ['manuals/views/medium/step2.md']);
        expect(manual).to.be.a.file('manuals/medium/step2.md');

        manual = this.exec('cat', ['manuals/views/medium/step3.md']);
        expect(manual).to.be.a.file('manuals/medium/step3.md');
      });
    });
  });
});