const Fs = require('fs-extra');
const Git = require('../git');
const LocalStorage = require('../local-storage');
const Paths = require('../paths');
const Step = require('../step');

/**
  Prepare-commit-message git hook launches right before we write our commit message.
  If an error was thrown the commit process will be aborted with the provided error
  message.
 */

(function () {
  // Should abort hook once steps limit reached
  if (Git.rebasing() && LocalStorage.getItem('REBASE_HOOKS_DISABLED')) {
    return;
  }
  // Amend is the only thing allowed by tortilla, the rest is irrelevant
  if (!process.env.TORTILLA_CHILD_PROCESS && !Git.gonnaAmend()) {
    return;
  }
  // We don't wanna affect cherry-picks done by step editing
  if (Git.cherryPicking()) {
    return;
  }

  const commitMessage = Fs.readFileSync(Paths.git.messages.commit, 'utf8');
  // The descriptor will contain the raw message with no step prefix
  const stepDescriptor = Step.descriptor(commitMessage);
  // If step not detected we're probably amending to the root commit
  if (!stepDescriptor) {
    return;
  }

  // If gonna amend then the step is already determined
  if (Git.gonnaAmend() && !LocalStorage.getItem('HOOK_STEP')) {
    LocalStorage.setItem('HOOK_STEP', stepDescriptor.number);
  }

  // Rewrite the commit message with no step prefix
  Fs.writeFileSync(Paths.git.messages.commit, stepDescriptor.message);
}());
