var Chai = require('chai');


var expect = Chai.expect;


describe('Manual', function () {
  describe('render()', function () {
    this.slow(5000);

    beforeEach(function () {
      for (let step = 1; step <= 3; step++) {
        const manualPath = '.tortilla/manuals/templates/step' + step + '.tmpl';
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

      const manual = this.exec('cat', ['.tortilla/manuals/views/step2.md']);
      expect(manual).to.be.a.file('manuals/step2.md');
    });

    it('should render last manual by default if non is provided', function () {
      this.tortilla(['manual', 'render']);

      const manual = this.exec('cat', ['.tortilla/manuals/views/step3.md']);
      expect(manual).to.be.a.file('manuals/step3.md');
    });

    it('should render root manual if specified and create a symlink to it', function () {
      this.tortilla(['manual', 'render', '--root']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.file('manuals/root.md');

      manual = this.exec('cat', ['.tortilla/manuals/views/root.md']);
      expect(manual).to.be.a.file('manuals/root.md');
    });

    it('should not create a symlink to root manual if already exists', function () {
      this.slow(7000);

      this.tortilla(['manual', 'render', '--root']);
      this.tortilla(['manual', 'render', '--root']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.file('manuals/root.md');

      manual = this.exec('cat', ['.tortilla/manuals/views/root.md']);
      expect(manual).to.be.a.file('manuals/root.md');
    });

    it('should render all manual files through out history', function () {
      this.tortilla(['manual', 'render', '--all']);

      let manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.file('manuals/root.md');

      manual = this.exec('cat', ['.tortilla/manuals/views/step1.md']);
      expect(manual).to.be.a.file('manuals/step1.md');

      manual = this.exec('cat', ['.tortilla/manuals/views/step2.md']);
      expect(manual).to.be.a.file('manuals/step2.md');

      manual = this.exec('cat', ['.tortilla/manuals/views/step3.md']);
      expect(manual).to.be.a.file('manuals/step3.md');
    });

    describe('render target set to Medium', function () {
      before(function () {
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      after(function () {
        delete process.env.TORTILLA_RENDER_TARGET;
      });

      it('should render a specified manual file to production format', function () {
        this.tortilla(['manual', 'render', '2']);

        const manual = this.exec('cat', ['.tortilla/manuals/views/medium/step2.md']);
        expect(manual).to.be.a.file('manuals/medium/step2.md');
      });

      it('should render last manual by default if non is provided', function () {
        this.tortilla(['manual', 'render']);

        const manual = this.exec('cat', ['.tortilla/manuals/views/medium/step3.md']);
        expect(manual).to.be.a.file('manuals/medium/step3.md');
      });

      it('should render root manual if specified', function () {
        this.tortilla(['manual', 'render', '--root']);

        const manual = this.exec('cat', ['.tortilla/manuals/views/medium/root.md']);
        expect(manual).to.be.a.file('manuals/medium/root.md');
      });

      it('should render all manual files through out history', function () {
        this.tortilla(['manual', 'render', '--all']);

        let manual = this.exec('cat', ['.tortilla/manuals/views/medium/root.md']);
        expect(manual).to.be.a.file('manuals/medium/root.md');

        manual = this.exec('cat', ['.tortilla/manuals/views/medium/step1.md']);
        expect(manual).to.be.a.file('manuals/medium/step1.md');

        manual = this.exec('cat', ['.tortilla/manuals/views/medium/step2.md']);
        expect(manual).to.be.a.file('manuals/medium/step2.md');

        manual = this.exec('cat', ['.tortilla/manuals/views/medium/step3.md']);
        expect(manual).to.be.a.file('manuals/medium/step3.md');
      });
    });

    describe('translation', function () {
      beforeEach(function () {
        this.tortilla(['step', 'edit', '--root']);

        var heLocale = JSON.stringify({
          step: {
            'root': 'פרוייקט ניסיוני של טורטייה',
            '1': 'דמה',
            '2': 'דמה',
            '3': 'דמה'
          }
        }).replace(/"/g, '\\"');

        this.exec('mkdir', ['.tortilla/locales']);
        this.exec('bash', ['-c', 'echo ' + heLocale + ' > .tortilla/locales/he.json']);
        this.exec('mkdir', ['.tortilla/manuals/templates/locales']);
        this.exec('mkdir', ['.tortilla/manuals/templates/locales/he']);
        this.exec('bash', ['-c', 'echo "המדריך של הצעד הראשי" > .tortilla/manuals/templates/locales/he/root.tmpl']);

        this.git(['add', '.']);
        this.git(['commit', '--amend'], {
          env: {
            GIT_EDITOR: true
          }
        });

        this.git(['rebase', '--continue']);

        for (let step = 1; step <= 3; step++) {
          const manualPath = '.tortilla/manuals/templates/locales/he/step' + step + '.tmpl';
          const manual = 'המדריך של צעד ' + step;

          this.tortilla(['step', 'edit', step]);
          this.exec('bash', ['-c', 'echo "' + manual + '" > ' + manualPath]);
          this.git(['add', manualPath]);
          this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
          this.git(['rebase', '--continue']);
        }
      });

      it('should translate specified manual', function () {
        this.tortilla(['manual', 'render', '2']);

        const manual = this.exec('cat', ['.tortilla/manuals/views/locales/he/step2.md']);
        expect(manual).to.be.a.file('manuals/he/step2.md');
      });

      it('should translate all manuals', function () {
        this.tortilla(['manual', 'render', '--all']);

        let manual = this.exec('cat', ['.tortilla/manuals/views/locales/he/root.md']);
        expect(manual).to.be.a.file('manuals/he/root.md');

        manual = this.exec('cat', ['.tortilla/manuals/views/locales/he/step1.md']);
        expect(manual).to.be.a.file('manuals/he/step1.md');

        manual = this.exec('cat', ['.tortilla/manuals/views/locales/he/step2.md']);
        expect(manual).to.be.a.file('manuals/he/step2.md');

        manual = this.exec('cat', ['.tortilla/manuals/views/locales/he/step3.md']);
        expect(manual).to.be.a.file('manuals/he/step3.md');
      });

      describe('render target is set to Medium', function () {
        before(function () {
          process.env.TORTILLA_RENDER_TARGET = 'medium';
        });

        after(function () {
          delete process.env.TORTILLA_RENDER_TARGET;
        });

        it('should translate manuals whose render target is set to Medium', function () {
          this.tortilla(['manual', 'render', '--all']);

          let manual = this.exec('cat', ['.tortilla/manuals/views/medium/locales/he/root.md']);
          expect(manual).to.be.a.file('manuals/medium/he/root.md');

          manual = this.exec('cat', ['.tortilla/manuals/views/medium/locales/he/step1.md']);
          expect(manual).to.be.a.file('manuals/medium/he/step1.md');

          manual = this.exec('cat', ['.tortilla/manuals/views/medium/locales/he/step2.md']);
          expect(manual).to.be.a.file('manuals/medium/he/step2.md');

          manual = this.exec('cat', ['.tortilla/manuals/views/medium/locales/he/step3.md']);
          expect(manual).to.be.a.file('manuals/medium/he/step3.md');
        });
      });
    });
  });
});