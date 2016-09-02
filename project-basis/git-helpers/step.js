var Minimist = require('minimist');
var Path = require('path');
var Utils = require('./utils');


var git = Utils.git;
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
}

function popStep() {
  git('reset --hard HEAD~1');
}

function tagStep(message) {
  if (!message)
    throw TypeError('A message must be provided');

  var recentStepMessage = git('log --grep="^Step \\d+\\:" --format="%s" --max-count=1');

  if (recentStepMessage) {
    var recentStep = recentStepMessage.match(/^Step (\d+)/)[1];
    var step = recentStep + 1;
  }
  else {
    var step = 1;
  }

  var stepFilePath = Path.resolve('./steps/step' + step + '.md');
  Fs.writeFileSync(stepFilePath);

  git('add ' + stepFilePath);
  git('commit -m "Step ' + step + ': ' + message + '"');
  git('tag -a step' + step);
}

function editStep(step) {
  var base = getStepBase(step);

  git('rebase -i ' + base, {
    GIT_EDITOR: "node " + editorPath + ' --edit'
  });

  while (!isOrigHead()) {
    var currentCommitMessage = git('log --format="%s" --max-count=1');
    var currentStepParts = currentCommitMessage.match(/^Step (.+)\: (?:(.|\n)*)$/);

    var currentStep = currentStepParts[0];
    var message = currentStepParts[1];
    var nexStep = getNextStep();

    var currentStepFilePath = stepsDirPath + '/' + currentStep;
    var newStepFilePath = stepsDirPath + '/' + nexStep;

    Fs.renameSync(currentStepFilePath, newStepFilePath);
    git('add ' + newStepFilePath);

    git('commit --ammend', {
      GIT_EDITOR: 'node ' + editorPath + ' --reword --message="' + message + '"'
    });

    git('tag step' + nexStep + ' step' + currentStep);
    git('tag -d step' + currentStep);

    git('rebase --continue');
  }
}

function rewordStep(step, message) {
  if (!message)
    throw TypeError('A message must be provided');

  var base = getStepBase(step);

  git('rebase -i ' + base, {
    GIT_EDITOR: 'node ' + editorPath + ' --reword --message="' + message + '"'
  });
}

function isOrigHead() {
  var head = git('rev-parse HEAD');
  var origHead = git('rev-parse ORIG_HEAD');
  return head == origHead;
}

function getNextStep() {
  var recentCommitHash = git('log --format="%h" --max-count=1');
  var recentStepHash = git('log --grep="^Step \\d+\\:" --format="%h" --max-count=1');
  var followedByStep = recentStepHash == recentCommitHash;

  if (followedByStep) {
    var recentCommitMessage = git('log --format="%s" --max-count=1');
    var recentSuperStep = recentCommitMessage.match(/^Step (\d+)/)[1];
    var superStep = recentSuperStep + 1;
    var subStep = 1;
  }
  else {
    var recentSubStepHash = git('log --grep="^Step \\d+\\.\\d+\\:" --format="%h" --max-count=1');
    var followedBySubStep = recentSubStepHash == recentCommitHash;

    if (followedBySubStep) {
      var recentCommitMessage = git('log --format="%s" --max-count=1');
      var recentStepParts = recentCommitMessage.match(/^Step (\d+).(\d+)/);
      var recentSuperStep = recentStepParts[1];
      var recentSubStep = recentStepParts[2];
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

function getStepBase(step) {
  if (!step) return '--root';

  var hash = git('log --grep="^Step ' + step + '" --format="%h" --max-count=1');

  if (!hash)
    throw Error('Step not found');

  return hash + '~1';
}


module.exports = {
  pushStep: pushStep,
  popStep: popStep,
  tagStep: tagStep,
  editStep: editStep,
  rewordStep: rewordStep,
  isOrigHead: isOrigHead,
  getNextStep: getNextStep,
  getStepBase: getStepBase
};