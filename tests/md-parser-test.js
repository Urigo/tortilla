const Chai = require('chai');
const MDParser = require('../md-parser');


const expect = Chai.expect;


describe('MDParser', function () {
  describe('parse()', function () {
    this.slow(10);

    it('should parse markdown chunks in series', function () {
      const md = this.readTestData('in', 'chunks-series.md');
      const chunks = MDParser.parse(md);

      expect(chunks[0].type).to.equal('footype');
      expect(chunks[0].name).to.equal('fooname');
      expect(chunks[0].params).to.deep.equal(['fooparam1', 'fooparam2', 'fooparam3']);
      expect(chunks[0].content).to.equal('foocontent');

      expect(chunks[1].type).to.equal('bartype');
      expect(chunks[1].name).to.equal('barname');
      expect(chunks[1].params).to.deep.equal(['barparam1', 'barparam2', 'barparam3']);
      expect(chunks[1].content).to.equal('barcontent');

      expect(chunks[2].type).to.equal('baztype');
      expect(chunks[2].name).to.equal('bazname');
      expect(chunks[2].params).to.deep.equal(['bazparam1', 'bazparam2', 'bazparam3']);
      expect(chunks[2].content).to.equal('bazcontent');
    });

    it('should parse text chunks between markdown chunks', function () {
      const md = this.readTestData('in', 'text-chunks.md');
      const chunks = MDParser.parse(md);

      expect(chunks[0].content).to.equal('text1');

      expect(chunks[1].type).to.equal('footype');
      expect(chunks[1].name).to.equal('fooname');
      expect(chunks[1].params).to.deep.equal(['fooparam1', 'fooparam2', 'fooparam3']);
      expect(chunks[1].content).to.equal('foocontent');

      expect(chunks[2].content).to.equal('text2');
    });

    it('should parse markdown chunks recursively', function () {
      const md = this.readTestData('in', 'recursive-chunks.md');
      let chunks = MDParser.parse(md, true);

      expect(chunks[0].type).to.equal('footype');
      expect(chunks[0].name).to.equal('fooname');
      expect(chunks[0].params).to.deep.equal(['fooparam1', 'fooparam2', 'fooparam3']);

      chunks = chunks[0].chunks;

      expect(chunks[0].type).to.equal('bartype');
      expect(chunks[0].name).to.equal('barname');
      expect(chunks[0].params).to.deep.equal(['barparam1', 'barparam2', 'barparam3']);

      chunks = chunks[0].chunks;

      expect(chunks[0].type).to.equal('baztype');
      expect(chunks[0].name).to.equal('bazname');
      expect(chunks[0].params).to.deep.equal(['bazparam1', 'bazparam2', 'bazparam3']);

      chunks = chunks[0].chunks;

      expect(chunks[0].content).to.equal('bazcontent');

      chunks = chunks[0].chunks;

      expect(chunks).to.be.undefined;
    });

    it('should parse recursively until limit', function () {
      const md = this.readTestData('in', 'recursive-chunks.md');
      let chunks = MDParser.parse(md, 1);

      expect(chunks[0].type).to.equal('footype');
      expect(chunks[0].name).to.equal('fooname');
      expect(chunks[0].params).to.deep.equal(['fooparam1', 'fooparam2', 'fooparam3']);

      chunks = chunks[0].chunks;

      expect(chunks[0].type).to.equal('bartype');
      expect(chunks[0].name).to.equal('barname');
      expect(chunks[0].params).to.deep.equal(['barparam1', 'barparam2', 'barparam3']);

      chunks = chunks[0].chunks;

      expect(chunks).to.be.undefined;
    });

    describe('Result', function () {
      describe('toTemplate()', function () {
        it('should convert known chunk types into md-renderer components', function () {
          const md = this.readTestData('in', 'template-chunks.md');
          const chunks = MDParser.parse(md, true);

          expect(chunks.toTemplate()).to.be.a.markdown('chunks-template');
        });
      });

      describe('toString()', function () {
        it('should render the content when dealing with string operations', function () {
          const md = this.readTestData('in', 'chunks-series.md');
          const chunks = MDParser.parse(md);

          expect(chunks.toString()).to.equal(md);
        });
      });

      describe('toValue()', function () {
        it('should render the content when dealing with arithmetic operations', function () {
          const md = this.readTestData('in', 'chunks-series.md');
          const chunks = MDParser.parse(md);

          expect(chunks.valueOf()).to.equal(md);
        })
      });
    });
  });
});