var Step = require('../step');
var Utils = require('../utils');

/*
  Pre-commit git hook launches right before we commit changes. If an error was thrown
  the commit process will be aborted with the provided error message.
 */

(function () {
  // Prohibit regular commits
  if (!Utils.amending()) throw Error(
    'New commits are prohibited! Use `$ npm step -- push` instead'
  );

  if (!Utils.rebasing()) throw Error([
    'Changes are not allowed outside editing mode!',
    'Use `$ npm step -- edit` and then make your changes'
  ].join(' '));

  var stepMessage = Step.recentCommit('%s');
  var stepDescriptor = Step.descriptor(stepMessage);
  var isSuperStep = stepDescriptor && !stepDescriptor.number.split('.')[1];

  // If this is a super step only the appropriate instruction file can be modified
  if (isSuperStep) {
    var tag = 'step' + stepDescriptor.number;
    // e.g. steps/step1.md
    var pattern = new RegExp('^steps/(?!' + tag + '\\.md)');
    var stagedFiles = Utils.stagedFiles(pattern);

    if (stagedFiles.length) throw Error(
      '\'' + tag + '.md\' is the only instruction file that can be modified'
    );
  }
  // Else 'steps' dir can't be changed
  else {
    var stagedFiles = Utils.stagedFiles(/^steps\//);

    if (stagedFiles.length) throw Error(
      'Step instruction files can\'t be modified'
    );
  }
})();