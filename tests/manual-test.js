var Chai = require('chai');


var expect = Chai.expect;


describe('Manual', function () {
  describe('convert()', function () {
    this.slow(5000);

    beforeEach(function () {
      for (let step = 1; step <= 3; step++) {
        const manualPath = 'steps/step' + step + '.md';
        const manual = 'Step ' + step + ' manual';

        this.tortilla(['step', 'tag', '-m', 'dummy']);
        this.tortilla(['step', 'edit', step]);
        this.exec('bash', ['-c', 'echo "' + manual + '" > ' + manualPath]);
        this.git(['add', manualPath]);
        this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
        this.git(['rebase', '--continue']);
      }
    });

    it('should convert a specified manual file to production format', function () {
      this.tortilla(['manual', 'convert', '2']);

      const manual = this.exec('cat', ['steps/step2.md']);
      expect(manual).to.be.a.markdown('prod-manuals/steps/step2');
    });

    it('should convert a specified manual file to development format', function () {
      this.tortilla(['manual', 'convert', '2']);
      this.tortilla(['manual', 'convert', '2']);

      const manual = this.exec('cat', ['steps/step2.md']);
      expect(manual).to.be.a.markdown('dev-manuals/steps/step2');
    });

    it('should convert last manual by default if non is provided', function () {
      this.tortilla(['manual', 'convert']);

      const manual = this.exec('cat', ['steps/step3.md']);
      expect(manual).to.be.a.markdown('prod-manuals/steps/step3');
    });

    it('should convert all manual files through out history to production format', function () {
      const manualsPaths = [
        'README.md',
        'steps/step1.md',
        'steps/step2.md',
        'steps/step3.md'
      ];

      this.tortilla(['manual', 'convert', '--all']);

      manualsPaths.forEach((manualPath) => {
        const manual = this.exec('cat', [manualPath]);
        expect(manual).to.be.a.file('prod-manuals/' + manualPath);
      });
    });

    it('should align alternated manuals to production formats', function () {
      const manualsPaths = [
        'README.md',
        'steps/step1.md',
        'steps/step2.md',
        'steps/step3.md'
      ];

      this.tortilla(['manual', 'convert', '1']);
      this.tortilla(['manual', 'convert', '3']);
      this.tortilla(['manual', 'convert', '--all', '--prod']);

      manualsPaths.forEach((manualPath) => {
        const manual = this.exec('cat', [manualPath]);
        expect(manual).to.be.a.file('prod-manuals/' + manualPath);
      });
    });

    it('should convert all manual markdowns through out history to development format', function () {
      const manualsPaths = [
        'README.md',
        'steps/step1.md',
        'steps/step2.md',
        'steps/step3.md'
      ];

      this.tortilla(['manual', 'convert', '--all']);
      this.tortilla(['manual', 'convert', '--all']);

      manualsPaths.forEach((manualPath) => {
        const manual = this.exec('cat', [manualPath]);
        expect(manual).to.be.a.file('dev-manuals/' + manualPath);
      });
    });

    it('should align alternated manuals to development formats', function () {
      const manualsPaths = [
        'README.md',
        'steps/step1.md',
        'steps/step2.md',
        'steps/step3.md'
      ];

      this.tortilla(['manual', 'convert', '1']);
      this.tortilla(['manual', 'convert', '3']);
      this.tortilla(['manual', 'convert', '--all', '--dev']);

      manualsPaths.forEach((manualPath) => {
        const manual = this.exec('cat', [manualPath]);
        expect(manual).to.be.a.file('dev-manuals/' + manualPath);
      });
    });
  });
});