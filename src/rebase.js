var Minimist = require('minimist');
var Git = require('./git');
var LocalStorage = require('./local-storage');
var Step = require('./step');

/*
  The rebase module is responsible for performing tasks done by the editor using an
  interactive rebase.
 */

(function () {
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_']
  });

  var method = argv._[0];
  var arg1 = argv._[1];

  switch (method) {
    case 'retag': return retagSteps();
    case 'reword': return rewordRecentStep(arg1);
    case 'super-pick': return superPickStep(arg1);
  }
})();

// The re-tagger is responsible for resetting all step tags
function retagSteps() {
  var stepTags = Git(['tag', '-l', 'step*'])
    .split('\n')
    .filter(Boolean)
    // We want to avoid version tags e.g. 'step1v1.0.0'
    .filter(function (tagName) {
      return tagName.match(/^step\d+$/);
    });

  // Delete all tags to prevent conflicts
  if (Git.tagExists('root')) Git(['tag', '-d', 'root']);

  stepTags.forEach(function (stepTag) {
    Git(['tag', '-d', stepTag]);
  });

  // If any steps exist take the hash before the initial step, else take the recent hash
  var stepsExist = Git.recentCommit(['--grep=^Step 1.1']);
  var rootHash = stepsExist ? Step.base('1.1') : Git.recentCommit(['--format=%h']);

  var stepCommits = Git(['log',
    '--grep=^Step [0-9]\\+:',
    '--format={ "hash": "%h", "message": "%s" }'
  ]).split('\n')
    .filter(Boolean)
    .map(JSON.parse);

  // Reset all tags
  Git(['tag', 'root', rootHash]);

  stepCommits.forEach(function (commit) {
    var hash = commit.hash;
    var message = commit.message;
    var descriptor = Step.descriptor(commit.message);
    var tag = 'step' + descriptor.number;

    Git(['tag', tag, hash]);
  });
}

// Responsible for editing the recent commit's message. It will also adjust the step's
// number if needed
function rewordRecentStep(message) {
  // Calculate next step based on the current commit's message
  var commitMessage = Git.recentCommit(['--format=%s']);
  var stepDescriptor = Step.descriptor(commitMessage);
  var nextStep = getNextStep(stepDescriptor);
  // Open the editor by default
  var argv = ['commit', '--amend', '--allow-empty'];
  // If message provided skip editor
  if (message) argv.push('-m', message);

  // Specified step is gonna be used for when forming the commit message
  LocalStorage.setItem('HOOK_STEP', nextStep);
  // commit, let git hooks do the rest
  Git.print(argv);
}

// The super-picker is responsible for cherry-picking super steps and
// rename their manual files
function superPickStep(hash) {
  var message = Git.recentCommit(hash, ['--format=%s']);
  var oldStep = Step.descriptor(message).number;
  var newStep = Step.nextSuper();

  // Fetch patch data
  var diff = newStep - oldStep;
  var pattern = /step(\d+)\.md/g;
  var patch = Git(['format-patch', '-1', hash, '--stdout']);

  // Replace references for old manual files with new manual files
  // so there would be no conflicts
  var fixedPatch = patch.replace(pattern, function (file, step) {
    step = Number(step) + diff;
    return 'step' + step + '.md';
  });

  // Apply patch
  Git(['am'], {
    input: fixedPatch
  });
}

// Calculate the next step dynamically based on its super flag
function getNextStep(stepDescriptor) {
  if (!stepDescriptor) return '';

  var isSubStep = !!stepDescriptor.number.split('.')[1];
  return isSubStep ? Step.next(1) : Step.nextSuper(1);
}


module.exports = {
  retagSteps: retagSteps,
  rewordRecentStep: rewordRecentStep,
  superPickStep: superPickStep
};
