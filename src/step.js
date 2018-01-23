const Fs = require('fs-extra');
const Minimist = require('minimist');
const Path = require('path');
const Git = require('./git');
const LocalStorage = require('./local-storage');
const Paths = require('./paths');
const Utils = require('./utils');
let Submodule;

// Get recent commit by specified arguments
function getRecentCommit(offset, format, grep) {
  if (typeof offset === 'string') {
    grep = format;
    format = offset;
    offset = 0;
  }

  const argv = [];

  if (format) {
    argv.push(`--format=${format}`);
  }

  if (grep) {
    argv.push(`--grep=${grep}`);
  }

  return Git.recentCommit(offset, argv);
}

// Get the recent step commit
function getRecentStepCommit(offset, format) {
  return getRecentCommit(offset, format, '^Step [0-9]\\+');
}

// Get the recent super step commit
function getRecentSuperStepCommit(offset, format) {
  return getRecentCommit(offset, format, '^Step [0-9]\\+:');
}

// Get the recent sub step commit
function getRecentSubStepCommit(offset, format) {
  return getRecentCommit(offset, format, '^Step [0-9]\\+\\.[0-9]\\+:');
}

// Extract step json from message
function getStepDescriptor(message) {
  if (message == null) { throw TypeError('A message must be provided'); }

  const match = message.match(/^Step (\d+(?:\.\d+)?)\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    message: match[2],
    type: match[1].split('.')[1] ? 'sub' : 'super',
  };
}

// Extract super step json from message
function getSuperStepDescriptor(message) {
  if (message == null) { throw TypeError('A message must be provided'); }

  const match = message.match(/^Step (\d+)\: ((?:.|\n)*)$/);

  return match && {
    number: Number(match[1]),
    message: match[2],
  };
}

// Extract sub step json from message
function getSubStepDescriptor(message) {
  if (message == null) { throw TypeError('A message must be provided'); }

  const match = message.match(/^Step ((\d+)\.(\d+))\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    superNumber: Number(match[2]),
    subNumber: Number(match[3]),
    message: match[4],
  };
}

// Push a new step with the provided message
function pushStep(message, options) {
  const step = getNextStep();
  commitStep(step, message, options);
  // Meta-data for step editing
  LocalStorage.setItem('REBASE_NEW_STEP', step);
}

// Pop the last step
function popStep() {
  const headHash = Git(['rev-parse', 'HEAD']);
  const rootHash = Git.rootHash();

  if (headHash == rootHash) { throw Error('Can\'t remove root'); }

  const removedCommitMessage = Git.recentCommit(['--format=%s']);
  const stepDescriptor = getStepDescriptor(removedCommitMessage);

  Git.print(['reset', '--hard', 'HEAD~1']);

  // Meta-data for step editing
  if (stepDescriptor) {
    LocalStorage.setItem('REBASE_NEW_STEP', getCurrentStep());

    // This will be used later on to update the manuals
    if (ensureStepMap()) {
      updateStepMap('remove', { step: stepDescriptor.number });
    }

    // Delete branch referencing the super step unless we're rebasing, in which case the
    // branches will be reset automatically at the end of the rebase
    if (stepDescriptor.type == 'super' && !Git.rebasing()) {
      const branch = Git.activeBranchName();

      Git(['branch', '-D', `${branch}-step${stepDescriptor.number}`]);
    }
  } else {
    return console.warn('Removed commit was not a step');
  }
}

// Finish the current with the provided message and tag it
function tagStep(message) {
  const step = getNextSuperStep();
  const tag = `step${step}`;
  const manualFile = `${tag}.tmpl`;
  const manualTemplatePath = Path.resolve(Paths.manuals.templates, manualFile);

  Fs.ensureDirSync(Paths.manuals.templates);
  Fs.ensureDirSync(Paths.manuals.views);
  Fs.writeFileSync(manualTemplatePath, '');

  Git(['add', manualTemplatePath]);

  commitStep(step, message);

  // Note that first we need to commit the new step and only then read the checkouts file
  // so we can have an updated hash list
  Submodule.ensure(step);

  // If we're in edit mode all the branches will be set after the rebase
  if (!Git.rebasing()) {
    const branch = Git.activeBranchName();
    // This branch will be used to run integration testing
    Git(['branch', `${branch}-step${step}`]);
  }

  // Meta-data for step editing
  LocalStorage.setItem('REBASE_NEW_STEP', step);
}

// Get the hash of the step followed by ~1, mostly useful for a rebase
function getStepBase(step) {
  if (!step) {
    const message = getRecentStepCommit('%s');
    if (!message) {
      return '--root';
    }

    step = getStepDescriptor(message).number;
  }

  if (step === 'root') {
    return '--root';
  }

  const hash = Git.recentCommit([
    `--grep=^Step ${step}:`,
    '--format=%h',
  ]);

  if (!hash) { throw Error('Step not found'); }

  return `${hash}~1`;
}

// Edit the provided step
function editStep(steps, options = {}) {
  if (steps instanceof Array) {
    steps = steps.slice().sort((a, b) => {
      const [superA, subA] = a.split('.');
      const [superB, subB] = b.split('.');

      // Always put the root on top
      if (a == 'root') {
        return -1;
      }

      if (b == 'root') {
        return 1;
      }

      // Put first steps first
      return (
        (superA - superB) ||
        (subA - subB)
      );
    });
  }
  // A single step was provided
  else {
    steps = [steps];
  }

  // The would always have to start from the first step
  const base = getStepBase(steps[0]);

  const argv = [Paths.tortilla.editor, 'edit', ...steps];

  if (options.udiff) {
    argv.push('--udiff');
  }

  Git.print(['rebase', '-i', base, '--keep-empty'], {
    env: {
      GIT_SEQUENCE_EDITOR: `node ${argv.join(' ')}`,
    },
  });

  // Ensure submodules are set to the right branches when picking the new super step
  if (steps[0] == 'root') {
    Submodule.ensure('root');
  }
}

// Adjust all the step indexes from the provided step
function sortStep(step) {
  // If no step was provided, take the most recent one
  if (!step) {
    step = getRecentStepCommit('%s');
    step = getStepDescriptor(step);
    step = step ? step.number : 'root';
  }

  let newStep;
  let oldStep;
  let base;

  // If root, make sure to sort all step indexes since the beginning of history
  if (step === 'root') {
    newStep = '1';
    oldStep = 'root';
    base = '--root';
  } else { // Else, adjust only the steps in the given super step
    newStep = step.split('.').map(Number)[0];
    oldStep = newStep - 1 || 'root';
    newStep = `${newStep}.${1}`;
    base = getStepBase(newStep);
  }

  // Setting local storage variables so re-sortment could be done properly
  LocalStorage.setItem('REBASE_NEW_STEP', newStep);
  LocalStorage.setItem('REBASE_OLD_STEP', oldStep);

  Git.print(['rebase', '-i', base, '--keep-empty'], {
    env: {
      GIT_SEQUENCE_EDITOR: `node ${Paths.tortilla.editor} sort`,
    },
  });
}

// Reword the provided step with the provided message
function rewordStep(step, message) {
  const base = getStepBase(step);
  const argv = [Paths.tortilla.editor, 'reword'];
  if (message) {
    argv.push('-m', `"${message}"`);
  }

  Git.print(['rebase', '-i', base, '--keep-empty'], {
    env: {
      GIT_SEQUENCE_EDITOR: `node ${argv.join(' ')}`,
    },
  });
}

// Add a new commit of the provided step with the provided message
function commitStep(step, message, options = {}) {
  const argv = ['commit'];
  if (message) {
    argv.push('-m', message);
  }
  if (options.allowEmpty) {
    argv.push('--allow-empty');
  }

  // Specified step is gonna be used for when forming the commit message
  LocalStorage.setItem('HOOK_STEP', step);

  try {
    // commit
    Git.print(argv);
  } catch (err) { // Can't use finally because local-storage also uses try-catch
    // Clearing storage to prevent conflicts with upcoming commits
    LocalStorage.removeItem('HOOK_STEP');
    throw err;
  }
}

// Get the current step
function getCurrentStep() {
  // Probably root commit
  const recentStepCommit = getRecentStepCommit('%s');
  if (!recentStepCommit) {
    return 'root';
  }

  // Cover unexpected behavior
  const descriptor = getStepDescriptor(recentStepCommit);
  if (!descriptor) {
    return 'root';
  }

  return descriptor.number;
}

// Get the current super step
function getCurrentSuperStep() {
  // Probably root commit
  const recentStepCommit = getRecentSuperStepCommit('%s');
  if (!recentStepCommit) {
    return 'root';
  }

  // Cover unexpected behavior
  const descriptor = getSuperStepDescriptor(recentStepCommit);
  if (!descriptor) {
    return 'root';
  }

  return descriptor.number;
}

// Get the next step
function getNextStep(offset) {
  // Fetch data about recent step commit
  const stepCommitMessage = getRecentStepCommit(offset, '%s');
  const followedByStep = !!stepCommitMessage;

  // If no previous steps found return the first one
  if (!followedByStep) {
    return '1.1';
  }

  // Fetch data about current step
  const stepDescriptor = getStepDescriptor(stepCommitMessage);
  const stepNumbers = stepDescriptor.number.split('.');
  const superStepNumber = Number(stepNumbers[0]);
  const subStepNumber = Number(stepNumbers[1]);
  const isSuperStep = !subStepNumber;

  if (!offset) {
    // If this is a super step return the first sub step of a new step
    if (isSuperStep) {
      return `${superStepNumber + 1}.${1}`;
    }
    // Else, return the next step as expected
    return `${superStepNumber}.${subStepNumber + 1}`;
  }

  // Fetch data about next step
  const nextStepCommitMessage = getRecentStepCommit(offset - 1, '%s');
  const nextStepDescriptor = getStepDescriptor(nextStepCommitMessage);
  const nextStepNumbers = nextStepDescriptor.number.split('.');
  const nextSubStepNumber = Number(nextStepNumbers[1]);
  const isNextSuperStep = !nextSubStepNumber;

  if (isNextSuperStep) {
    // If this is a super step return the next super step right away
    if (isSuperStep) {
      return (superStepNumber + 1).toString();
    }
    // Else, return the current super step
    return superStepNumber.toString();
  }

  // If this is a super step return the first sub step of the next step
  if (isSuperStep) {
    return `${superStepNumber + 1}.${1}`;
  }
  // Else, return the next step as expected
  return `${superStepNumber}.${subStepNumber + 1}`;
}

// Get the next super step
function getNextSuperStep(offset) {
  return getNextStep(offset).split('.')[0];
}

function initializeStepMap() {
  const map = Git([
    'log', '--format=%s', '--grep=^Step [0-9]\\+'
  ])
  .split('\n')
  .filter(Boolean)
  .reduce((map, subject) => {
    const number = getStepDescriptor(subject).number;
    map[number] = number;
    return map;
  }, {});

  LocalStorage.setItem('STEP_MAP', JSON.stringify(map));
}

function getStepMap() {
  if (ensureStepMap()) {
    return JSON.parse(LocalStorage.getItem('STEP_MAP'));
  }
}

function ensureStepMap() {
  return Utils.exists(Path.resolve(Paths.storage, 'STEP_MAP'), 'file');
}

function disposeStepMap() {
  LocalStorage.deleteItem('STEP_MAP');
}

function updateStepMap(type, payload) {
  const map = getStepMap();

  switch (type) {
    case 'remove':
      delete map[payload.step];

      break;

    case 'reset':
      map[payload.oldStep] = payload.newStep;

      break;
  }

  LocalStorage.setItem('STEP_MAP', JSON.stringify(map));
}

/**
  Contains step related utilities.
 */

(() => {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm'],
    boolean: ['root', 'udiff', 'allow-empty'],
  });

  const method = argv._[0];
  let step = argv._[1];
  const message = argv.message || argv.m;
  const root = argv.root;
  const allowEmpty = argv['allow-empty'];
  const udiff = argv.udiff;

  if (!step && root) {
    step = 'root';
  }

  const options = {
    allowEmpty,
    udiff,
  };

  switch (method) {
    case 'push': return pushStep(message, options);
    case 'pop': return popStep();
    case 'tag': return tagStep(message);
    case 'edit': return editStep(step, options);
    case 'sort': return sortStep(step);
    case 'reword': return rewordStep(step, message);
  }
})();

module.exports = {
  push: pushStep,
  pop: popStep,
  tag: tagStep,
  edit: editStep,
  sort: sortStep,
  reword: rewordStep,
  commit: commitStep,
  current: getCurrentStep,
  currentSuper: getCurrentSuperStep,
  next: getNextStep,
  nextSuper: getNextSuperStep,
  base: getStepBase,
  recentCommit: getRecentStepCommit,
  recentSuperCommit: getRecentSuperStepCommit,
  recentSubCommit: getRecentSubStepCommit,
  descriptor: getStepDescriptor,
  superDescriptor: getSuperStepDescriptor,
  subDescriptor: getSubStepDescriptor,
  initializeStepMap,
  getStepMap,
  ensureStepMap,
  disposeStepMap,
  updateStepMap,
};

Submodule = require('./submodule');
