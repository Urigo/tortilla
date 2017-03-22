const Chai = require('chai');
const Renderer = require('../src/renderer');


const expect = Chai.expect;


describe('Renderer', function () {
  describe.only('renderTemplate()', function () {
    it('should wrap template helpers', function () {
      Renderer.registerHelper('testHelper', function (num, str, options) {
        return [
          this.fooModel + ' ' + num,
          this.barModel + ' ' + str,
          this.bazModel + ' ' + options.hash.num,
          this.quxModel + ' ' + options.hash.str
        ].join('\n');
      }, {
        mdWrap: true
      });

      const template = '{{{testHelper 123 "str" num=123 str="str"}}}';

      const view = Renderer.renderTemplate(template, {
        fooModel: 'foo',
        barModel: 'bar',
        bazModel: 'baz',
        quxModel: 'qux'
      });

      expect(view).to.equal([
        '[{]: <helper> (testHelper 123 "str" str="str" num=123)',
        '',
        'foo 123',
        'bar str',
        'baz 123',
        'qux str',
        '',
        '[}]: #'
      ].join('\n'));
    });

    it('should render template partials', function () {
      Renderer.registerPartial('test_partial', [
        '{{fooModel}}',
        '{{barModel}}',
        '{{bazModel}}'
      ].join('\n'), {
        mdWrap: true
      });

      const view = Renderer.renderTemplate('{{>test_partial}}', {
        fooModel: 'foo',
        barModel: 'bar',
        bazModel: 'baz'
      });

      expect(view).to.equal([
        '[{]: <partial> (test_partial)',
        '',
        'foo',
        'bar',
        'baz',
        '',
        '[}]: #'
      ].join('\n'));
    });
  });

  describe('renderTemplateFile()', function () {
    it('should use user defined templates', function () {
      const templatePath = this.testDir + '/header.tmpl';
      this.exec('sh', ['-c', `echo "{{test}}" > ${templatePath}`]);

      const view = Renderer.renderTemplateFile(templatePath, { test: 'CUSTOM HEADER' });
      expect(view).to.equal('CUSTOM HEADER\n');
    });
  });

  describe('registerTransformation()', function () {
    it('should set a template helper transformation when set to a specific render target', function () {
      Renderer.registerHelper('testHelper', function (num, str, options) {
        return [
          this.fooModel + ' ' + num,
          this.barModel + ' ' + str,
          this.bazModel + ' ' + options.hash.num,
          this.quxModel + ' ' + options.hash.str
        ].join('\n');
      });

      Renderer.registerTransformation('test', 'testHelper', function (view) {
        return view.replace(/foo|bar|baz|qux/g, (match) => {
          switch (match) {
            case 'foo': return 'qux';
            case 'bar': return 'baz';
            case 'baz': return 'bar';
            case 'qux': return 'foo';
          }
        });
      });

      const template = '{{{testHelper 123 "str" num=123 str="str"}}}';

      this.scopeEnv(() => {
        const view = Renderer.renderTemplate(template, {
          fooModel: 'foo',
          barModel: 'bar',
          bazModel: 'baz',
          quxModel: 'qux'
        });

        expect(view).to.equal([
          'qux 123',
          'baz str',
          'bar 123',
          'foo str'
        ].join('\n'));
      }, {
        TORTILLA_RENDER_TARGET: 'test'
      });
    });
  });

  describe('resolve()', function () {
    it('should resolve path relatively to the current rendered view file path and git host', function () {
      Renderer.registerHelper('testHelper', function () {
        return Renderer.resolve('../templates/step1.md');
      });

      const view = Renderer.renderTemplate('{{{testHelper}}}', {
        viewPath: '.tortilla/manuals/views/step1.md'
      });

      expect(view).to.equal([
        'https://github.com/Urigo/tortilla/tree/master@0.0.0/.tortilla/manuals/templates/step1.md'
      ].join('\n'));
    });
  });
});