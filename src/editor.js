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

  var rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
  // Convert to array of jsons so it would be more comfortable to word with
  var operations = disassemblyOperations(rebaseFileContent);

  // Automatically invoke a method by the provided arguments.
  // The methods will manipulate the operations array.
  switch (method) {
    case 'edit': editStep(operations); break;
    case 'adjust': adjustSteps(operations); break;
    case 'reword': rewordStep(operations, message); break;
    case 'convert': convertManuals(operations); break;
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
  var nextStep = Step.next();
  LocalStorage.setItem('OLD_STEP', nextStep);
  LocalStorage.setItem('NEW_STEP', nextStep);

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
  var oldStep = LocalStorage.getItem('OLD_STEP');
  var newStep = LocalStorage.getItem('NEW_STEP');

  // If delta is 0 no adjustments are needed
  if (oldStep == newStep) return retagSteps(operations);

  // Grabbing step splits for easy access
  var oldStepSplits = oldStep.split('.');
  var newStepSplits = newStep.split('.');
  var oldSuperStep = oldStepSplits[0];
  var newSuperStep = newStepSplits[0];
  var oldSubStep = oldStepSplits[1] || 0;
  var newSubStep = newStepSplits[1] || 0;

  // Calculates whether delta is greater than 0 or not
  var stepsAdded = oldSuperStep < newSuperStep ||
    (oldSuperStep == newSuperStep && oldSubStep < oldSuperStep);
  // The step limit of which adjustments are needed would be determined by the step
  // which is greater
  var stepLimit = stepsAdded ? newSuperStep : oldSuperStep;

  var offset = 0;

  operations.slice().forEach(function (operation, index) {
    var currStepSplit = Step.descriptor(operation.message).number;
    var currSuperStep = currStepSplit[0];
    var currSubStep = currStepSplit[1];

    if (currSuperStep > stepLimit) return;

    var isSuperStep = !currSubStep;

    // If this is a super step, replace pick operation with the super pick
    if (isSuperStep) operations.splice(index + offset, 1, {
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

// Convert all manuals since the beginning of history to the opposite format
function convertManuals(operations) {
  var path = Paths.readme;
  var offset = 2;

  // Convert README.md
  operations.splice(1, 0, {
    method: 'exec',
    command: 'node ' + Paths.tortilla.manual + ' convert --root'
  });

  operations.slice(offset).forEach(function (operation, index) {
    var stepDescriptor = Step.superDescriptor(operation.message);
    if (!stepDescriptor) return;

    var file = 'step' + stepDescriptor.number + '.md';
    var path = Path.resolve(Paths.steps, file);

    // Convert step manual file
    operations.splice(index + ++offset, 0, {
      method: 'exec',
      command: 'node ' + Paths.tortilla.manual + ' convert ' + stepDescriptor.number
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