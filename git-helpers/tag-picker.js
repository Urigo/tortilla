var Fs = require('fs');
var Minimist = require('minimist');
var Path = require('path');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');

/*
 The tag-picker is responsible to update all the step instruction file names and adjust
 the step tag names after editing a step, since new steps might be added or removed
 during the process.
 */

var git = Utils.git;


(function () {
  var argv = Minimist(process.argv.slice(2), {
    string: ['hash', 'h']
  });

  var hash = argv.hash || argv.h;

  // If no hash has been provided don't use cherry-pick. Usually aimed for the initial
  // commit which should be edited before this file is being interpreted
  if (hash) git(['cherry-pick', hash]);
  var isCherryPicking = Utils.cherryPicking();

  // The recent step is not guaranteed to remain a super step after editing, hence it is
  // important to check if we're dealing with one or not
  var currentCommitMessage = Utils.recentCommit(['--format=%s']);
  var isSuperStep = !!Step.superDescriptor(currentCommitMessage);
  // The '+' sign converts a boolean into an integer, this way we can return a status
  // code which is necessary in case the cherry pick has failed
  if (!isSuperStep) process.exit(+isCherryPicking);
  // From this point on, we assume that the only conflicts possible are not user driven
  // but rather caused by the step files renaming process

  var oldStep = Step.current();
  // If cherry picking was a success then we need to use an offset of 1 when
  // calculating the next super step
  var newStep = Step.next(+!isCherryPicking).split('.')[0];

  // Take care of gaps between steps, or retag the current step, if at all.
  // Note that if the new step is bigger than the old step then no conflicts
  // could have been made
  for (var step = oldStep; step <= newStep; step++) {
    Step.retag(step);
    if (step == newStep) return;
  }

  var oldTag = 'step' + oldStep;
  var newTag = 'step' + newTag;

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
  if (Utils.exists(oldStepFilePath))
    Fs.renameSync(oldStepFilePath, newStepFilePath);
  // Else, it means that the step file was overriden and we need to recreate it
  else
    Fs.writeFileSync(newStepFilePath, '');

  git(['add', oldStepFilePath]);
  git(['add', newStepFilePath]);

  git(['commit', '--amend'], {
    GIT_EDITOR: true
  });

  // Finish cherry picking if in progress
  if (isCherryPicking) git(['cherry-pick', '--continue']);

  // Finally, update the name of the tag
  Step.retag(oldStep, newStep);
})();