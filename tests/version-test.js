const Chai = require('chai');


const expect = Chai.expect;


describe('Version', function () {
  describe('bump()', function () {
    it('Should bump a major version', function () {
      this.tortilla(['version', 'bump', 'major', '-m', 'major version test']);
      const tagExists = this.git.bind(this, ['rev-parse', 'rootv1.0.0']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should bump a minor version', function () {
      this.tortilla(['version', 'bump', 'minor', '-m', 'minor version test']);
      const tagExists = this.git.bind(this, ['rev-parse', 'rootv0.1.0']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should bump a patch version', function () {
      this.tortilla(['version', 'bump', 'patch', '-m', 'patch version test']);
      const tagExists = this.git.bind(this, ['rev-parse', 'rootv0.0.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should bump a major, minor and patch versions', function () {
      this.tortilla(['version', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['version', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['version', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'rootv1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'rootv1.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'rootv1.1.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should bump a version for all step tags', function () {
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);

      this.tortilla(['version', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['version', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['version', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'rootv1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'step1v1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'step2v1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'step3v1.1.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should be able to handle multiple bumps for the same version type', function () {
      this.tortilla(['version', 'bump', 'patch', '-m', 'patch version test']);
      this.tortilla(['version', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['version', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['version', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['version', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'rootv0.0.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'rootv0.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'rootv1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'rootv2.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'rootv2.0.1']);
      expect(tagExists).to.not.throw(Error);
    });
  });

  describe('current()', function () {
    it('Should get the current version', function () {
      this.tortilla(['version', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['version', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['version', 'bump', 'patch', '-m', 'patch version test']);

      const currentVersion = this.tortilla(['version', 'current']);
      expect(currentVersion).to.equal('v1.1.1');
    });
  });
});