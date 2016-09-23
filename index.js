var Fs = require('fs');
var Minimist = require('minimist');
var ReadlineSync = require('readline-sync');
var Rimraf = require('rimraf');
var Pack = require('./package.json');
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
    string: ['_', 'message', 'm']
  });

  var remote = argv._[0];
  var url = argv._[1];
  var message = argv.message || argv.m;
  var sure = argv.sure || argv.s;

  sure = sure || ReadlineSync.keyInYN(
    'Are you sure you want to start a new tutorial project?'
  );

  if (!sure) return;

  // The changes will be applied to the current branch
  var branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);

  // If only  arg provided set the remote to the branche's
  if (!url) {
    url = remote;
    remote = git(['config', '--get', 'branch.' + branch + '.remote']);
  }

  var remoteExists = git(['config', '--get', 'remote.' + remote + '.url']);
  // If no args provided set the url to the remote's
  url = url || remoteExists;
  remoteExists = !!remoteExists;

  // The repo name would be the last part of the url
  var repoName = url
    .split('/')
    .slice(-1)[0]
    .split('.')[0];

  // If the remote references to tortilla change the initialized project name
  if (repoName == 'tortilla') repoName = 'tortilla-project';
  var packName = Utils.kebabCase(repoName);
  var title = Utils.startCase(repoName);

  // Notice how we delete all the references to init-tutorial
  Pack.devDependencies = Pack.dependencies;
  delete Pack.dependencies;
  delete Pack.scripts['test'];

  Utils.extend(Pack, {
    name: packName,
    description: 'A newly created Tortilla project',
    version: '0.0.1',
    repository: {
      type: 'git',
      url: url
    }
  });

  Fs.unlinkSync(Paths.license);
  Fs.unlinkSync(Paths.npm.main);
  Rimraf.sync(Paths.test);

  Fs.writeFileSync(Paths.readme, '# ' + title);
  Fs.writeFileSync(Paths.git.ignore, 'node_modules');
  Fs.writeFileSync(Paths.npm.package, JSON.stringify(Pack, null, 2));

  git(['add',
    Paths.license,
    Paths.readme,
    Paths.test,
    Paths.git.ignore,
    Paths.npm.main,
    Paths.npm.package
  ]);

  git(['commit', '--allow-empty-message', '-m', '']);

  var commitsNumber = git(['rev-list', 'HEAD', '--count']);
  var defaultMessage = 'Create a new tortilla project';

  // Reset all commits right before the initial one
  git(['reset', '--soft', 'HEAD~' + (commitsNumber - 1)]);
  // Ammend changes with the available message
  git(['commit', '--amend', '-m', message || defaultMessage]);
  // If no message was provided open the editor
  if (!message) git.print(['commit', '--amend']);

  var remoteMethod = remoteExists ? 'set-url' : 'add';

  // Define the remote
  git(['remote', remoteMethod, remote, url]);
  // Set the remote to a default to the current branch
  git(['branch', '--set-upstream-to=' + remote]);

  var tags = git(['tag'])
    .split('\n')
    .filter(Boolean);

  // Cleaning up tags
  tags.forEach(function (tag) {
    git(['tag', '-d', tag]);
  });

  // Setting the initial commit as root
  git(['tag', 'root']);
})();