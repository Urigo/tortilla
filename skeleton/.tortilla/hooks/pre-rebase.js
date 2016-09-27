var Step = require('../step');

/*
  Pre-rebase git hook launches right before we rebase a branch. If an error was thrown
  the rebase process will be aborted with the provided error message.
 */

(function () {
  if (!Step.gonnaRebase()) throw Error(
    'Rebase mode is prohibited! Use `$ npm step -- edit` instead'
  )
})();