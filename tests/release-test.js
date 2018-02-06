const Chai = require('chai');


const expect = Chai.expect;


describe('Release', function () {
  describe('bump()', function () {
    this.slow(20000);

    it('should bump a major version', function () {
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@1.0.0']);
      expect(tagExists).to.not.throw(Error);
    });

    it('should bump a minor version', function () {
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@0.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@0.1.0']);
      expect(tagExists).to.not.throw(Error);
    });

    it('should bump a patch version', function () {
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@0.0.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@0.0.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('should bump a major, minor and patch versions', function () {
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@1.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@1.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@1.1.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('should bump a version for all step tags', function () {
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);

      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@step1@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@step2@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@step3@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@1.1.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('should change the prefix of the release based on the active branch', function () {
      this.git(['checkout', '-b', 'test']);

      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);
      this.tortilla(['step', 'tag', '-m', 'dummy']);

      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'test@root@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'test@step1@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'test@step2@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'test@step3@1.1.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'test@1.1.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('should be able to handle multiple bumps for the same version type', function () {
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      let tagExists;

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@0.0.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@0.0.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@0.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@0.1.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@1.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@2.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@2.0.0']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@root@2.0.1']);
      expect(tagExists).to.not.throw(Error);

      tagExists = this.git.bind(this, ['rev-parse', 'master@2.0.1']);
      expect(tagExists).to.not.throw(Error);
    });

    it('should create a diff branch whose commits represent the releases', function () {
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

      this.git(['checkout', 'master-history']);

      let commitMessage;

      commitMessage = this.git(['log', '-1', '--format=%s']);
      expect(commitMessage).to.equal('master@1.1.1: patch version test');

      commitMessage = this.git(['log', '-1', '--skip=1', '--format=%s']);
      expect(commitMessage).to.equal('master@1.1.0: minor version test');

      commitMessage = this.git(['log', '-1', '--skip=2', '--format=%s']);
      expect(commitMessage).to.equal('master@1.0.0: major version test');

      const releaseDiff = this.git(['diff', 'HEAD', 'HEAD~2'], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).to.be.a.file('release-update.diff');
    });

    it('should remove files which should not be included in the release', function () {
      this.exec('touch', ['travis.yml']);
      this.exec('touch', ['renovate.json']);
      this.git(['add', 'travis.yml']);
      this.git(['add', 'renovate.json']);
      this.tortilla(['step', 'push', '-m', 'Add CI configurations']);
      this.tortilla(['step', 'tag', '-m', 'First step']);
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      const travisPath = this.exec('realpath', ['travis.yml']);
      const renovatePath = this.exec('realpath', ['renovate.json']);

      expect(this.exists(travisPath)).to.be.truthy;
      expect(this.exists(renovatePath)).to.be.truthy;

      this.git(['checkout', 'master@1.0.0']);

      expect(this.exists(travisPath)).to.be.falsy;
      expect(this.exists(renovatePath)).to.be.falsy;

      this.git(['checkout', 'master-history']);

      expect(this.exists(travisPath)).to.be.falsy;
      expect(this.exists(renovatePath)).to.be.falsy;
    });

    it('should re-render all manuals using an updated release tag', function () {
      this.tortilla(['step', 'edit', '--root']);

      var pack = JSON.parse(this.exec('cat', ['package.json']));

      pack.repository = {
        type: 'git',
        url: 'https://github.com/test/repo.git'
      };

      var packString = JSON.stringify(pack, null, 2).replace(/"/g, '\\"');
      this.exec('sh', ['-c', `echo "${packString}" > package.json`]);
      this.exec('sh', ['-c', `echo "{{{resolvePath}}}" > .tortilla/manuals/templates/root.tmpl`]);

      this.git(['add', '.']);
      this.git(['commit', '--amend'], {
        env: {
          GIT_EDITOR: true
        }
      });
      this.git(['rebase', '--continue']);

      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      const manual = this.exec('cat', ['README.md']);
      expect(manual).to.be.a.file('release-path.md');
    });
  });

  describe('current()', function () {
    this.slow(5000);

    it('should get the current version', function () {
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);
      this.tortilla(['release', 'bump', 'patch', '-m', 'patch version test']);

      const currentVersion = this.tortilla(['release', 'current']);

      expect(currentVersion).to.equal([
        '🌟 Release: 1.1.1',
        '🌟 Branch:  master'
      ].join('\n'));
    });
  });

  describe('diff()', function () {
    this.slow(20000);

    it('should run "git diff" between provided releases', function () {
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

      expect(releaseDiff).to.be.a.file('release-update.diff');
    });

    it('should concat the provided arguments vector', function () {
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

      const releaseDiff = this.tortilla([
        'release', 'diff', '1.1.1', '1.0.0', '--name-only'
      ], {
        env: {
          TORTILLA_STDIO: 'inherit',
          GIT_PAGER: 'cat'
        }
      });

      expect(releaseDiff).to.be.a.file('release-update-names.diff');
    });

    it('should be able to run "git diff" for two releases with different roots', function () {
      this.tortilla(['step', 'edit', '--root']);
      this.exec('sh', ['-c', 'echo 1.0.0 > VERSION']);
      this.git(['add', 'VERSION']);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);
      this.tortilla(['step', 'tag', '-m', 'First step']);
      this.tortilla(['release', 'bump', 'major', '-m', 'major version test']);

      this.tortilla(['step', 'edit', '--root']);
      this.exec('sh', ['-c', 'echo 1.1.0 > VERSION']);
      this.git(['add', 'VERSION']);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);
      this.tortilla(['release', 'bump', 'minor', '-m', 'minor version test']);

      this.tortilla(['step', 'edit', '--root']);
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

      expect(releaseDiff).to.be.a.file('release-update.diff');
    });
  });
});