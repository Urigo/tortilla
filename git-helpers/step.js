var Minimist = require('minimist');
var Path = require('path');
var LocalStorage = require('./local-storage');
var Paths = require('./paths');
var Utils = require('./utils');


var git = Utils.git;


// Automatically invoke a method by the provided arguments
(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2));
  var method = argv._[0];
  var message = argv.message || argv.m;
  var step = argv.step || argv.s;

  switch (method) {
    case 'push': return pushStep(message);
    case 'pop': return popStep();
    case 'tag': return tagStep(message);
    case 'edit': return editStep(step);
    case 'reword': return rewordStep(step, message);
  }
})();

// Push a new step with the provided message
function pushStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var step = getNextStep();
  commitStep(step, message);

  LocalStorage.setItem('STEP', step);
}

// Pop the last step
function popStep() {
  var removedCommitMessage = Utils.recentCommit(['--format=%s']);
  git.print(['reset', '--hard', 'HEAD~1']);

  var step = extractStep(removedCommitMessage);

  if (!step) {
    return console.warn('Removed commit was not a step');
  }

  LocalStorage.setItem('STEP', step.number);
}

// Finish the current with the provided message and tag it
function tagStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var recentStepMessage = getRecentSuperStepCommit('%s');

  if (recentStepMessage) {
    var recentStep = extractSuperStep(recentStepMessage).number;
    var step = recentStep + 1;
  }
  else {
    var step = 1;
  }

  var stepFilePath = Path.resolve('./steps/step' + step + '.md');
  Fs.writeFileSync(stepFilePath);

  git(['add', stepFilePath]);
  commitStep(step, message);

  if (Utils.isOrigHead()) git(['tag', '-a', 'step' + step]);

  LocalStorage.setItem('STEP', step);
}

// Update the name of the tag from the old step to the new step
function retagStep(oldStep, newStep) {
  if (!oldStep)
    throw TypeError('An old step must be provided');
  if (!newStep)
    throw TypeError('A new step must be provided');

  if (oldStep == newStep) return;
  var newStepTagExists = !!git(['describe', '--tags', '--match', 'step' + newStep]);

  if (newStepTagExists) {
    var diff = newStep - oldStep;
    var increment = diff / Math.abs(diff);

    retagStep(oldStep + increment, newStep + increment);
    retagStep(oldStep, newStep);
  }

  git(['tag', 'step' + newStep, 'step' + oldStep]);
  git(['tag', '-d', 'step' + oldStep]);
}

// Edit the provided step
function editStep(step) {
  if (!step)
    throw TypeError('A step must be provided');

  var base = getStepBase(step);

  git(['rebase', '-i', base], {
    GIT_EDITOR: 'node ' + Paths.editor + ' edit'
  });

  LocalStorage.setItem('STEP', step);
}

// Reword the provided step with the provided message
function rewordStep(step, message) {
  if (!step)
    throw TypeError('A step must be provided');
  if (!message)
    throw TypeError('A message must be provided');

  var base = getStepBase(step);

  git(['rebase', '-i', base], {
    GIT_EDITOR: 'node ' + Paths.editor + ' reword --message="' + message + '"'
  });

  LocalStorage.setItem('STEP', step);
}

// Add a new commit of the provided step with the provided message
function commitStep(step, message) {
  return git.print(['commit', '-m', 'Step ' + step + ': ' + message]);
}

// Get the current step
function getCurrentStep() {
  var recentStepCommit = getRecentStepCommit('%s');
  return extractStep(recentStepCommit).number;
}

// Get the next step
function getNextStep() {
  var recentCommitHash = Utils.recentCommit(['--format=%h']);
  var recentStepHash = getRecentSuperStepCommit('%h');
  var followedByStep = recentStepHash == recentCommitHash;

  // If followed by a whole step, start a new super step
  if (followedByStep) {
    var recentCommitMessage = Utils.recentCommit(['--format=%s']);
    var recentSuperStep = extractSuperStep(recentCommitMessage).number;
    var superStep = Number(recentSuperStep) + 1;
    var subStep = 1;
  }
  else {
    var recentSubStepHash = getRecentSubStepCommit('%h');
    var followedBySubStep = recentSubStepHash == recentCommitHash;

    // If followed by a sub step, increase the sub step index
    if (followedBySubStep) {
      var recentCommitMessage = Utils.recentCommit(['--format=%s']);
      var recentStep = extractSubStep(recentCommitMessage);
      var recentSuperStep = recentStep.superNumber;
      var recentSubStep = recentStep.subNumber;
      var superStep = recentSuperStep;
      var subStep = Number(recentSubStep) + 1;
    }
    // If not followed by any step, compose the initial step
    else {
      var superStep = 1;
      var subStep = 1;
    }
  }

  return superStep + '.' + subStep;
}

// Get the number of the last step who was manipulated
function getRecentOperation() {
  return LocalStorage.getItem('STEP');
}

// Get the hash of the step followed by ~1, mostly useful for a rebase
function getStepBase(step) {
  if (!step)
    throw TypeError('A step must be provided');

  var hash = Utils.recentCommit.recentCommit([
    '--grep=^Step ' + step,
    '--format=%h'
  ]);

  if (!hash)
    throw Error('Step not found');

  return hash + '~1';
}

// Get the recent step commit
function getRecentStepCommit(format) {
  var args = ['--grep=^Step [0-9]\\+'];
  if (format) args.push('--format=' + format);

  return Utils.recentCommit(args);
}

// Get the recent super step commit
function getRecentSuperStepCommit(format) {
  var args = ['--grep=^Step [0-9]\\+:'];
  if (format) args.push('--format=' + format);

  return Utils.recentCommit(args);
}

// Get the recent sub step commit
function getRecentSubStepCommit(format) {
  var args = ['--grep=^Step [0-9]\\+\\.[0-9]\\+:'];
  if (format) args.push('--format=' + format);

  return Utils.recentCommit(args);
}

// Extract step json from message
function extractStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var match = message.match(/^Step (\d+(?:\.\d+)?)\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    message: match[2]
  };
}

// Extract super step json from message
function extractSuperStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var match = message.match(/^Step (\d+)\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    message: match[2]
  };
}

// Extract sub step json from message
function extractSubStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var match = message.match(/^Step ((\d+)\.(\d+))\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    superNumber: match[2],
    subNumber: match[3],
    message: match[4]
  };
}


module.exports = {
  push: pushStep,
  pop: popStep,
  tag: tagStep,
  retag: retagStep,
  edit: editStep,
  reword: rewordStep,
  commit: commitStep,
  current: getCurrentStep,
  next: getNextStep,
  stepBase: getStepBase,
  recentOperation: getRecentOperation,
  recentStepCommit: getRecentStepCommit,
  recentSuperStepCommit: getRecentSuperStepCommit,
  recentSubStepCommit: getRecentSubStepCommit,
  extractStep: extractStep,
  extractSuperStep: extractSuperStep,
  extractSubStep: extractSubStep
};