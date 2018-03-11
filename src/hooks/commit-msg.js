const Fs = require('fs-extra');
const Git = require('../git');
const LocalStorage = require('../local-storage');
const Paths = require('../paths');
const Step = require('../step');

/**
  Commit-message git hook launches right after we wrote our commit message.
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

  // If we're amending to the root commit then a step prefix is not needed
  if (Git.gonnaAmend() && !LocalStorage.getItem('HOOK_STEP')) {
    return;
  }

  const commitMessage = Fs.readFileSync(Paths.git.messages.commit, 'utf8');
  // Prepend a step prefix to the commit message
  const step = LocalStorage.getItem('HOOK_STEP') || Step.next(1);
  const fixedcommitMessage = `Step ${step}: ${commitMessage}`;
  // Clearing storage to prevent conflicts with upcoming commits
  LocalStorage.removeItem('HOOK_STEP');

  // Rewrite the commit with a step prefix
  Fs.writeFileSync(Paths.git.messages.commit, fixedcommitMessage);
}());
