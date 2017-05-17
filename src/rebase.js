const Minimist = require('minimist');
const Git = require('./git');
const LocalStorage = require('./local-storage');
const Step = require('./step');

/**
  The rebase module is responsible for performing tasks done by the editor using an
  interactive rebase.
 */

(function () {
  if (require.main !== module) return;

  const argv = Minimist(process.argv.slice(2), {
    string: ['_'],
  });

  const method = argv._[0];
  const arg1 = argv._[1];

  switch (method) {
    case 'reword': return rewordRecentStep(arg1);
    case 'super-pick': return superPickStep(arg1);
  }
}());

// Responsible for editing the recent commit's message. It will also sort the step's
// number if needed
function rewordRecentStep(message) {
  // Calculate next step based on the current commit's message
  const commitMessage = Git.recentCommit(['--format=%s']);
  const stepDescriptor = Step.descriptor(commitMessage);
  const nextStep = getNextStep(stepDescriptor);
  // Open the editor by default
  const argv = ['commit', '--amend', '--allow-empty'];
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
  const message = Git.recentCommit(hash, ['--format=%s']);
  const oldStep = Step.descriptor(message).number;
  const newStep = Step.nextSuper();

  // Fetch patch data
  const diff = newStep - oldStep;
  const pattern = /step(\d+)\.(md|tmpl)/g;
  const patch = Git(['format-patch', '-1', hash, '--stdout']);

  // Replace references for old manual files with new manual files
  // so there would be no conflicts
  const fixedPatch = patch.replace(pattern, (file, step, extension) => {
    step = Number(step) + diff;
    return `step${step}.${extension}`;
  });

  // Apply patch
  Git(['am'], {
    input: fixedPatch,
  });
}

// Calculate the next step dynamically based on its super flag
function getNextStep(stepDescriptor) {
  if (!stepDescriptor) return '';

  const isSubStep = !!stepDescriptor.number.split('.')[1];
  return isSubStep ? Step.next(1) : Step.nextSuper(1);
}


module.exports = {
  rewordRecentStep,
  superPickStep,
};
