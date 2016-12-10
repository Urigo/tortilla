var Fs = require('fs-extra');
var Path = require('path');
var Minimist = require('minimist');
var LocalStorage = require('./local-storage');
var Paths = require('./paths');
var Step = require('./step');

/*
  This is the editor for interactive rebases and amended commits. Instead of opening
  an editing software like nano or vim, this module will edit the file by specified
  methods we choose.
 */

(function () {
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm']
  });

  // The first argument will be the rebase file path provided to us by git
  var method = argv._[0];
  var rebaseFilePath = argv._[1];
  var message = argv.message || argv.m;
  var prod = argv.prod;
  var dev = argv.dev;

  var rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
  // Convert to array of jsons so it would be more comfortable to word with
  var operations = disassemblyOperations(rebaseFileContent);

  // Set flag just in case recent rebase was aborted
  LocalStorage.removeItem('REBASE_HOOKS_DISABLED');

  // Automatically invoke a method by the provided arguments.
  // The methods will manipulate the operations array.
  switch (method) {
    case 'edit': editStep(operations); break;
    case 'adjust': adjustSteps(operations); break;
    case 'reword': rewordStep(operations, message); break;
    case 'render': renderManuals(operations); break;
  }

  // Put everything back together and rewrite the rebase file
  var newRebaseFileContent = assemblyOperations(operations);
  Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);
})();

// Edit the last step in the rebase file
function editStep(operations) {
  operations[0].method = 'edit';

  // Probably editing the recent step in which case no adjustments are needed
  if (operations.length <= 1) return;

  // Prepare meta-data for upcoming adjustments
  var descriptor = Step.descriptor(operations[0].message);

  // Step exists
  if (descriptor) {
    LocalStorage.setItem('REBASE_OLD_STEP', descriptor.number);
    LocalStorage.setItem('REBASE_NEW_STEP', descriptor.number);
  }
  // Probably root commit
  else {
    LocalStorage.setItem('REBASE_OLD_STEP', 'root');
    LocalStorage.setItem('REBASE_NEW_STEP', 'root');
  }

  var editor = 'GIT_SEQUENCE_EDITOR="node ' + Paths.tortilla.editor + ' adjust"'

  // Once we finish editing our step, adjust the rest of the steps accordingly
  operations.splice(1, 0, {
    method: 'exec',
    command: editor + ' git rebase --edit-todo'
  });
}

// Adjusts upcoming step numbers in rebase
function adjustSteps(operations) {
  // Grab meta-data
  var oldStep = LocalStorage.getItem('REBASE_OLD_STEP');
  var newStep = LocalStorage.getItem('REBASE_NEW_STEP');

  // If delta is 0 no adjustments are needed
  if (oldStep == newStep) {
    LocalStorage.setItem('REBASE_HOOKS_DISABLED', 1);
    return retagSteps(operations);
  }

  var stepLimit = getStepLimit(oldStep, newStep);
  var offset = 0;

  operations.slice().some(function (operation, index) {
    var currStepDescriptor = Step.descriptor(operation.message);
    // Skip commits which are not step commits
    if (!currStepDescriptor) return;

    var currStepSplit = currStepDescriptor.number.split('.');
    var currSuperStep = currStepSplit[0];
    var currSubStep = currStepSplit[1];

    // If limit reached
    if (currSuperStep > stepLimit) {
      // Get local storage item path
      var storageItem = Path.resolve(Paths.storage, 'REBASE_HOOKS_DISABLED');

      // prepend local storage item setting operation, this would be a flag which will be
      // used in git-hooks
      operations.splice(index + offset++, 0, {
        method: 'exec',
        command: 'echo 1 > ' + storageItem
      });

      // Abort operations loop
      return true;
    }

    // If this is a super step, replace pick operation with the super pick
    if (!currSubStep) operations.splice(index + offset, 1, {
      method: 'exec',
      command: 'node ' + Paths.tortilla.history + ' super-pick ' + operation.hash
    });

    // Update commit's step number
    operations.splice(index + ++offset, 0, {
      method: 'exec',
      command: 'GIT_EDITOR=true node ' + Paths.tortilla.history + ' reword'
    });
  });

  retagSteps(operations);
}

// Reword the last step in the rebase file
function rewordStep(operations, message) {
  var argv = [Paths.tortilla.history, 'reword'];
  if (message) argv.push('"' + message + '"');

  // Replace original message with the provided message
  operations.splice(1, 0, {
    method: 'exec',
    command: 'node ' + argv.join(' ')
  });

  retagSteps(operations);
}

// Render all manuals since the beginning of history to the opposite format
function renderManuals(operations) {
  var offset = 2;

  // Render README.md
  operations.splice(1, 0, {
    method: 'exec',
    command: 'node ' + Paths.tortilla.manual + ' render --root'
  });

  operations.slice(offset).forEach(function (operation, index) {
    var stepDescriptor = Step.superDescriptor(operation.message);
    if (!stepDescriptor) return;

    // Render step manual file
    operations.splice(index + ++offset, 0, {
      method: 'exec',
      command: 'node ' + Paths.tortilla.manual + ' render ' + stepDescriptor.number
    });

    return offset;
  });

  retagSteps(operations);
}

// Reset all tags
function retagSteps(operations) {
  operations.push({
    method: 'exec',
    command: 'node ' + Paths.tortilla.history + ' retag'
  });
}

// The step limit of which adjustments are needed would be determined by the step
// which is greater
function getStepLimit(oldStep, newStep) {
  oldStep = oldStep == 'root' ? '0' : oldStep;
  newSuperStep = newStep == 'root' ? '0' : newStep;

  // Grabbing step splits for easy access
  var oldStepSplits = oldStep.split('.')[0];
  var newStepSplits = newStep.split('.')[0];
  var oldSuperStep = oldStepSplits[0];
  var newSuperStep = newStepSplits[0];
  var oldSubStep = oldStepSplits[1];
  var newSubStep = newStepSplits[1];

  if (oldSuperStep == newSuperStep) {
    // 1.1, 1.2 or 1.2, 1.1
    if (oldSubStep) return oldSuperStep;
    // 1, 1.1
    return Infinity;
  }

  // 1.1, 2.1 or 1.1, 2
  if (oldSubStep) return Infinity;
  // 1, 2.1
  if (newSubStep && newSuperStep == oldSuperStep + 1) return newSuperStep;
  // 1, 2 or 1, 3.1
  return Infinity;
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