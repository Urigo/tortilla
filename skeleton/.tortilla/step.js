var Fs = require('fs');
var Minimist = require('minimist');
var Path = require('path');
var Paths = require('./paths');
var Utils = require('./utils');

/*
  Contains step related utilities. Also the entry point for `npm step` commands.
 */

var commit = Utils.commit;
var git = Utils.git;


(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm'],
    boolean: ['root', 'r', 'allow-empty']
  });

  var method = argv._[0];
  var step = argv._[1];
  var root = argv.root || argv.r;
  var message = argv.message || argv.m;
  var allowEmpty = argv['allow-empty'];

  if (!step && root) step = 'root';

  // Automatically invoke a method by the provided arguments
  switch (method) {
    case 'push': return pushStep(message, allowEmpty);
    case 'pop': return popStep();
    case 'tag': return tagStep(message);
    case 'edit': return editStep(step);
    case 'reword': return rewordStep(step, message);
  }
})();

// Push a new step with the provided message
function pushStep(message, allowEmpty) {
  var step = getNextStep();
  commitStep(step, message, allowEmpty);
}

// Pop the last step
function popStep() {
  var headHash = git(['rev-parse', 'HEAD']);
  var rootHash = git(['rev-parse', 'root']);

  if (headHash == rootHash)
    throw Error('Can\'t remove root')

  var removedCommitMessage = Utils.recentCommit(['--format=%s']);
  git.print(['reset', '--hard', 'HEAD~1']);

  var stepDescriptor = getStepDescriptor(removedCommitMessage);

  if (!stepDescriptor)
    return console.warn('Removed commit was not a step');

  // Tag removal should be done by the editor after continuing rebase in case
  // of abortion otherwise we are skrewed
  if (Utils.rebasing()) return;

  var isSuperStep = !!getSuperStepDescriptor(removedCommitMessage);
  // If this is a super step, delete the tag of the popped commit
  if (!isSuperStep) return;

  var tag = 'step' + stepDescriptor.number;

  if (Utils.tagExists(tag)) return git(['tag', '-d', tag]);
  console.warn('Tag was not found');
}

// Finish the current with the provided message and tag it
function tagStep(message) {
  var step = getNextSuperStep();
  var tag = 'step' + step;
  var stepFilePath = Path.resolve(Paths.steps, 'step' + step + '.md');

  if (!Utils.exists(Paths.steps)) Fs.mkdirSync(Paths.steps);
  Fs.writeFileSync(stepFilePath, '');

  git(['add', stepFilePath]);
  commitStep(step, message);
  // If in the middle of rebase, don't add a tag since the process can be aborted.
  // The tag will be added later on by the git editor
  if (!Utils.rebasing()) git.print(['tag', tag]);
}

// Edit the provided step
function editStep(step) {
  if (step == null)
    throw TypeError('A step must be provided');

  var base = getStepBase(step);

  git.print(['rebase', '-i', base, '--keep-empty'], {
    GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' edit'
  });
}

// Reword the provided step with the provided message
function rewordStep(step, message) {
  if (step == null)
    throw TypeError('A step must be provided');

  var base = getStepBase(step);
  var argv = [Paths.tortilla.editor, 'reword'];
  if (message) argv.push('-m', '"' + message + '"');

  git.print(['rebase', '-i', base, '--keep-empty'], {
    GIT_SEQUENCE_EDITOR: 'node ' + argv.join(' ')
  });
}

// Add a new commit of the provided step with the provided message
function commitStep(step, message, allowEmpty) {
  var optionalArgs = [];
  if (allowEmpty) optionalArgs.push('--allow-empty');

  // If message was probided commit as expected
  if (message) {
    // Add step prefix
    message = 'Step ' + step + ': ' + message;
    return commit.print(['-m', message].concat(optionalArgs));
  }

  // Open editor
  commit.print();
  // Take the message we just typed
  message = Utils.recentCommit(['--format=%B']);
  // Add step prefix
  message = 'Step ' + step + ': ' + message;
  return commit.print(['--amend', '-m', message].concat(optionalArgs));
}

// Get the current step
function getCurrentStep() {
  var recentStepCommit = getRecentStepCommit('%s');
  return getStepDescriptor(recentStepCommit).number;
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
  if (step == null)
    throw TypeError('A step must be provided');

  if (step == 'root') {
    var stepRootHash = git(['rev-parse', 'root']);
    var nativeRootHash = git(['rev-list', '--max-parents=0', 'HEAD']);
    return stepRootHash == nativeRootHash ? '--root' : 'root~1';
  }

  var hash = Utils.recentCommit([
    '--grep=^Step ' + step,
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

  return Utils.recentCommit(offset, argv);
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