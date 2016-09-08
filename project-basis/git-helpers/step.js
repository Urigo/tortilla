var Minimist = require('minimist');
var Path = require('path');
var LocalStorage = require('./local-storage');
var Utils = require('./utils');


var git = Utils.git;

var editorPath = Path.resolve('./editor');
var stepsDirPath = Path.resolve('../steps');


(function () {
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2));
  var method = argv._[0];
  var message = argv.message || argv.m;
  var step = argv.step || arg.s;

  switch (method) {
    case 'push': return pushStep(message);
    case 'pop': return popStep();
    case 'tag': return tagStep(message);
    case 'edit': return editStep(step);
    case 'reword': return rewordStep(step, message);
  }
})();

function pushStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var step = getNextStep();
  commitStep(step, message);

  LocalStorage.setItem('STEP', step);
}

function popStep() {
  var removedCommitMessage = Utils.recentCommit(['--format=%s']);
  git(['reset', '--hard', 'HEAD~1']);

  var isStep = !!extractStep(removedCommitMessage);

  if (!isStep) {
    return console.warn('Removed commit was not a step');
  }

  var recentStepMessage = getRecentStepCommit('%s')
  var step = extractStep(recentStepMessage);
  step = step ? step.number : '';

  LocalStorage.setItem('STEP', step);
}

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

  git(['tag', 'step' + newStep, 'step' + oldStep);
  git(['tag', '-d', 'step' + oldStep]);
}

function editStep(step) {
  if (!step)
    throw TypeError('A step must be provided');

  var base = getStepBase(step);

  git(['rebase', '-i', base, {
    GIT_EDITOR: 'node "' + editorPath + ' edit' + '"'
  });

  LocalStorage.setItem('STEP', step);

  // TODO: Move to rebase exec method
  while (!Utils.isOrigHead()) {
    var currentCommitMessage = getRecentStepCommit('%s');
    var currentStep = extractStep(currentCommitMessage);

    var message = currentStep.message;
    var nextStep = getNextStep();
    currentStep = currentStep.number;

    var stepFiles = Fs.readdirSync(stepsDirPath);
    var currentStepFile;
    var nextStepFile;

    stepFiles.some(function (stepFile) {
      if (stepFile.match(new RegExp('step' + currentStep + '*')) {
        currentStepFile = stepFile;
        return false;
      }

      if (stepFile.match(new RegExp('step' + nextStep + '*')) {
        nextStepFile = stepFile;
        return false;
      }

      return currentStepFile && nextStep;
    });

    var currentStepFilePath = stepsDirPath + '/' + currentStepFile;
    var newStepFilePath = stepsDirPath + '/' + nextStepFile;

    Fs.renameSync(currentStepFilePath, newStepFilePath);
    git(['add', newStepFilePath]);

    git(['commit',  '--ammend'], {
      GIT_EDITOR: 'node "' + editorPath + ' reword --message="' + message + '"'
    });

    retagStep(currentStep, nextStep);

    git(['rebase', '--continue']);
  }
}

function rewordStep(step, message) {
  if (!step)
    throw TypeError('A step must be provided');
  if (!message)
    throw TypeError('A message must be provided');

  var base = getStepBase(step);

  git(['rebase', '-i', base], {
    GIT_EDITOR: 'node "' + editorPath + ' reword --message="' + message + '"'
  });

  LocalStorage.setItem('STEP', step);
}

function commitStep(step, message) {
  return git(['commit', '-m', 'Step ' + step + ': ' + message]);
}

function getCurrentStep() {
  var recentStepCommit = getRecentStepCommit('%s');
  return extractStep(recentStepCommit).number;
}

function getNextStep() {
  var recentCommitHash = Utils.recentCommit(['format=%h']);
  var recentStepHash = getRecentSuperStepCommit('%h');
  var followedByStep = recentStepHash == recentCommitHash;

  if (followedByStep) {
    var recentCommitMessage = Utils.recentCommit(['format=%s']);
    var recentSuperStep = extractSuperStep(recentCommitMessage).number;
    var superStep = recentSuperStep + 1;
    var subStep = 1;
  }
  else {
    var recentSubStepHash = getRecentSubStepCommit('%h');
    var followedBySubStep = recentSubStepHash == recentCommitHash;

    if (followedBySubStep) {
      var recentCommitMessage = Utils.recentCommit(['format=%s']);
      var recentStep = extractSubStep(recentCommitMessage);
      var recentSuperStep = recentStep.superNumber;
      var recentSubStep = recentStep.subNumber;
      var superStep = recentSuperStep;
      var subStep = recentSubStep + 1;
    }
    else {
      var superStep = 1;
      var subStep = 1;
    }
  }

  return superStep + '.' + subStep;
}

function getRecentOperation() {
  return LocalStorage.getItem('STEP');
}

function getStepBase(step) {
  if (!step)
    throw TypeError('A step must be provided');

  var hash = Utils.recentCommit.recentCommit([
    '--grep="' + (/^Step/).toString() + '"',
    '--format="%h"'
  ]);

  if (!hash)
    throw Error('Step not found');

  return hash + '~1';
}

function getRecentStepCommit(format) {
  var args = ['--grep="' + (/^Step \d+(?:\.\d+)?\:/).toString() + '"']
  if (format) args.push('--format="' + format + '"')

  return Utils.recentCommit(args);
}

function getRecentSuperStepCommit(format) {
  var args = ['--grep="' + (/^Step \d+\:/).toString() + '"']
  if (format) args.push('--format="' + format + '"')

  return Utils.recentCommit(args);
}

function getRecentSubStep(format) {
  var args = ['--grep="' + (/^Step \d+\.\d+\:/).toString() + '"']
  if (format) args.push('--format="' + format + '"')

  return Utils.recentCommit(args);
}

function extractStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var match = message.match(/^Step (\d+(?:\.\d+)?\:)\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    message: match[2]
  };
}

function extractSuperStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var match = message.match(/^Step (\d+)\: ((?:.|\n)*)$/);

  return match && {
    number: match[1],
    message: match[2]
  };
}

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