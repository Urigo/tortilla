var Fs = require('fs-extra');
var Minimist = require('minimist');
var Path = require('path')
var ReadlineSync = require('readline-sync');
var Utils = require('./utils');

/*
  This module is responsible for initializing a new repository, it will use the skeleton
  as the template and it will fill it up with the provided details. Usually should only
  run once at the creation of the repository.
 */

(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm', 'output', 'o'],
    boolean: ['override']
  });

  var projectName = argv._[0] || 'tortilla-project';
  var message = argv.message || argv.m;
  var output = argv.output || argv.o || __dirname;
  var override = argv.override;

  // In case dir already exists verify the user's decision
  if (Utils.exists(output)) {
    var override = override || ReadlineSync.keyInYN([
      'Output path already eixsts.',
      'Would you like to override it and continue?'
    ].join(' '));

    if (!override) return;
  }

  var tempDir = '/tmp/tortilla';

  Fs.removeSync(tempDir);
  Fs.copySync(Path.resolve(__dirname, 'skeleton'), tempDir);

  var TempPaths = require(Path.resolve(tempDir, '.tortilla/paths'));
  var TempUtils = require(Path.resolve(tempDir, '.tortilla/utils'));

  var git = TempUtils.git;
  var npm = TempUtils.npm;

  var packageName = Utils.kebabCase(projectName);
  var title = Utils.startCase(projectName);

  // Fillin template files
  Utils.fillinFile(TempPaths.npm.package, {
    name: packageName,
  });

  Utils.fillinFile(TempPaths.readme, {
    title: title
  });

  // Git chores
  git(['init']);
  git(['add', '.']);

  if (message) {
    git(['commit', '-m', message]);
  }
  else {
    git(['commit', '-m', 'Create a new tortilla project']);
    git.print(['commit', '--amend']);
  }

  git(['tag', 'root']);
  npm(['install']);

  // Copy from temp to output
  Fs.removeSync(output);
  Fs.copySync(tempDir, output);
})();