import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';
import './custom-matchers';
import * as Fs from 'fs-extra';
import { Paths } from '../src/paths';

let context: any = {};

describe('Package', () => {
  beforeAll(tortillaBeforeAll.bind(context));
  beforeEach(tortillaBeforeEach.bind(context));

  describe('updateDependencies()', function() {
    it('should update the dependencies at each commit without having conflicts', function() {
      let pack;

      pack = Fs.readJsonSync(Paths.npm.package);

      pack.dependencies = {
        a: '0.1.0',
        b: '0.1.0'
      };

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      Object.assign(pack.dependencies, {
        c: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.tortilla(['step', 'push', '-m', 'Add c package']);

      Object.assign(pack.dependencies, {
        d: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.tortilla(['step', 'push', '-m', 'Add d package']);

      context.tortilla(['package', 'update-deps'], {
        env: {
          GIT_EDITOR: context.newEditor(function() {
            return `
              c 0.1.1
            `;
          })
        }
      });

      pack = Fs.readJsonSync(Paths.npm.package);

      expect(pack.dependencies).toEqual({
        a: '0.1.0',
        b: '0.1.0',
        c: '0.1.1',
        d: '0.1.0'
      });
    });

    it('should update the dependencies at the root commit', function() {
      let pack;

      pack = Fs.readJsonSync(Paths.npm.package);

      pack.dependencies = {
        a: '0.1.0',
        b: '0.1.0'
      };

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      Object.assign(pack.dependencies, {
        c: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.tortilla(['step', 'push', '-m', 'Add c package']);

      context.tortilla(['package', 'update-deps'], {
        env: {
          GIT_EDITOR: context.newEditor(function() {
            return `
              b 0.1.1
            `;
          })
        }
      });

      pack = Fs.readJsonSync(Paths.npm.package);

      expect(pack.dependencies).toEqual({
        a: '0.1.0',
        b: '0.1.1',
        c: '0.1.0'
      });
    });

    it('should update dev and peer dependencies', function() {
      let pack;

      pack = Fs.readJsonSync(Paths.npm.package);

      pack.dependencies = {
        a: '0.1.0',
        b: '0.1.0'
      };

      pack.devDependencies = {
        a_dev: '0.1.0',
        b_dev: '0.1.0'
      };

      pack.peerDependencies = {
        a_peer: '0.1.0',
        b_peer: '0.1.0'
      };

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

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

      context.git(['add', Paths.npm.package]);
      context.tortilla(['step', 'push', '-m', 'Add c package']);

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

      context.git(['add', Paths.npm.package]);
      context.tortilla(['step', 'push', '-m', 'Add d package']);

      context.tortilla(['package', 'update-deps'], {
        env: {
          GIT_EDITOR: context.newEditor(function() {
            return `
              c      0.1.1
              c_dev  0.1.1
              c_peer 0.1.1
            `;
          })
        }
      });

      pack = Fs.readJsonSync(Paths.npm.package);

      expect(pack.dependencies).toEqual({
        a: '0.1.0',
        b: '0.1.0',
        c: '0.1.1',
        d: '0.1.0'
      });

      expect(pack.devDependencies).toEqual({
        a_dev: '0.1.0',
        b_dev: '0.1.0',
        c_dev: '0.1.1',
        d_dev: '0.1.0'
      });

      expect(pack.peerDependencies).toEqual({
        a_peer: '0.1.0',
        b_peer: '0.1.0',
        c_peer: '0.1.1',
        d_peer: '0.1.0'
      });
    });

    it('should re-render the manuals in all super-steps on the way', function() {
      let pack;

      pack = Fs.readJsonSync(Paths.npm.package);

      pack.dependencies = {
        a: '0.1.0',
        b: '0.1.0'
      };

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });

      Object.assign(pack.dependencies, {
        c: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.tortilla(['step', 'push', '-m', 'Add c package']);

      Object.assign(pack.dependencies, {
        d: '0.1.0'
      });

      Fs.writeFileSync(Paths.npm.package, JSON.stringify(pack, null, 2));

      context.git(['add', Paths.npm.package]);
      context.tortilla(['step', 'push', '-m', 'Add d package']);
      context.tortilla(['step', 'tag', '-m', 'Package test manual']);
      context.tortilla(['step', 'edit', '1']);

      const step1TmplPath = `${context.testDir}/.tortilla/manuals/templates/step1.tmpl`;
      Fs.writeFileSync(step1TmplPath, '{{{diffStep 1.1}}}');

      context.git(['add', '.']);
      context.git(['commit', '--amend'], {
        env: { GIT_EDITOR: true }
      });
      context.tortilla(['manual', 'render']);
      context.git(['rebase', '--continue']);

      context.tortilla(['package', 'update-deps'], {
        env: {
          GIT_EDITOR: context.newEditor(function() {
            return `
              c 0.1.1
            `;
          })
        }
      });

      const step1ViewPath = `${context.testDir}/.tortilla/manuals/views/step1.md`;
      expect(Fs.readFileSync(step1ViewPath).toString()).toContainSameContentAsFile('step-update-deps.md');
    });
  });
});
