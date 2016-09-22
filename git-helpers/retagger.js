var Step = require('./step');
var Utils = require('./utils');

/*
  The retagger is responsible for resetting all step tags.
 */

var git = Utils.git;


(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var stepTags = git(['tag', '-l', 'step*'])
    .split('\n')
    .filter(Boolean);

  // Delete all tags to prevent conflicts
  git(['tag', '-d', 'root']);

  stepTags.forEach(function (stepTag) {
    git(['tag', '-d', stepTag]);
  });

  // If any steps exist take the hash before the inital step, else take the recent hash
  var stepsExist = Utils.recentCommit(['--grep=^Step 1.1']);
  var rootHash = stepsExist ? Step.base('1.1') : Utils.recentCommit(['--format=%h']);

  var stepCommits = git(['log',
    '--grep=^Step [0-9]\\+:',
    '--format={ "hash": "%h", "message": "%s" }'
  ]).split('\n')
    .filter(Boolean)
    .map(JSON.parse);

  // Reset all tags
  git(['tag', 'root', rootHash]);

  stepCommits.forEach(function (commit) {
    var hash = commit.hash;
    var message = commit.message;
    var descriptor = Step.descriptor(commit.message);
    var tag = 'step' + descriptor.number;

    git(['tag', tag, hash]);
  });
})();