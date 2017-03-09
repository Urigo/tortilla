const Chai = require('chai');
const MDRenderer = require('../src/md-renderer');


const expect = Chai.expect;


describe('MDRenderer', function () {
  describe('renderTemplate()', function () {
    it('should wrap template helpers', function () {
      MDRenderer.registerHelper('test_helper', function (num, str, options) {
        return [
          this.fooModel + ' ' + num,
          this.barModel + ' ' + str,
          this.bazModel + ' ' + options.hash.num,
          this.quxModel + ' ' + options.hash.str
        ].join('\n');
      });

      const template = '{{{test_helper 123 "str" num=123 str="str"}}}';

      const view = MDRenderer.renderTemplate(template, {
        fooModel: 'foo',
        barModel: 'bar',
        bazModel: 'baz',
        quxModel: 'qux'
      });

      expect(view).to.equal([
        '[{]: <helper> (test_helper 123 "str" str="str" num=123)',
        'foo 123',
        'bar str',
        'baz 123',
        'qux str',
        '[}]: #'
      ].join('\n'));
    });

    it('should render template partials', function () {
      MDRenderer.registerPartial('test_partial', [
        '{{fooModel}}',
        '{{barModel}}',
        '{{bazModel}}'
      ].join('\n'));

      const view = MDRenderer.renderTemplate('{{>test_partial}}', {
        fooModel: 'foo',
        barModel: 'bar',
        bazModel: 'baz'
      });

      expect(view).to.equal([
        '[{]: <partial> (test_partial)',
        'foo',
        'bar',
        'baz',
        '[}]: #'
      ].join('\n'));
    });
  });

  describe('renderTemplateFile()', function () {
    it('should use user defined templates', function () {
      const templatePath = this.testDir + '/header.md.tmpl';
      this.exec('sh', ['-c', `echo "{{test}}" > ${templatePath}`]);

      const view = MDRenderer.renderTemplateFile(templatePath, { test: 'CUSTOM HEADER' });
      expect(view).to.equal('CUSTOM HEADER\n');
    });
  });

  describe('registerTransformation()', function () {
    it('should set a template helper transformation when set to a specific render target', function () {
      MDRenderer.registerHelper('test_helper', function (num, str, options) {
        return [
          this.fooModel + ' ' + num,
          this.barModel + ' ' + str,
          this.bazModel + ' ' + options.hash.num,
          this.quxModel + ' ' + options.hash.str
        ].join('\n');
      });

      MDRenderer.registerTransformation('test', 'test_helper', function (view) {
        return view.replace(/foo|bar|baz|qux/g, (match) => {
          switch (match) {
            case 'foo': return 'qux';
            case 'bar': return 'baz';
            case 'baz': return 'bar';
            case 'qux': return 'foo';
          }
        });
      });

      const template = '{{{test_helper 123 "str" num=123 str="str"}}}';

      this.scopeEnv(() => {
        const view = MDRenderer.renderTemplate(template, {
          fooModel: 'foo',
          barModel: 'bar',
          bazModel: 'baz',
          quxModel: 'qux'
        });

        expect(view).to.equal([
          '[{]: <helper> (test_helper 123 "str" str="str" num=123)',
          'qux 123',
          'baz str',
          'bar 123',
          'foo str',
          '[}]: #'
        ].join('\n'));
      }, {
        TORTILLA_RENDER_TARGET: 'test'
      });
    });
  });

  describe('resolve()', function () {
    it('should resolve path relatively to the current rendered view file path and git host', function () {
      MDRenderer.registerHelper('test_helper', function () {
        return MDRenderer.resolve('../templates/step1.md');
      });

      const view = MDRenderer.renderTemplate('{{{test_helper}}}', {
        view_path: 'manuals/views/step1.md'
      });

      expect(view).to.equal([
        '[{]: <helper> (test_helper)',
        'https://github.com/Urigo/tortilla/tree/master@0.0.0/manuals/templates/step1.md',
        '[}]: #'
      ].join('\n'));
    });
  });
});