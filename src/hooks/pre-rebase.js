const Git = require('../git');
const LocalStorage = require('../local-storage');

/**
  Pre-rebase git hook launches right before we rebase a branch. If an error was thrown
  the rebase process will be aborted with the provided error message.
 */

(() => {
  if (!LocalStorage.getItem('USE_STRICT')) {
    return;
  }

  if (!process.env.TORTILLA_CHILD_PROCESS) throw Error(
    "Rebase mode is prohibited! Use '$ tortilla step edit' instead"
  );

  const [activeBranch, mainBranch] = Git.activeBranchName().match(/^(.+)-step\d+$/) || [];

  if (activeBranch) {
    throw Error([
      `Rebase mode is prohibited!`,
      `Please checkout '${mainBranch}' branch beforehand ` +
      `by running '$ git checkout ${mainBranch}'`
    ].join('\n'));
  }
})();
