import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';
import './custom-matchers';

let context: any = {};

describe('Manual', () => {
  beforeAll(tortillaBeforeAll.bind(context));
  beforeEach(tortillaBeforeEach.bind(context));

  beforeEach(function() {
    for (let step = 1; step <= 3; step++) {
      const manualPath = '.tortilla/manuals/templates/step' + step + '.tmpl';
      const manual = 'Step ' + step + ' manual';

      context.tortilla(['step', 'tag', '-m', 'dummy']);
      context.tortilla(['step', 'edit', step]);
      context.exec('bash', ['-c', 'echo "' + manual + '" > ' + manualPath]);
      context.git(['add', manualPath]);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
    }
  });

  it('should render a specified manual file to production format', function() {
    context.tortilla(['manual', 'render', '2']);

    const manual = context.exec('cat', ['.tortilla/manuals/views/step2.md']);
    expect(manual).toContainSameContentAsFile('manuals/step2.md');
  });

  it('should render last manual by default if non is provided', function() {
    context.tortilla(['manual', 'render']);

    const manual = context.exec('cat', ['.tortilla/manuals/views/step3.md']);
    expect(manual).toContainSameContentAsFile('manuals/step3.md');
  });

  it('should render root manual if specified and create a symlink to it', function() {
    context.tortilla(['manual', 'render', '--root']);

    let manual = context.exec('cat', ['README.md']);
    expect(manual).toContainSameContentAsFile('manuals/root.md');

    manual = context.exec('cat', ['.tortilla/manuals/views/root.md']);
    expect(manual).toContainSameContentAsFile('manuals/root.md');
  });

  it('should not create a symlink to root manual if already exists', function() {
    context.tortilla(['manual', 'render', '--root']);
    context.tortilla(['manual', 'render', '--root']);

    let manual = context.exec('cat', ['README.md']);
    expect(manual).toContainSameContentAsFile('manuals/root.md');

    manual = context.exec('cat', ['.tortilla/manuals/views/root.md']);
    expect(manual).toContainSameContentAsFile('manuals/root.md');
  });

  it('should render all manual files through out history', function() {
    context.tortilla(['manual', 'render', '--all']);

    let manual = context.exec('cat', ['README.md']);
    expect(manual).toContainSameContentAsFile('manuals/root.md');

    manual = context.exec('cat', ['.tortilla/manuals/views/step1.md']);
    expect(manual).toContainSameContentAsFile('manuals/step1.md');

    manual = context.exec('cat', ['.tortilla/manuals/views/step2.md']);
    expect(manual).toContainSameContentAsFile('manuals/step2.md');

    manual = context.exec('cat', ['.tortilla/manuals/views/step3.md']);
    expect(manual).toContainSameContentAsFile('manuals/step3.md');
  });

  describe('render target set to Medium', function() {
    beforeAll(function() {
      process.env.TORTILLA_RENDER_TARGET = 'medium';
    });

    afterAll(function() {
      delete process.env.TORTILLA_RENDER_TARGET;
    });

    it('should render a specified manual file to production format', function() {
      context.tortilla(['manual', 'render', '2']);

      const manual = context.exec('cat', ['.tortilla/manuals/views/medium/step2.md']);
      expect(manual).toContainSameContentAsFile('manuals/medium/step2.md');
    });

    it('should render last manual by default if non is provided', function() {
      context.tortilla(['manual', 'render']);

      const manual = context.exec('cat', ['.tortilla/manuals/views/medium/step3.md']);
      expect(manual).toContainSameContentAsFile('manuals/medium/step3.md');
    });

    it('should render root manual if specified', function() {
      context.tortilla(['manual', 'render', '--root']);

      const manual = context.exec('cat', ['.tortilla/manuals/views/medium/root.md']);
      expect(manual).toContainSameContentAsFile('manuals/medium/root.md');
    });

    it('should render all manual files through out history', function() {
      context.tortilla(['manual', 'render', '--all']);

      let manual = context.exec('cat', ['.tortilla/manuals/views/medium/root.md']);
      expect(manual).toContainSameContentAsFile('manuals/medium/root.md');

      manual = context.exec('cat', ['.tortilla/manuals/views/medium/step1.md']);
      expect(manual).toContainSameContentAsFile('manuals/medium/step1.md');

      manual = context.exec('cat', ['.tortilla/manuals/views/medium/step2.md']);
      expect(manual).toContainSameContentAsFile('manuals/medium/step2.md');

      manual = context.exec('cat', ['.tortilla/manuals/views/medium/step3.md']);
      expect(manual).toContainSameContentAsFile('manuals/medium/step3.md');
    });
  });

  describe('translation', function() {
    beforeEach(function() {
      context.tortilla(['step', 'edit', '--root']);

      const heLocale = JSON.stringify({
        step: {
          root: 'פרוייקט ניסיוני של טורטייה',
          '1': 'דמה',
          '2': 'דמה',
          '3': 'דמה'
        }
      }).replace(/"/g, '\\"');

      context.exec('mkdir', ['.tortilla/locales']);
      context.exec('bash', ['-c', `echo ${heLocale} > .tortilla/locales/he.json`]);
      context.exec('mkdir', ['.tortilla/manuals/templates/locales']);
      context.exec('mkdir', ['.tortilla/manuals/templates/locales/he']);
      context.exec('bash', ['-c', 'echo "המדריך של הצעד הראשי" > .tortilla/manuals/templates/locales/he/root.tmpl']);

      context.git(['add', '.']);
      context.git(['commit', '--amend'], {
        env: {
          GIT_EDITOR: true
        }
      });

      context.git(['rebase', '--continue']);

      for (let step = 1; step <= 3; step++) {
        const manualPath = '.tortilla/manuals/templates/locales/he/step' + step + '.tmpl';
        const manual = 'המדריך של צעד ' + step;

        context.tortilla(['step', 'edit', step]);
        context.exec('bash', ['-c', `echo "${manual}" > ${manualPath}`]);
        context.git(['add', manualPath]);
        context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
        context.git(['rebase', '--continue']);
      }
    });

    it('should translate specified manual', function() {
      context.tortilla(['manual', 'render', '2']);

      const manual = context.exec('cat', ['.tortilla/manuals/views/locales/he/step2.md']);
      expect(manual).toContainSameContentAsFile('manuals/he/step2.md');
    });

    it('should translate all manuals', function() {
      context.tortilla(['manual', 'render', '--all']);

      let manual = context.exec('cat', ['.tortilla/manuals/views/locales/he/root.md']);
      expect(manual).toContainSameContentAsFile('manuals/he/root.md');

      manual = context.exec('cat', ['.tortilla/manuals/views/locales/he/step1.md']);
      expect(manual).toContainSameContentAsFile('manuals/he/step1.md');

      manual = context.exec('cat', ['.tortilla/manuals/views/locales/he/step2.md']);
      expect(manual).toContainSameContentAsFile('manuals/he/step2.md');

      manual = context.exec('cat', ['.tortilla/manuals/views/locales/he/step3.md']);
      expect(manual).toContainSameContentAsFile('manuals/he/step3.md');
    });

    describe('render target is set to Medium', function() {
      beforeAll(function() {
        process.env.TORTILLA_RENDER_TARGET = 'medium';
      });

      afterAll(function() {
        delete process.env.TORTILLA_RENDER_TARGET;
      });

      it('should translate manuals whose render target is set to Medium', function() {
        context.tortilla(['manual', 'render', '--all']);

        let manual = context.exec('cat', ['.tortilla/manuals/views/medium/locales/he/root.md']);
        expect(manual).toContainSameContentAsFile('manuals/medium/he/root.md');

        manual = context.exec('cat', ['.tortilla/manuals/views/medium/locales/he/step1.md']);
        expect(manual).toContainSameContentAsFile('manuals/medium/he/step1.md');

        manual = context.exec('cat', ['.tortilla/manuals/views/medium/locales/he/step2.md']);
        expect(manual).toContainSameContentAsFile('manuals/medium/he/step2.md');

        manual = context.exec('cat', ['.tortilla/manuals/views/medium/locales/he/step3.md']);
        expect(manual).toContainSameContentAsFile('manuals/medium/he/step3.md');
      });
    });
  });

  it('should render table of contents', () => {
    console.log(context.cwd());
    console.log(context.exec('ls', ['-lah']));

    context.tortilla(['step', 'edit', '--root']);

    context.exec('bash', ['-c', 'echo "{{{ toc }}}" >> .tortilla/manuals/templates/root.tmpl']);
    context.git(['add', '.']);
    context.git(['commit', '--amend', '--no-edit']);
    context.git(['rebase', '--continue']);

    context.exec('touch', ['test-file.js']);

    context.exec('bash', ['-c', 'echo "// 1" >> test-file.js']);
    context.git(['add', '.']);
    context.tortilla(['step', 'push', '-m', 'Add First Comment']);

    context.exec('bash', ['-c', 'echo "// 2" >> test-file.js']);
    context.git(['add', '.']);
    context.tortilla(['step', 'push', '-m', 'Add Second Comment']);

    context.exec('bash', ['-c', 'echo "// 3" >> test-file.js']);
    context.git(['add', '.']);
    context.tortilla(['step', 'push', '-m', 'Add Third Comment']);

    context.exec('bash', ['-c', 'echo "// 4" >> test-file.js']);
    context.git(['add', '.']);
    context.tortilla(['step', 'push', '-m', 'Add Fourth Comment']);

    context.tortilla(['step', 'tag', '-m', 'Add Comments']);

    context.tortilla(['manual', 'render', '--all']);

    const manual = context.exec('cat', ['README.md']);

    expect(manual).toMatchSnapshot('toc-render');
  });
});
