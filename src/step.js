var Fs = require('fs-extra');
var Minimist = require('minimist');
var Path = require('path');
var Git = require('./git');
var LocalStorage = require('./local-storage');
var Paths = require('./paths');
var Utils = require('./utils');

/*
  Contains step related utilities.
 */

(function () {
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm'],
    boolean: ['root', 'allow-empty']
  });

  var method = argv._[0];
  var step = argv._[1];
  var message = argv.message || argv.m;
  var root = argv.root;
  var allowEmpty = argv['allow-empty'];

  if (!step && root) step = 'root';

  var options = {
    allowEmpty: allowEmpty
  };

  switch (method) {
    case 'push': return pushStep(message, options);
    case 'pop': return popStep();
    case 'tag': return tagStep(message);
    case 'edit': return editStep(step);
    case 'reword': return rewordStep(step, message);
  }
})();

// Push a new step with the provided message
function pushStep(message, options) {
  var step = getNextStep();
  commitStep(step, message, options);
  // Meta-data for step editing
  LocalStorage.setItem('REBASE_NEW_STEP', step);
}

// Pop the last step
function popStep() {
  var headHash = Git(['rev-parse', 'HEAD']);
  var rootHash = Git(['rev-list', '--max-parents=0', 'HEAD']);

  if (headHash == rootHash)
    throw Error('Can\'t remove root')

  var removedCommitMessage = Git.recentCommit(['--format=%s']);
  var stepDescriptor = getStepDescriptor(removedCommitMessage);

  Git.print(['reset', '--hard', 'HEAD~1']);

  if (stepDescriptor)
    // Meta-data for step editing
    LocalStorage.setItem('REBASE_NEW_STEP', getCurrentStep());
  else
    return console.warn('Removed commit was not a step');

  // Tag removal should be done by the editor after continuing rebase in case
  // of abortion otherwise we are screwed
  if (Git.rebasing()) return;

  var isSuperStep = !!stepDescriptor.number.split('.')[1];
  // If this is a super step, delete the tag of the popped commit
  if (!isSuperStep) return;

  var tag = 'step' + stepDescriptor.number;
  if (Git.tagExists(tag)) return Git(['tag', '-d', tag]);

  console.warn('Tag was not found');
}

// Finish the current with the provided message and tag it
function tagStep(message) {
  var step = getNextSuperStep();
  var tag = 'step' + step;
  var manualFile = tag + '.md';
  var manualPath = Path.resolve(Paths.steps, manualFile);

  if (!Utils.exists(Paths.steps)) Fs.mkdirSync(Paths.steps);
  Fs.writeFileSync(manualPath, '');

  Git(['add', manualPath]);
  commitStep(step, message);

  // Meta-data for step editing
  LocalStorage.setItem('REBASE_NEW_STEP', step);

  // If in the middle of rebase, don't add a tag since the process can be aborted.
  // The tag will be added later on by the git editor
  if (!Git.rebasing()) {
    Git.print(['tag', tag]);
  }
}

// Edit the provided step
function editStep(step) {
  var base = getStepBase(step);

  Git.print(['rebase', '-i', base, '--keep-empty'], {
    env: {
      GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' edit'
    }
  });
}

// Reword the provided step with the provided message
function rewordStep(step, message) {
  var base = getStepBase(step);
  var argv = [Paths.tortilla.editor, 'reword'];
  if (message) argv.push('-m', '"' + message + '"');

  Git.print(['rebase', '-i', base, '--keep-empty'], {
    env: {
      GIT_SEQUENCE_EDITOR: 'node ' + argv.join(' ')
    }
  });
}

// Add a new commit of the provided step with the provided message
function commitStep(step, message, options) {
  options = options || {};

  var argv = ['commit'];
  if (message) argv.push('-m', message);
  if (options.allowEmpty) argv.push('--allow-empty');

  // Specified step is gonna be used for when forming the commit message
  LocalStorage.setItem('HOOK_STEP', step);

  try {
    // commit
    Git.print(argv);
  }
  // Can't use finally because local-storage also uses try-catch
  catch (err) {
    // Clearing storage to prevent conflicts with upcoming commits
    LocalStorage.removeItem('HOOK_STEP');
    throw err;
  }
}

// Get the current step
function getCurrentStep() {
  var recentStepCommit = getRecentStepCommit('%s');
  if (!recentStepCommit) return 0;

  var descriptor = getStepDescriptor(recentStepCommit);
  if (!descriptor) return 0;

  return descriptor.number;
}

// Get the next step
function getNextStep(offset) {
  // Fetch data about recent step commit
  var stepCommitMessage = getRecentStepCommit(offset, '%s');
  var followedByStep = !!stepCommitMessage;

  // If no previous steps found return the first one
  if (!followedByStep) return '1.1';

  // Fetch data about current step
  var stepDescriptor = getStepDescriptor(stepCommitMessage);
  var stepNumbers = stepDescriptor.number.split('.');
  var superStepNumber = Number(stepNumbers[0]);
  var subStepNumber = Number(stepNumbers[1]);
  var isSuperStep = !subStepNumber;

  if (!offset) {
    // If this is a super step return the first sub step of a new step
    if (isSuperStep) return (superStepNumber + 1) + '.' + 1;
    // Else, return the next step as expected
    return superStepNumber + '.' + (subStepNumber + 1);
  }

  // Fetch data about next step
  var nextStepCommitMessage = getRecentStepCommit(offset - 1, '%s');
  var nextStepDescriptor = getStepDescriptor(nextStepCommitMessage);
  var nextStepNumbers = nextStepDescriptor.number.split('.');
  var nextSuperStepNumber = Number(nextStepNumbers[0]);
  var nextSubStepNumber = Number(nextStepNumbers[1]);
  var isNextSuperStep = !nextSubStepNumber;

  if (isNextSuperStep) {
    // If this is a super step return the next super step right away
    if (isSuperStep) return (superStepNumber + 1).toString();
    // Else, return the current super step
    return superStepNumber.toString();
  }

  // If this is a super step return the first sub step of the next step
  if (isSuperStep) return (superStepNumber + 1) + '.' + 1;
  // Else, return the next step as expected
  return superStepNumber + '.' + (subStepNumber + 1);
}

// Get the next super step
function getNextSuperStep(offset) {
  return getNextStep(offset).split('.')[0];
}

// Get the hash of the step followed by ~1, mostly useful for a rebase
function getStepBase(step) {
  if (!step) {
    var message = getRecentStepCommit('%s');
    if (!message) return '--root';

    step = getStepDescriptor(message).number;
  }

  if (step == 'root') return '--root';

  var hash = Git.recentCommit([
    '--grep=^Step ' + step + ':',
    '--format=%h'
  ]);

  if (!hash)
    throw Error('Step not found');

  return hash + '~1';
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

// Get recent commit by specified arguments
function getRecentCommit(offset, format, grep) {
  if (typeof offset == 'string') {
    format = offset;
    offset = 0;
  }

  var argv = ['--grep=' + grep];
  if (format) argv.push('--format=' + format);

  return Git.recentCommit(offset, argv);
}

// Extract step json from message
function getStepDescriptor(message) {
  if (message == null)
    throw TypeError('A message must be provided');

  var match = message.match(/^Step (\d+(?:\.\d+)?)\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    message: match[2]
  };
}

// Extract super step json from message
function getSuperStepDescriptor(message) {
  if (message == null)
    throw TypeError('A message must be provided');

  var match = message.match(/^Step (\d+)\: ((?:.|\n)*)$/);

  return match && {
    number: Number(match[1]),
    message: match[2]
  };
}

// Extract sub step json from message
function getSubStepDescriptor(message) {
  if (message == null)
    throw TypeError('A message must be provided');

  var match = message.match(/^Step ((\d+)\.(\d+))\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    superNumber: Number(match[2]),
    subNumber: Number(match[3]),
    message: match[4]
  };
}


module.exports = {
  push: pushStep,
  pop: popStep,
  tag: tagStep,
  edit: editStep,
  reword: rewordStep,
  commit: commitStep,
  current: getCurrentStep,
  next: getNextStep,
  nextSuper: getNextSuperStep,
  base: getStepBase,
  recentCommit: getRecentStepCommit,
  recentSuperCommit: getRecentSuperStepCommit,
  recentSubCommit: getRecentSubStepCommit,
  descriptor: getStepDescriptor,
  superDescriptor: getSuperStepDescriptor,
  subDescriptor: getSubStepDescriptor
};