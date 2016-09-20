var Fs = require('fs');
var Minimist = require('minimist');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');

/*
  This is the editor for interactive rebases and ammended commits. Instead of openning
  an editing software like nano or vim, this module will edit the file by specified
  methods we choose.
 */

var git = Utils.git;


// Automatically invoke a method by the provided arguments
(function () {
  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm']
  });

  // The first argument will be the rebase file path provided to us by git
  var method = argv._[0];
  var rebaseFilePath = argv._[1];
  var message = argv.message || argv.m;

  var rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
  var newRebaseFileContent;

  // Edit rebase content
  switch (method) {
    case 'edit': newRebaseFileContent = editStep(rebaseFileContent); break;
    case 'reword': newRebaseFileContent = rewordStep(rebaseFileContent, message); break;
  }

  // If content was edited
  if (newRebaseFileContent) {
    // Rewrite the rebase file
    Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);
  }
})();

// Edit the last step in the rebase file
function editStep(rebaseFileContent) {
  var operations = disassemblyOperations(rebaseFileContent);

  // If rewording
  if (!operations) {
    // Update commit's step number
    var stepDescriptor = Step.descriptor(rebaseFileContent);
    if (!stepDescriptor) return;

    // Unlike an ordinary step rewording, we need to recalculate the step number
    var nextStep = Step.next(1);
    return 'Step ' + nextStep + ': ' + stepDescriptor.message;
  }

  // If rebasing, edit the first commit
  operations[0].method = 'edit';

  // Creating a clone of the operations array otherwise splices couldn't be applied
  // without aborting the itration. In addition we hold an offset variable to handle
  // the changes that are made in the array's length
  operations.slice(1).reduce(function (offset, operation, index) {
    var isSuperStep = !!Step.superDescriptor(operation.message);

    // If this is a super step, replace pick operation with the super pick
    if (isSuperStep) operations.splice(index + offset, 1, {
      method: 'exec',
      command: 'node ' + Paths.git.helpers.superPicker + ' ' + operation.hash
    });

    // Update commit's step number
    operations.splice(index + ++offset, 0, {
      method: 'exec',
      command: [
        'GIT_EDITOR="node ' + Paths.git.helpers.editor + ' edit"',
        'git commit --amend',
      ].join(' ')
    });

    return offset;
  }, 1);

  operations.push({
    method: 'exec',
    command: 'node ' + Paths.git.helpers.retagger
  });

  return assemblyOperations(operations);
}

// Reword the last step in the rebase file
function rewordStep(rebaseFileContent, message) {
  var operations = disassemblyOperations(rebaseFileContent);

  // If rewording
  if (!operations) {
    // Replace original message with the provided message
    var stepDescriptor = Step.descriptor(rebaseFileContent);
    if (!stepDescriptor) return;

    return 'Step ' + stepDescriptor.number + ': ' + message;
  }

  // If rebasing, replace original message with the provided message
  operations.splice(1, 0, {
    method: 'exec',
    command: [
      'GIT_EDITOR="node ' + Paths.git.helpers.editor + ' reword -m \'' + message + '\'"',
      'git commit --amend',
    ].join(' ')
  });

  return assemblyOperations(operations);
}

// Convert rebase file content to operations array
function disassemblyOperations(rebaseFileContent) {
  var operations = rebaseFileContent.match(/^[a-z]+\s.{7}.*$/mg);
  if (!operations) return;

  return operations.map(function (line) {
    var split = line.split(' ');

    return {
      method: split[0],
      hash: split[1],
      message: split.slice(2).join(' ')
    };
  });
}

// Convert operations array to rebase file content
function assemblyOperations(operations) {
  return operations
    .map(function (operation) {
      return Object.keys(operation)
        .map(function (k) { return operation[k] })
        .join(' ');
    })
    .join('\n') + '\n';
}