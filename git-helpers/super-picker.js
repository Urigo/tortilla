var Minimist = require('minimist');
var Step = require('./step');
var Utils = require('./utils');

/*
  The super-picker is responsible for cherry-picking super steps and
  rename their instruction files.
 */

var git = Utils.git;


(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_']
  });

  var hash = argv._[0];

  var message = Utils.recentCommit(hash, ['--format=%s']);

  var oldStep = Step.descriptor(message).number;
  var newStep = Step.nextSuper();

  // Fetch patch data
  var diff = newStep - oldStep;
  var pattern = /step(\d+)\.md/g;
  var patch = git(['format-patch', '-1', hash, '--stdout']);

  // Replace references for old instruction files with new instruction files
  // so there would be no conflicts
  var fixedPatch = patch.replace(pattern, function (file, step) {
    step = Number(step) + diff;
    return 'step' + step + '.md';
  });

  // Apply patch
  git(['am'], fixedPatch);
})();