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

      const template = '{{{test_helper 123 "str" num=123 str="str"}}}'

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
});