var Fs = require('fs');
var Minimist = require('minimist');
var Path = require('path');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');

/*
 This module is responsible to update all the step instruction file names and adjust
 the step tag names after editing a step, since new steps might be added or removed
 during the process.
 */

var git = Utils.git;


(function () {
  // The last step is not guaranteed to remain a super step after editing, hence it is
  // important to first check if we're dealing with a super step
  var commitFormat = '{ "hash": "%h", "message": "%s" }';
  var currentCommit = JSON.parse(Utils.recentCommit(['--format=' + commitFormat]));
  var isSuperStep = !!Step.superDescriptor(currentCommit.message);
  if (!isSuperStep) return;

  // A descriptor for the rebased commit should be passed as process arguments. By this
  // time this metadata won't be reachable from the current branch since we're in the
  // middle of rebasing which changes the hashes of the commits as we make progress,
  // therefore it's important to forward the metadata and not rely on git operations
  var argv = Minimist(process.argv.slice(2));

  var rebasedCommit = {
    hash: argv._[0],
    message: argv._[1]
  };

  var rebasedStepDescriptor = Step.superDescriptor(rebasedCommit.message);
  // The old (not updated) step lies within the rebased commit's message
  var oldStep = rebasedStepDescriptor.number;
  var oldTag = 'step' + oldStep;
  // The new (updated) step lies within the current commit's message
  var newStep = Step.current();
  var newTag = 'step' + newStep;

  var stepFiles = Fs.readdirSync(Paths.steps);

  // There might be conflicts during rebase when renaming a step file into one that is
  // already exist in the new steps. Conflicted renamed files will have the following
  // pattern:
  //
  //    step(number).md~(hash)... (message)
  //
  var oldStepFile = Utils.find(stepFiles, function (stepFile) {
    return stepFile.match(new RegExp('^' + oldTag + '\\.md~*$'));
  }, oldTag + '.md');

  var newStepFile = newTag + '.md';

  var oldStepFilePath = Path.resolve(Paths.steps, oldStepFile);
  var newStepFilePath = Path.resolve(Paths.steps, newStepFile);

  Fs.renameSync(oldStepFilePath, newStepFilePath);
  git(['add', oldStepFilePath]);
  git(['add', newStepFilePath]);

  // Commit our changes
  git(['commit', '--amend'], {
    GIT_EDITOR: true
  });

  // Update the name of the tag
  Step.retag(oldStep, newStep, currentCommit.hash);
})();