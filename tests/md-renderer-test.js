const Chai = require('chai');
const MDRenderer = require('../src/md-renderer');


const expect = Chai.expect;


describe('MDRenderer', function () {
  describe('renderTemplate()', function () {
    this.slow(10);

    it('should render a template with model notations', function () {
      const template = [
        '{{fooModel}}',
        '{{barModel}}',
        '{{bazModel}}'
      ].join('\n');

      const view = MDRenderer.renderTemplate(template, {
        fooModel: 'foo',
        barModel: 'bar',
        bazModel: 'baz'
      });

      expect(view).to.equal([
        'foo',
        'bar',
        'baz'
      ].join('\n'));
    });

    it('should render helpers', function () {
      MDRenderer.registerHelper('test_helper', function (param1, param2, param3) {
        return [
          this.fooModel + ' ' + param1,
          this.barModel + ' ' + param2,
          this.bazModel + ' ' + param3
        ].join('\n');
      });

      const template = '{{{test_helper fooParam barParam bazParam}}}'

      const view = MDRenderer.renderTemplate(template, {
        fooModel: 'foo',
        barModel: 'bar',
        bazModel: 'baz'
      });

      expect(view).to.equal([
        '[{]: <helper> (test_helper fooParam barParam bazParam)',
        'foo fooParam',
        'bar barParam',
        'baz bazParam',
        '[}]: #'
      ].join('\n'));
    });

    it('should not render templates returned by helpers', function () {
      MDRenderer.registerHelper('test_helper', function (param1, param2, param3) {
        return [
          '{{fooModel}} ' + param1,
          '{{barModel}} ' + param2,
          '{{bazModel}} ' + param3
        ].join('\n');
      });

      const template = '{{{test_helper fooParam barParam bazParam}}}'

      const view = MDRenderer.renderTemplate(template, {
        fooModel: 'foo',
        barModel: 'bar',
        bazModel: 'baz'
      });

      expect(view).to.equal([
        '[{]: <helper> (test_helper fooParam barParam bazParam)',
        '{{fooModel}} fooParam',
        '{{barModel}} barParam',
        '{{bazModel}} bazParam',
        '[}]: #'
      ].join('\n'));
    });

    it('should render a template with partial notations', function () {
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
});