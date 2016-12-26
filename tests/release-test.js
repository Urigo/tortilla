const Chai = require('chai');


const expect = Chai.expect;


describe('Release', function () {
  describe('bump()', function () {
    this.slow(1000);

    it('Should bump a major version', function () {
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      const tagExists = this.git.bind(this, ['rev-parse', 'root@1.0.0']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should bump a minor version', function () {
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      const tagExists = this.git.bind(this, ['rev-parse', 'root@0.1.0']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should bump a patch version', function () {
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);
      const tagExists = this.git.bind(this, ['rev-parse', 'root@0.0.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should bump a major, minor and patch versions', function () {
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'root@1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'root@1.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'root@1.1.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should bump a version for all step tags', function () {
      this.slow(5000);

      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);

      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'root@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'step1@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'step2@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'step3@1.1.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('Should be able to handle multiple bumps for the same version type', function () {
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'root@0.0.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'root@0.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'root@1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'root@2.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'root@2.0.1']);
      expect(tagExists).to.not.throw(Error);
    });
  });

  describe('current()', function () {
    this.slow(1500);

    it('Should get the current version', function () {
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      const currentVersion = this.tortilla(['release', 'current']);
      expect(currentVersion).to.equal('1.1.1');
    });
  });

  describe('diff()', function () {
    this.slow(5000);

    it('Should run "git diff" between provided releases', function () {
      this.exec('sh', ['-c', 'echo 1.0.0 > VERSION']);
      this.git(['add', 'VERSION']);
      this.tortilla(['step', 'push', '-m', 'Create version file']);
      this.tortilla(['step', 'tag', '-m', 'First step']);
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      this.tortilla(['step', 'edit', '1.1']);
      this.exec('sh', ['-c', 'echo 1.1.0 > VERSION']);
      this.git(['add', 'VERSION']);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);

      this.tortilla(['step', 'edit', '1.1']);
      this.exec('sh', ['-c', 'echo 1.1.1 > VERSION']);
      this.git(['add', 'VERSION']);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      const releaseDiff = this.tortilla(['release', 'diff', '1.1.1', '1.0.0'], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).to.be.a.diff('release-update');
    });
  });
});