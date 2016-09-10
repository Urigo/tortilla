var Fs = require('fs');
var Minimist = require('minimist');
var Path = require('path');
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
  if (message == null)
    throw TypeError('A message must be provided');

  var step = getNextStep();
  commitStep(step, message);
}

// Pop the last step
function popStep() {
  var removedCommitMessage = Utils.recentCommit(['--format=%s']);
  git.print(['reset', '--hard', 'HEAD~1']);

  var stepDescriptor = getStepDescriptor(removedCommitMessage);

  if (!stepDescriptor) {
    return console.warn('Removed commit was not a step');
  }

  var isSuperStep = !!getSuperStepDescriptor(removedCommitMessage);

  // If this is a super step, delete the tag of the popped commit unless in the middle of
  // rebase, since the process can be aborted. The tag will be added latedr on by the
  // git editor
  if (isSuperStep && !Utils.rebasing()) {
    git(['tag', '-d', 'step' + stepDescriptor.number]);
  }
}

// Finish the current with the provided message and tag it
function tagStep(message) {
  if (message == null)
    throw TypeError('A message must be provided');

  var recentStepMessage = getRecentSuperStepCommit('%s');

  if (recentStepMessage) {
    var recentStep = getSuperStepDescriptor(recentStepMessage).number;
    var step = recentStep + 1;
  }
  else {
    var step = 1;
  }

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

// Update the name of the tag from the old step to the new step. The hash argument is an
// optional argument representing a commit that should be tagged with the new step, which
// is handy in case the old step tag does'nt exist anymore in the current commits history
function retagStep(oldStep, newStep, hash) {
  if (oldStep == null)
    throw TypeError('An old step must be provided');
  if (newStep == null)
    throw TypeError('A new step must be provided');

  // Converting to numbers just in case
  oldStep = Number(oldStep);
  newStep = Number(newStep);

  // Composing tags
  var oldTag = 'step' + oldStep;
  var newTag = 'step' + newStep;

  // In case the new step is below the possible steps range, just shift it away
  if (newStep < 1) {
    return git(['tag', '-d', oldTag]);
  }

  if (!hash) {
    // If both steps are the same and the hash remained there is no need in renaming
    if (oldStep == newStep) return;
    // The new tag will just be a reference to the old tag
    hash = oldTag;
  }

  var diff = newStep - oldStep;

  // In case the new name already exists rename it as well so the name will be available
  if (diff && Utils.tagExists(newTag)) {
    var increment = diff / Math.abs(diff);
    retagStep(oldStep + increment, newStep + increment);
  }

  // Set a new tag and delete the old one. Note that some tags might share the same name
  // but would stil need retagging since the hash might have changed
  git(['tag', newTag, hash]);
  git(['tag', '-d', oldTag]);
}

// Edit the provided step
function editStep(step) {
  if (step == null)
    throw TypeError('A step must be provided');

  var base = getStepBase(step);

  git.print(['rebase', '-i', base], {
    GIT_SEQUENCE_EDITOR: 'node ' + Paths.git.helpers.editor + ' edit'
  });
}

// Reword the provided step with the provided message
function rewordStep(step, message) {
  if (step == null)
    throw TypeError('A step must be provided');
  if (message == null)
    throw TypeError('A message must be provided');

  var base = getStepBase(step);

  git.print(['rebase', '-i', base], {
    GIT_SEQUENCE_EDITOR: 'node ' + Paths.git.helpers.editor + ' reword --message="' + message + '"'
  });
}

// Add a new commit of the provided step with the provided message
function commitStep(step, message) {
  return git.print(['commit', '-m', 'Step ' + step + ': ' + message]);
}

// Get the current step
function getCurrentStep() {
  var recentStepCommit = getRecentStepCommit('%s');
  return getStepDescriptor(recentStepCommit).number;
}

// Get the next step
function getNextStep(offset) {
  var recentCommitHash = Utils.recentCommit(offset, ['--format=%h']);
  var recentStepHash = getRecentSuperStepCommit(offset, '%h');
  var followedByStep = recentStepHash == recentCommitHash;

  // If followed by a whole step, start a new super step
  if (followedByStep) {
    var recentCommitMessage = Utils.recentCommit(offset, ['--format=%s']);
    var recentSuperStep = getSuperStepDescriptor(recentCommitMessage).number;
    var superStep = recentSuperStep + 1;
    var subStep = 1;
  }
  else {
    var recentSubStepHash = getRecentSubStepCommit(offset, '%h');
    var followedBySubStep = recentSubStepHash == recentCommitHash;

    // If followed by a sub step, increase the sub step index
    if (followedBySubStep) {
      var recentCommitMessage = Utils.recentCommit(offset, ['--format=%s']);
      var recentStepDescriptor = getSubStepDescriptor(recentCommitMessage);
      var superStep = recentStepDescriptor.superNumber;
      var subStep = recentStepDescriptor.subNumber + 1;
    }
    // If not followed by any step, compose the initial step
    else {
      var superStep = 1;
      var subStep = 1;
    }
  }

  return superStep + '.' + subStep;
}

// Get the hash of the step followed by ~1, mostly useful for a rebase
function getStepBase(step) {
  if (step == null)
    throw TypeError('A step must be provided');

  var hash = Utils.recentCommit([
    '--grep=^Step ' + step,
    '--format=%h'
  ]);

  if (!hash)
    throw Error('Step not found');

  return hash.trim() + '~1';
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

  var args = ['--grep=' + grep];
  if (format) args.push('--format=' + format);

  return Utils.recentCommit(offset, args);
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
  retag: retagStep,
  edit: editStep,
  reword: rewordStep,
  commit: commitStep,
  current: getCurrentStep,
  next: getNextStep,
  base: getStepBase,
  recentCommit: getRecentStepCommit,
  recentSuperCommit: getRecentSuperStepCommit,
  recentSubCommit: getRecentSubStepCommit,
  descriptor: getStepDescriptor,
  superDescriptor: getSuperStepDescriptor,
  subDescriptor: getSubStepDescriptor
};