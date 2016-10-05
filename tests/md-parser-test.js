const Chai = require('chai');


const expect = Chai.expect;


describe('MDParser', function () {
  describe('parse()', function () {
    this.slow(10);

    it('should parse markdown blocks in series', function () {
      const md = this.readFile('in', 'blocks-series.md');
      const blocks = this.mdParser.parse(md);

      expect(blocks[0].type).to.equal('footype');
      expect(blocks[0].name).to.equal('fooname');
      expect(blocks[0].params).to.deep.equal(['fooparam1', 'fooparam2', 'fooparam3']);
      expect(blocks[0].content).to.equal('foocontent');
      expect(blocks[0].start).to.equal(0);
      expect(blocks[0].end).to.equal(72);

      expect(blocks[1].type).to.equal('bartype');
      expect(blocks[1].name).to.equal('barname');
      expect(blocks[1].params).to.deep.equal(['barparam1', 'barparam2', 'barparam3']);
      expect(blocks[1].content).to.equal('barcontent');
      expect(blocks[1].start).to.equal(73);
      expect(blocks[1].end).to.equal(145);

      expect(blocks[2].type).to.equal('baztype');
      expect(blocks[2].name).to.equal('bazname');
      expect(blocks[2].params).to.deep.equal(['bazparam1', 'bazparam2', 'bazparam3']);
      expect(blocks[2].content).to.equal('bazcontent');
      expect(blocks[2].start).to.equal(146);
      expect(blocks[2].end).to.equal(218);
    });

    it('should parse text blocks between markdown blocks', function () {
      const md = this.readFile('in', 'text-blocks.md');
      const blocks = this.mdParser.parse(md);

      expect(blocks[0].type).to.equal('');
      expect(blocks[0].name).to.equal('');
      expect(blocks[0].params).to.deep.equal([]);
      expect(blocks[0].content).to.equal('text1');
      expect(blocks[0].start).to.equal(0);
      expect(blocks[0].end).to.equal(5);

      expect(blocks[1].type).to.equal('footype');
      expect(blocks[1].name).to.equal('fooname');
      expect(blocks[1].params).to.deep.equal(['fooparam1', 'fooparam2', 'fooparam3']);
      expect(blocks[1].content).to.equal('foocontent');
      expect(blocks[1].start).to.equal(6);
      expect(blocks[1].end).to.equal(78);

      expect(blocks[2].type).to.equal('');
      expect(blocks[2].name).to.equal('');
      expect(blocks[2].params).to.deep.equal([]);
      expect(blocks[2].content).to.equal('text2');
      expect(blocks[2].start).to.equal(79);
      expect(blocks[2].end).to.equal(84);
    });

    it('should parse markdown blocks recursively', function () {
      const md = this.readFile('in', 'recursive-blocks.md');
      let blocks = this.mdParser.parse(md, true);

      expect(blocks[0].type).to.equal('footype');
      expect(blocks[0].name).to.equal('fooname');
      expect(blocks[0].params).to.deep.equal(['fooparam1', 'fooparam2', 'fooparam3']);
      expect(blocks[0].start).to.equal(0);
      expect(blocks[0].end).to.equal(218);

      blocks = blocks[0].blocks;

      expect(blocks[0].type).to.equal('bartype');
      expect(blocks[0].name).to.equal('barname');
      expect(blocks[0].params).to.deep.equal(['barparam1', 'barparam2', 'barparam3']);
      expect(blocks[0].start).to.equal(0);
      expect(blocks[0].end).to.equal(145);

      blocks = blocks[0].blocks;

      expect(blocks[0].type).to.equal('baztype');
      expect(blocks[0].name).to.equal('bazname');
      expect(blocks[0].params).to.deep.equal(['bazparam1', 'bazparam2', 'bazparam3']);
      expect(blocks[0].start).to.equal(0);
      expect(blocks[0].end).to.equal(72);

      blocks = blocks[0].blocks;

      expect(blocks).to.have.lengthOf(0);
    });

    it('should parse recursively until limit', function () {
      const md = this.readFile('in', 'recursive-blocks.md');
      let blocks = this.mdParser.parse(md, 1);

      expect(blocks[0].type).to.equal('footype');
      expect(blocks[0].name).to.equal('fooname');
      expect(blocks[0].params).to.deep.equal(['fooparam1', 'fooparam2', 'fooparam3']);
      expect(blocks[0].start).to.equal(0);
      expect(blocks[0].end).to.equal(218);

      blocks = blocks[0].blocks;

      expect(blocks[0].type).to.equal('bartype');
      expect(blocks[0].name).to.equal('barname');
      expect(blocks[0].params).to.deep.equal(['barparam1', 'barparam2', 'barparam3']);
      expect(blocks[0].start).to.equal(0);
      expect(blocks[0].end).to.equal(145);

      blocks = blocks[0].blocks;

      expect(blocks).to.have.lengthOf(0);
    });

    describe('Result', function () {
      describe('toTemplate()', function () {
        it('should convert known block types into md-renderer components', function () {
          const md = this.readFile('in', 'template-blocks.md');
          const blocks = this.mdParser.parse(md, true);

          expect(blocks.toTemplate()).to.be.a.markdown('blocks-template');
        });
      });

      describe('toString()', function () {
        it('should render the content when dealing with string operations', function () {
          const md = this.readFile('in', 'blocks-series.md');
          const blocks = this.mdParser.parse(md);

          expect(blocks.toString()).to.equal(md);
        });
      });

      describe('toValue()', function () {
        it('should render the content when dealing with arithmetic operations', function () {
          const md = this.readFile('in', 'blocks-series.md');
          const blocks = this.mdParser.parse(md);

          expect(blocks.valueOf()).to.equal(md);
        })
      });
    });
  });
});