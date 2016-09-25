var Fs = require('fs-extra');
var Minimist = require('minimist');
var Path = require('path')
var ReadlineSync = require('readline-sync');
var Paths = require('./.tortilla/paths');
var Utils = require('./.tortilla/utils');

/*
  This module is responsible for initializing a new repository, it will squash all
  all commits into one and it will edit the 'package.json' accordingly to look as
  if it is do not depend on Tortilla. Usually should only run once at the creation
  of the repository. This script can be performed only once, afterwards it will self
  destroy itslef.
 */

var git = Utils.git;


(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm', 'output', 'o'],
    boolean: ['override']
  });

  var projectName = argv._[0] || 'tortilla-project';
  var message = argv.message || argv.m;
  var output = argv.output || argv.o || Paths._;
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
  Fs.copySync(Paths.skeleton, tempDir);
  Fs.copySync(Paths.tortilla._, Path.resolve(tempDir, '.tortilla'));

  var TempPaths = require(Path.resolve(tempDir, '.tortilla/paths'));
  var TempUtils = require(Path.resolve(tempDir, '.tortilla/utils'));

  var tempGit = TempUtils.git;
  var tempNpm = TempUtils.npm;

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
  tempGit(['init']);
  tempGit(['add', '.']);

  if (message) {
    tempGit(['commit', '-m', message]);
  }
  else {
    tempGit(['commit', '-m', 'Create a new tortilla project']);
    tempGit(['commit', '--amend']);
  }

  tempGit(['tag', 'root']);
  tempNpm(['install']);

  // Copy from temp to output
  Fs.removeSync(output);
  Fs.copySync(tempDir, output);
})();