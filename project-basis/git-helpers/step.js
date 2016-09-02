var Minimist = require('minimist');
var Path = require('path');
var Utils = require('./utils');


var git = Utils.git;
var argv = Minimist(process.argv.slice(2));
var editorPath = Path.resolve('./editor');

if (argv.push)
  pushStep(argv.message);
else if (argv.pop)
  popStep();
else if (argv.tag)
  tagStep(argv.message);
else if (argv.edit)
  editStep(argv.step);
else if (argv.reword)
  rewordStep(argv.step, argv.message);


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
}

function rewordStep(step, message) {
  if (!message)
    throw TypeError('A message must be provided');

  var base = getStepBase(step);

  git('rebase -i ' + base, {
    GIT_EDITOR: 'node ' + editorPath + ' --reword --message="' + message + '"'
  });
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
  getNextStep: getNextStep,
  getStepBase: getStepBase
};