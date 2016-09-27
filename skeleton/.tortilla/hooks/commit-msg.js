var Fs = require('fs');
var Git = require('../git');
var Paths = require('../paths');
var Step = require('../step');

/*
  Commit-message git hook launches right after we wrote our commit message.
  If an error was thrown the commit process will be aborted with the provided error
  message.
 */

(function () {
  // Amend is the only thing allowed by tortilla, the rest is irrelevant
  if (!process.env.TORTILLA_CHILD_PROCESS && !Git.gonnaAmend()) return;

  var commitFileContent = Fs.readFileSync(Paths.git.messages.commit, 'utf8');

  // If it's not tortilla trying to add a new commit
  if (Git.gonnaAmend()) {
    var commitHash = Git.recentCommit(['--format=%H']);
    var rootHash = Git(['rev-list', '--max-parents=0', 'HEAD']);
    // If current commit is the initial commit we're probably editing the root in which
    // case a step prefix is unnecessary
    if (commitHash == rootHash) return;
  }

  // Prepend a step prefix to the commit message
  var nextStep = process.env.TORTILLA_NEXT_STEP || Step.next(1);
  var fixedCommitFileContent = 'Step ' + nextStep + ': ' + commitFileContent

  // Rewrite the commit message with a step prefix
  Fs.writeFileSync(Paths.git.messages.commit, fixedCommitFileContent);
})();