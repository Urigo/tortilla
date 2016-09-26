var Minimist = require('minimist')
var Step = require('./step');
var Utils = require('./utils');

/*
  Responsible for editing the recent commit's message. It will also adjust the step's
  number if needed.
 */

var git = Utils.git;


(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_']
  });

  var message = argv._[0];

  var fixedMessage = getFixedMessage(message);
  git.print(['commit', '--amend', '-m', fixedMessage, '--allow-empty']);
})();

// Launches the editor if no message provided and adds a step prefix if necessary
function getFixedMessage(message) {
  var commitMessage = Utils.recentCommit(['--format=%s']);
  // Replace original message with the provided message
  var stepDescriptor = Step.descriptor(commitMessage);

  // Skip editor
  if (message) {
    if (!stepDescriptor) return message;

    var nextStep = Step.next(1);
    return 'Step ' + nextStep + ': ' + message;
  }

  // If we're editing root
  if (!stepDescriptor) {
    // Launch editor
    git.print(['commit', '--amend', '--allow-empty']);
    return Utils.recentCommit(['--format=%B']);
  }

  // It's important to fetch the next step before we edit the commit since it depends
  // on it's step number prefix, otherwise we might get an unexpected result
  var nextStep = Step.next(1);
  // Launch editor with the step's message
  git(['commit', '--amend', '-m', stepDescriptor.message, '--allow-empty']);
  git.print(['commit', '--amend', '--allow-empty']);

  // Return the message with a step prefix
  message = Utils.recentCommit(['--format=%B']);
  return 'Step ' + nextStep + ': ' + message;
}