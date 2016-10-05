const Chai = require('chai');


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

      const view = this.mdRenderer.renderTemplate(template, {
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

    it('should render a template with helper notations', function () {
      this.mdRenderer.registerHelper('test_helper', function (param1, param2, param3) {
        return [
          this.fooModel + ' ' + param1,
          this.barModel + ' ' + param2,
          this.bazModel + ' ' + param3
        ].join('\n');
      });

      const template = '{{{test_helper fooParam barParam bazParam}}}'

      const view = this.mdRenderer.renderTemplate(template, {
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

    it('should render a template with partial notations', function () {
      this.mdRenderer.registerPartial('test_partial', [
        '{{fooModel}}',
        '{{barModel}}',
        '{{bazModel}}'
      ].join('\n'));

      const view = this.mdRenderer.renderTemplate('{{>test_partial}}', {
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