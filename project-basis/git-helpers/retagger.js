var Fs = require('fs');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');


var git = Utils.git;


git('rebase -i ' + Step.stepBase(Step.current()), {
  GIT_EDITOR: 'node ' + Paths.editor + ' retag'
});

while (!Utils.isOrigHead()) {
  var currentCommitMessage = Step.recentStepCommit('%s');
  var currentStep = Step.extractStep(currentCommitMessage);

  var message = currentStep.message;
  var nextStep = Step.next();
  currentStep = currentStep.number;

  var stepFiles = Fs.readdirSync(stepsDirPath);
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

  var currentStepFilePath = stepsDirPath + '/' + currentStepFile;
  var newStepFilePath = stepsDirPath + '/' + nextStepFile;

  Fs.renameSync(currentStepFilePath, newStepFilePath);
  git(['add', newStepFilePath]);

  git(['commit',  '--ammend'], {
    GIT_EDITOR: 'node ' + editorPath + ' reword --message="' + message + '"'
  });

  Step.retag(currentStep, nextStep);

  git(['rebase', '--continue']);
}