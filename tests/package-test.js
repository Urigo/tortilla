const Chai = require('chai');
const Fs = require('fs');
const Paths = require('../src/paths');


const expect = Chai.expect;


describe('Package', function () {
  describe('updateDependencies()', function () {
    it('should update the dependencies at each commit without having conflicts', function () {
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
      this.tortilla(['step', 'push', '-m', 'Add b package']);

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

    it('should update the dependencies at the root commit', function () {

    });

    it('should update dev and peer dependencies', function () {

    });

    it('should re-render the manuals in all super-steps on the way', function () {

    });

    it('should re-render README.md', function () {

    });
  });
});
