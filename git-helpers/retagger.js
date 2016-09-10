var Fs = require('fs');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');


var git = Utils.git;


// Rebase onto the last step manipulated
git(['rebase',  '-i', Step.stepBase(Step.lastOperation())], {
  GIT_EDITOR: 'node ' + Paths.editor + ' retag'
});

// As long as we are rebasing
while (!Utils.isOrigHead()) {
  // Grab the message of the recent step in the current log
  var currentCommitMessage = Step.recentStepCommit('%s');
  var currentStep = Step.extractStep(currentCommitMessage);

  // Get the message of the recent step
  var message = currentStep.message;
  // Predict the next step
  var nextStep = Step.next();
  currentStep = currentStep.number;

  // Find current step file and rename it
  var stepFiles = Fs.readdirSync(Paths.steps);
  var currentStepFile;
  var nextStepFile;

  stepFiles.some(function (stepFile) {
    if (currentStepFile && nextStep) return true;

    if (stepFile.match(new RegExp('step' + currentStep + '*')) {
      currentStepFile = stepFile;
      return false;
    }

    if (stepFile.match(new RegExp('step' + nextStep + '*')) {
      nextStepFile = stepFile;
      return false;
    }
  });

  var currentStepFilePath = Paths.steps + '/' + currentStepFile;
  var newStepFilePath = Paths.steps + '/' + nextStepFile;

  Fs.renameSync(currentStepFilePath, newStepFilePath);

  // Commit our changes
  git(['add', newStepFilePath]);
  git(['rebase', '--continue']);

  // Update the name of the tag
  Step.retag(currentStep, nextStep);
}