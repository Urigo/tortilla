const Chai = require('chai');
const Fs = require('fs');
const Paths = require('../src/paths');


const expect = Chai.expect;


describe('Package', function () {
  describe.only('updateDependencies()', function () {
    it('should update the dependencies at each commit without having conflicts', function () {
      this.slow(7000);

      let pack;

      pack = JSON.parse(Fs.readFileSync(Paths.npm.package).toString());

      pack.dependencies = {
        a: '0.1.0',
        b: '0.1.0',
      };

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      Object.assign(pack.dependencies, {
        c: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.tortilla(['step', 'push', '-m', 'Add c package']);

      Object.assign(pack.dependencies, {
        d: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.tortilla(['step', 'push', '-m', 'Add d package']);

      this.tortilla(['package', 'update-deps'], {
        env: {
          GIT_EDITOR: this.newEditor(function () {
            return `
              c 0.1.1
            `;
          })
        }
      });

      pack = JSON.parse(Fs.readFileSync(Paths.npm.package).toString());

      expect(pack.dependencies).to.deep.equal({
        a: '0.1.0',
        b: '0.1.0',
        c: '0.1.1',
        d: '0.1.0'
      });
    });

    it('should update the dependencies at the root commit', function () {
      this.slow(5000);

      let pack;

      pack = JSON.parse(Fs.readFileSync(Paths.npm.package).toString());

      pack.dependencies = {
        a: '0.1.0',
        b: '0.1.0',
      };

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      Object.assign(pack.dependencies, {
        c: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.tortilla(['step', 'push', '-m', 'Add c package']);

      this.tortilla(['package', 'update-deps'], {
        env: {
          GIT_EDITOR: this.newEditor(function () {
            return `
              b 0.1.1
            `;
          })
        }
      });

      pack = JSON.parse(Fs.readFileSync(Paths.npm.package).toString());

      expect(pack.dependencies).to.deep.equal({
        a: '0.1.0',
        b: '0.1.1',
        c: '0.1.0',
      });
    });

    it('should update dev and peer dependencies', function () {
      this.slow(14000);

      let pack;

      pack = JSON.parse(Fs.readFileSync(Paths.npm.package).toString());

      pack.dependencies = {
        a: '0.1.0',
        b: '0.1.0',
      };

      pack.devDependencies = {
        a_dev: '0.1.0',
        b_dev: '0.1.0',
      };

      pack.peerDependencies = {
        a_peer: '0.1.0',
        b_peer: '0.1.0',
      };

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      Object.assign(pack.dependencies, {
        c: '0.1.0'
      });

      Object.assign(pack.devDependencies, {
        c_dev: '0.1.0'
      });

      Object.assign(pack.peerDependencies, {
        c_peer: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.tortilla(['step', 'push', '-m', 'Add c package']);

      Object.assign(pack.dependencies, {
        d: '0.1.0'
      });

      Object.assign(pack.devDependencies, {
        d_dev: '0.1.0'
      });

      Object.assign(pack.peerDependencies, {
        d_peer: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.tortilla(['step', 'push', '-m', 'Add d package']);

      this.tortilla(['package', 'update-deps'], {
        env: {
          GIT_EDITOR: this.newEditor(function () {
            return `
              c      0.1.1
              c_dev  0.1.1
              c_peer 0.1.1
            `;
          })
        }
      });

      pack = JSON.parse(Fs.readFileSync(Paths.npm.package).toString());

      expect(pack.dependencies).to.deep.equal({
        a: '0.1.0',
        b: '0.1.0',
        c: '0.1.1',
        d: '0.1.0'
      });

      expect(pack.devDependencies).to.deep.equal({
        a_dev: '0.1.0',
        b_dev: '0.1.0',
        c_dev: '0.1.1',
        d_dev: '0.1.0'
      });

      expect(pack.peerDependencies).to.deep.equal({
        a_peer: '0.1.0',
        b_peer: '0.1.0',
        c_peer: '0.1.1',
        d_peer: '0.1.0'
      });
    });

    it('should re-render the manuals in all super-steps on the way', function () {
      this.slow(12000);

      let pack;

      pack = JSON.parse(Fs.readFileSync(Paths.npm.package).toString());

      pack.dependencies = {
        a: '0.1.0',
        b: '0.1.0',
      };

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      Object.assign(pack.dependencies, {
        c: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.tortilla(['step', 'push', '-m', 'Add c package']);

      Object.assign(pack.dependencies, {
        d: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      this.git(['add', Paths.npm.package]);
      this.tortilla(['step', 'push', '-m', 'Add d package']);

      this.tortilla(['step', 'tag', '-m', 'Package test manual']);
      this.tortilla(['step', 'edit', '1']);

      const step1TmplPath = `${this.testDir}/.tortilla/manuals/templates/step1.tmpl`;
      Fs.writeFileSync(step1TmplPath, '{{{diffStep 1.1}}}');

      this.git(['add', '.']);
      this.git(['commit', '--amend'], {
        env: { GIT_EDITOR: true }
      });
      this.tortilla(['manual', 'render']);
      this.git(['rebase', '--continue']);

      this.tortilla(['package', 'update-deps'], {
        env: {
          GIT_EDITOR: this.newEditor(function () {
            return `
              c 0.1.1
            `;
          })
        }
      });

      const step1ViewPath = `${this.testDir}/.tortilla/manuals/views/step1.md`;
      expect(Fs.readFileSync(step1ViewPath).toString()).to.be.a.file('step-update-deps.md');
    });
  });
});
