const Minimist = require('minimist');
const Git = require('./git');
const LocalStorage = require('./local-storage');
const Step = require('./step');

/**
  The rebase module is responsible for performing tasks done by the editor using an
  interactive rebase.
 */

(function () {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_'],
  });

  const method = argv._[0];
  const arg1 = argv._[1];

  switch (method) {
    case 'reword': return rewordRecentStep(arg1);
    case 'super-pick': return superPickStep(arg1);
    case 'rebranch-super': return rebranchSuperSteps(arg1);
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
  if (message) {
    argv.push('-m', message);
  }

  // Specified step is gonna be used for when forming the commit message
  LocalStorage.setItem('HOOK_STEP', nextStep);

  // This will be used later on to update the manuals
  if (stepDescriptor && Step.ensureStepMap()) {
    Step.updateStepMap('reset', { oldStep: stepDescriptor.number, newStep: nextStep });
  }

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
  const stepFilePattern = /step(\d+)\.(md|tmpl)/g;
  const patch = Git(['format-patch', '-1', hash, '--stdout']);

  // Replace references for old manual files with new manual files
  let fixedPatch = patch.replace(stepFilePattern, (file, step, extension) => {
    step = Number(step) + diff;

    return `step${step}.${extension}`;
  });

  const stepMap = Step.getStepMap();

  if (stepMap) {
    const diffStepPattern = /\{\{\s*diffStep\s+(\d+\.\d+).*\}\}/g;

    // Replace indexes presented in diffStep() template helpers
    fixedPatch = fixedPatch.replace(diffStepPattern, (helper, oldStep) => {
      // In case step has been removed in the process, replace it with a meaningless placeholder
      const newStep = stepMap[oldStep] || 'XX.XX';

      return helper.replace(/(diffStep\s+)\d+\.\d+/, `$1${newStep}`);
    });
  }

  // Apply patch
  Git(['am'], {
    input: fixedPatch,
  });
}

// Updates the branches referencing all super steps
function rebranchSuperSteps(rootBranch) {
  rootBranch = rootBranch || Git.activeBranchName();

  Git(['branch']).split('\n').filter((branch) => {
    return branch.match(new RegExp(`${rootBranch}_step\\d+`));
  })
  .forEach((branch) => {
    Git(['branch', '-D', branch]);
  });

  Git(['log', '--format="%H %m"', '--grep="^Step [0-9]\\+:"']).split('\n').map((log) => {
    let message = log.split(' ');
    const hash = log.shift();
    message = message.join(' ');

    return {
      number: Step.descriptor(message).number,
      hash,
    };
  })
  .forEach((step) => {
    Git(['branch', `${rootBranch}-step${step.number}`, step.hash]);
  });
}

// Calculate the next step dynamically based on its super flag
function getNextStep(stepDescriptor) {
  if (!stepDescriptor) {
    return '';
  }

  const isSubStep = !!stepDescriptor.number.split('.')[1];
  return isSubStep ? Step.next(1) : Step.nextSuper(1);
}

module.exports = {
  rewordRecentStep,
  superPickStep,
  rebranchSuperSteps,
};
