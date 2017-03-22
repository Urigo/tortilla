var Minimist = require('minimist');
var Git = require('./git');
var LocalStorage = require('./local-storage');
var Step = require('./step');

/**
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
    case 'reword': return rewordRecentStep(arg1);
    case 'super-pick': return superPickStep(arg1);
  }
})();

// Responsible for editing the recent commit's message. It will also sort the step's
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
  var pattern = /step(\d+)\.(md|tmpl)/g;
  var patch = Git(['format-patch', '-1', hash, '--stdout']);

  // Replace references for old manual files with new manual files
  // so there would be no conflicts
  var fixedPatch = patch.replace(pattern, function (file, step, extension) {
    step = Number(step) + diff;
    return 'step' + step + '.' + extension;
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
  rewordRecentStep: rewordRecentStep,
  superPickStep: superPickStep
};
