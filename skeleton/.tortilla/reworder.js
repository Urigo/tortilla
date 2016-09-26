var Minimist = require('minimist')
var Step = require('./step');
var Utils = require('./utils');

/*
  Responsible for editing the recent commit's message. It will also adjust the step's
  number if needed.
 */

var commit = Utils.commit;


(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_']
  });

  var message = argv._[0];

  var fixedMessage = getFixedMessage(message);
  commit.print(['--amend', '-m', fixedMessage]);
})();

// Launches the editor if no message provided and adds a step prefix if necessary
function getFixedMessage(message) {
  var commitMessage = Utils.recentCommit(['--format=%s']);
  // Replace original message with the provided message
  var stepDescriptor = Step.descriptor(commitMessage);

  // Skip editor
  if (message) {
    if (!stepDescriptor) return message;

    var nextStep = getNextStep(stepDescriptor);
    return 'Step ' + nextStep + ': ' + message;
  }

  // If we're editing root
  if (!stepDescriptor) {
    // Launch editor
    commit.print(['--amend']);
    return Utils.recentCommit(['--format=%B']);
  }

  // It's important to fetch the next step before we edit the commit since it depends
  // on it's step number prefix, otherwise we might get an unexpected result
  var nextStep = getNextStep(stepDescriptor);
  // Launch editor with the step's message
  commit(['--amend', '-m', stepDescriptor.message]);
  commit.print(['--amend']);

  // Return the message with a step prefix
  message = Utils.recentCommit(['--format=%B']);
  return 'Step ' + nextStep + ': ' + message;
}

// Calculate the next step dynamically based on its super flag
function getNextStep(stepDescriptor) {
  var isSubStep = !!stepDescriptor.number.split('.')[1];
  return isSubStep ? Step.next(1) : Step.nextSuper(1);
}