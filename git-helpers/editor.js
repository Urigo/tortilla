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


(function () {
  // Disable the automatic invokation unless this is the main module of the node process
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm']
  });

  // The first argument will be the rebase file path provided to us by git
  var method = argv._[0];
  var rebaseFilePath = argv._[1];
  var message = argv.message || argv.m;

  var rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
  // Convert to array of jsons so it would be more comfortable to word with
  var operations = disassemblyOperations(rebaseFileContent);

  // Automatically invoke a method by the provided arguments.
  // The methods will manipulate the operations array.
  switch (method) {
    case 'edit': editStep(operations); break;
    case 'reword': rewordStep(operations, message); break;
  }

  // Put everything back together and rewrite the rebase file
  var newRebaseFileContent = assemblyOperations(operations);
  Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);
})();

// Edit the last step in the rebase file
function editStep(operations) {
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
      command: 'GIT_EDITOR=true node ' + Paths.git.helpers.reworder
    });

    return offset;
  }, 1);

  // Reset all tags
  operations.push({
    method: 'exec',
    command: 'node ' + Paths.git.helpers.retagger
  });
}

// Reword the last step in the rebase file
function rewordStep(operations, message) {
  var args = [Paths.git.helpers.reworder];
  if (message) args.push('"' + message + '"');

  // Replace original message with the provided message
  operations.splice(1, 0, {
    method: 'exec',
    command: 'node ' + args.join(' ')
  });

  // Reset all tags
  operations.push({
    method: 'exec',
    command: 'node ' + Paths.git.helpers.retagger
  });
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