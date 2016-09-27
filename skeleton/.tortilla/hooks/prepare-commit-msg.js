var Fs = require('fs');
var Git = require('../git');
var Paths = require('../paths');
var Step = require('../step');

/*
  Prepare-commit-message git hook launches right before we write our commit message.
  If an error was thrown the commit process will be aborted with the provided error
  message.
 */

(function () {
  // Amend is the only thing allowed by tortilla, the rest is irrelevant
  if (!process.env.TORTILLA_CHILD_PROCESS && !Git.gonnaAmend()) return;
  // We don't wanna affect cherry-picks done by step editing
  if (Git.cherryPicking()) return;

  var commitFileContent = Fs.readFileSync(Paths.git.messages.commit, 'utf8');
  // The descriptor will contain the raw message with no step prefix
  var stepDescriptor = Step.descriptor(commitFileContent);
  // If step not detected we're probably amending to the root commit
  if (!stepDescriptor) return;

  // Rewrite the commit message with no step prefix
  Fs.writeFileSync(Paths.git.messages.commit, stepDescriptor.message);
})();