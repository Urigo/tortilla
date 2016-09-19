var Fs = require('fs');
var Minimist = require('minimist');
var Path = require('path');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');

/*
  The super-picker is responsible for cherry-picking super steps and rename their
  instruction files. It knows how to deal with conflicts as well.
 */

var git = Utils.git;


(function () {
  var argv = Minimist(process.argv.slice(2), {
    string: ['_']
  });

  var hash = argv._[0];

  var message = Utils.recentCommit(hash, ['--format=%s']);

  git(['cherry-pick', hash]);
  var isCherryPicking = Utils.cherryPicking();

  var oldStep = Step.descriptor(message).number;
  // If cherry picking was a success then we need to use an offset of 1 when
  // calculating the next super step
  var newStep = Step.next(+!isCherryPicking);

  if (oldStep == newStep) return;

  var oldTag = 'step' + oldStep;
  var newTag = 'step' + newStep;

  var oldStepFile = oldTag + '.md';
  var newStepFile = newTag + '.md';

  // In case conflicts were made, then pick the conflicted step file
  if (isCherryPicking) {
    var stepFiles = Fs.readdirSync(Paths.steps);

    // There might be conflicts during rebase when renaming a step file into one that is
    // already exist in the new steps. Conflicted renamed files will have the following
    // pattern:
    //
    //    step(number).md~(hash)... (message)
    //
    oldStepFile = Utils.find(stepFiles, function (stepFile) {
      return stepFile.match(new RegExp('^' + oldTag + '\\.md~*$'));
    }, oldStepFile);
  }

  var oldStepFilePath = Path.resolve(Paths.steps, oldStepFile);
  var newStepFilePath = Path.resolve(Paths.steps, newStepFile);

  // In case there was a renaming conflict, rename the step file
  if (Utils.exists(oldStepFilePath)) {
    Fs.renameSync(oldStepFilePath, newStepFilePath);
    git(['add', oldStepFilePath]);
    git(['add', newStepFilePath]);
  }
  // Else, it means that the step file was overriden and we need to recreate it
  else {
    Fs.writeFileSync(newStepFilePath, '');
    git(['add', newStepFilePath]);
  }

  git(['commit', '--amend'], {
    GIT_EDITOR: true
  });

  // Finish cherry picking if in progress
  if (isCherryPicking) git(['cherry-pick', '--continue']);
})();