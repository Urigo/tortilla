const Chai = require('chai');


const expect = Chai.expect;


describe('Step', function () {
  beforeEach(function () {
    this.step = require(`${this.tempDir}/.tortilla/step`);
  });

  describe('push()', function () {
    it('should push a new step to the top of the stack', function () {

    });

    it('should add a new step with an updated sub-index', function () {

    });

    it('should add a new step with an updated super-index', function () {

    });
  });

  describe('pop()', function () {
    it('should push the last step from the top of the stack', function () {

    });

    it('should remove tags', function () {

    });

    it('should remove instruction files', function () {

    });
  });

  describe('tag()', function () {
    it('should push a new step to the top of the stack', function () {

    });

    it('should create an instruction file', function () {

    });

    it('should add a new tag', function () {

    })
  });

  describe('reword()', function () {
    it('should reword the provided step', function () {

    });

    it('should update hash references', function () {

    });
  });

  describe('edit()', function () {
    it('should edit the provided step', function () {

    });

    it('should update hash references', function () {

    });

    it('should update step indices when pushing a step', function () {

    });

    it('should update step indices when popping a step', function () {

    });

    it('should update step indices when tagging a step', function () {

    });

    it('should resolve addition conflicts when tagging a step', function () {

    });

    it('should resolve removal conflicts when tagging a step', function () {

    });
  });
});