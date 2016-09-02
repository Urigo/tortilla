var Minimist = require('minimist');
var Path = require('path');
var LocalStorage = require('./local-storage');
var Utils = require('./utils');


var git = Utils.git;
var exec = Utils.exec;

var argv = Minimist(process.argv.slice(2));

var editorPath = Path.resolve('./editor');
var stepsDirPath = Path.resolve('../steps');

if (argv.push)
  pushStep(argv.message || argv.m);
else if (argv.pop)
  popStep();
else if (argv.tag)
  tagStep(argv.message || argv.m);
else if (argv.edit)
  editStep(argv.step || argv.s);
else if (argv.reword)
  rewordStep(argv.step || argv.s, argv.message || argv.m);


function pushStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var step = getNextStep();
  git('commit -m "Step ' + step + ': ' + message + '"');

  LocalStorage.setItem('STEP', step);
}

function popStep() {
  var removedCommitMessage = Utils.recentCommit({format: '%s'});
  git('reset --hard HEAD~1');

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

  git('add ' + stepFilePath);
  git('commit -m "Step ' + step + ': ' + message + '"');

  if (Utils.isOrigHead()) git('tag -a step' + step);

  LocalStorage.setItem('STEP', step);
}

function retagStep(oldStep, newStep) {
  if (oldStep == newStep) return;
  var newStepTagExists = !!git('git describe --tags --match step' + newStep);

  if (newStepTagExists) {
    var diff = newStep - oldStep;
    var increment = diff / Math.abs(diff);

    retagStep(oldStep + increment, newStep + increment);
    retagStep(oldStep, newStep);
  }

  git('tag step' + newStep + ' step' + oldStep);
  git('tag -d step' + oldStep);
}

function editStep(step) {
  if (!step)
    throw TypeError('A step must be provided');

  var base = getStepBase(step);

  git('rebase -i ' + base, {
    GIT_EDITOR: "node " + editorPath + ' --edit'
  });

  LocalStorage.setItem('STEP', step);

  // TODO: Move to rebase exec method
  while (!Utils.isOrigHead()) {
    var currentCommitMessage = Utils.recentCommit({format: '%s'});
    var currentStep = extractStep(currentCommitMessage);

    var message = currentStep.message;
    var nextStep = getNextStep();
    currentStep = currentStep.number;

    var currentStepFileName = exec('ls step' + currentStep + '~*');
    var nextStepFileName = exec('ls step' + nextStep + '~*');

    var currentStepFilePath = stepsDirPath + '/' + currentStepFileName;
    var newStepFilePath = stepsDirPath + '/' + nextStepFileName;

    Fs.renameSync(currentStepFilePath, newStepFilePath);
    git('add ' + newStepFilePath);

    git('commit --ammend', {
      GIT_EDITOR: 'node ' + editorPath + ' --reword --message="' + message + '"'
    });

    retagStep(currentStep, nextStep);

    git('rebase --continue');
  }
}

function rewordStep(step, message) {
  if (!step)
    throw TypeError('A step must be provided');
  if (!message)
    throw TypeError('A message must be provided');

  var base = getStepBase(step);

  git('rebase -i ' + base, {
    GIT_EDITOR: 'node ' + editorPath + ' --reword --message="' + message + '"'
  });

  LocalStorage.setItem('STEP', step);
}

function getNextStep() {
  var recentCommitHash = Utils.recentCommit({format: '%h'});
  var recentStepHash = getRecentSuperStepCommit('%h');
  var followedByStep = recentStepHash == recentCommitHash;

  if (followedByStep) {
    var recentCommitMessage = Utils.recentCommit({format: '%s'});
    var recentSuperStep = extractSuperStep(recentCommitMessage).number;
    var superStep = recentSuperStep + 1;
    var subStep = 1;
  }
  else {
    var recentSubStepHash = getRecentSubStepCommit('%h');
    var followedBySubStep = recentSubStepHash == recentCommitHash;

    if (followedBySubStep) {
      var recentCommitMessage = Utils.recentCommit({format: '%s'});
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

function getRecentStepCommit(format) {
  return Utils.recentCommit({grep: '^Step .+\\:', format: format});
}

function getRecentSuperStepCommit(format) {
  return Utils.recentCommit({grep: '^Step \\d+\\:', format: format});
}

function getRecentSubStep(format) {
  return Utils.recentCommit({grep: '^Step \\d+\\.\\d+\\:', format: format});
}

function extractStep(message) {
  var match = message.match(/^Step (.+)\: (?:(.|\n)*)$/);

  return match && {
    number: match[1],
    message: match[2]
  };
}

function extractSuperStep(message) {
  var match = message.match(/^Step (\d+)\: (?:(.|\n)*)$/);

  return match && {
    number: match[1],
    message: match[2]
  };
}

function extractSubStep(message) {
  var match = message.match(/^Step ((\d+)\.(\d+))\: (?:(.|\n)*)$/);

  return match && {
    number: match[1],
    superNumber: match[2],
    subNumber: match[3],
    message: match[4]
  };
}

function getStepBase(step) {
  var hash = Utils.recentCommit({grep: '^Step ' + step, format: '%h'});

  if (!hash)
    throw Error('Step not found');

  return hash + '~1';
}


module.exports = {
  push: pushStep,
  pop: popStep,
  tag: tagStep,
  retag: retagStep,
  edit: editStep,
  reword: rewordStep,
  next: getNextStep,
  recentStepCommit: getRecentStepCommit,
  recentSuperStepCommit: getRecentSuperStepCommit,
  recentSubStepCommit: getRecentSubStepCommit,
  extractStep: extractStep,
  extractSuperStep: extractSuperStep,
  extractSubStep: extractSubStep,
  stepBase: getStepBase
};