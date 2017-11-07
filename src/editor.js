const Fs = require('fs-extra');
const Minimist = require('minimist');
const Path = require('path');
const Git = require('./git');
const LocalStorage = require('./local-storage');
const Paths = require('./paths');
const Step = require('./step');
const Utils = require('./utils');

/**
  This is the editor for interactive rebases and amended commits. Instead of opening
  an editing software like 'nano' or 'vim', this module will edit the file by specified
  methods we choose.
 */

(function () {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm'],
  });

  // The first argument will be the rebase file path provided to us by git
  const method = argv._[0];
  const steps = argv._.slice(1, -1);
  const rebaseFilePath = argv._[argv._.length - 1];
  const message = argv.message || argv.m;
  const prod = argv.prod;
  const dev = argv.dev;

  const rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
  // Convert to array of jsons so it would be more comfortable to word with
  const operations = disassemblyOperations(rebaseFileContent);

  // Set flag just in case recent rebase was aborted
  LocalStorage.removeItem('REBASE_HOOKS_DISABLED');
  // Set current branch name so it can be retrieved during rebase
  LocalStorage.setItem('REBASE_BRANCH', Git(['rev-parse', '--abbrev-ref', 'HEAD']));

  // Automatically invoke a method by the provided arguments.
  // The methods will manipulate the operations array.
  switch (method) {
    case 'edit': editStep(operations, steps); break;
    case 'edit-head': editHead(operations); break;
    case 'sort': sortSteps(operations); break;
    case 'reword': rewordStep(operations, message); break;
    case 'render': renderManuals(operations); break;
  }

  // Put everything back together and rewrite the rebase file
  const newRebaseFileContent = assemblyOperations(operations);
  Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);
}());

// Edit the last step in the rebase file
function editStep(operations, steps) {
  if (!steps) {
    const descriptor = Step.descriptor(operations[0].message);
    const step = (descriptor && descriptor.number) || 'root';

    steps = [step];
  }

  // This way we can store data on each step string
  steps = steps.map(step => new String(step));

  // Edit each commit which is relevant to the specified steps
  steps.forEach((step) => {
    if (step == 'root') {
      const operation = operations[0];
      operation.method = 'edit';
      step.operation = operation;
    }
    else {
      const operation = operations.find((operation) => {
        const descriptor = Step.descriptor(operation.message);
        return descriptor && descriptor.number == step;
      });

      if (!operation) return;

      operation.method = 'edit';
      step.operation = operation;
    }
  });

  // Probably editing the recent step in which case no sortments are needed
  if (operations.length <= 1) {
    return;
  }

  // Prepare meta-data for upcoming sortments
  const descriptor = Step.descriptor(operations[0].message);

  // Step exists
  if (descriptor) {
    LocalStorage.setItem('REBASE_OLD_STEP', descriptor.number);
    LocalStorage.setItem('REBASE_NEW_STEP', descriptor.number);
  } else { // Probably root commit
    LocalStorage.setItem('REBASE_OLD_STEP', 'root');
    LocalStorage.setItem('REBASE_NEW_STEP', 'root');
  }

  const sort = `GIT_SEQUENCE_EDITOR="node ${Paths.tortilla.editor} sort"`;

  // Continue sorting the steps after step editing has been finished
  steps.forEach((step) => {
    const operation = step.operation;

    if (!operation) return;

    const index = operations.indexOf(operation);

    // Insert the following operation AFTER the step's operation
    operations.splice(index + 1, 0, {
      method: 'exec',
      command: `${sort} git rebase --edit-todo`,
    });
  });

  const rebranchSuper = `GIT_SEQUENCE_EDITOR="node ${Paths.tortilla.editor} rebranch-super"`;

  // After rebase has finished, update the brancehs referencing the super steps
  operations.push({
    method: 'exec',
    command: `${rebranchSuper} git rebase --edit-todo`,
  });
}

// Adjusts upcoming step numbers in rebase
function sortSteps(operations) {
  // Grab meta-data
  const oldStep = LocalStorage.getItem('REBASE_OLD_STEP');
  const newStep = LocalStorage.getItem('REBASE_NEW_STEP');

  // If delta is 0 no sortments are needed
  if (oldStep == newStep) {
    return LocalStorage.setItem('REBASE_HOOKS_DISABLED', 1);
  }

  const stepLimit = getStepLimit(oldStep, newStep);
  let editFlag = false;
  let offset = 0;

  operations.slice().some((operation, index) => {
    const currStepDescriptor = Step.descriptor(operation.message);
    // Skip commits which are not step commits
    if (!currStepDescriptor) {
      return;
    }

    const currStepSplit = currStepDescriptor.number.split('.');
    const currSuperStep = currStepSplit[0];
    const currSubStep = currStepSplit[1];

    // If limit reached
    if (currSuperStep > stepLimit) {
      // Prepend local storage item setting operation, this would be a flag which will be
      // used in git-hooks
      operations.splice(index + offset++, 0, {
        method: 'exec',
        command: `node ${Paths.tortilla.localStorage} set REBASE_HOOKS_DISABLED 1`,
      });

      // Abort operations loop
      return true;
    }

    // If this is a super step, replace pick operation with the super pick
    if (!currSubStep) {
      operations.splice(index + offset, 1, {
        method: 'exec',
        command: `node ${Paths.tortilla.rebase} super-pick ${operation.hash}`,
      });
    }

    // If another step edit is pending, we will first perform the reword and only then
    // we will proceed to the editing itself, since we wanna ensure that all the previous
    // step indexes are already sorted
    if (operation.method == 'edit') {
      // Pick BEFORE edit
      operations.splice(index + offset++, 0, Object.assign({}, operation, {
        method: 'pick'
      }));

      // Update commit's step number
      operations.splice(index + offset++, 0, {
        method: 'exec',
        command: `GIT_EDITOR=true node ${Paths.tortilla.rebase} reword`,
      });

      const editor = `GIT_SEQUENCE_EDITOR="node ${Paths.tortilla.editor} edit-head"`;

      // Replace edited step with the reworded one
      operations.splice(index + offset++, 0, {
        method: 'exec',
        command: `${editor} git rebase --edit-todo`,
      });

      operations.splice(index + offset, 1);

      // The sorting process should continue after we've finished editing the step, for now
      // we will need to abort the current sorting process
      return editFlag = true;
    }

    // Update commit's step number
    operations.splice(index + ++offset, 0, {
      method: 'exec',
      command: `GIT_EDITOR=true node ${Paths.tortilla.rebase} reword`,
    });
  });

  // Remove hooks storage items so it won't affect post-rebase operations, but only if
  // there are no any further step edits pending
  if (!editFlag) {
    operations.push({
      method: 'exec',
      command: `node ${Paths.tortilla.localStorage} remove HOOK_STEP`,
    });
  }
}

// Edit the commit which is presented as the current HEAD
function editHead(operations) {
  // Prepare meta-data for upcoming sortments
  const descriptor = Step.descriptor(operations[0].message);

  // Descriptor should always exist, but just in case
  if (descriptor) {
    LocalStorage.setItem('REBASE_OLD_STEP', descriptor.number);
  }

  const head = Git.recentCommit(['--format=%h m']).split(' ');
  const hash = head.shift();
  const message = head.join(' ');

  // Remove head commit so there won't be any conflicts
  operations.push({
    method: 'exec',
    command: 'git reset --hard HEAD~1'
  });

  // Re-pick and edit head commit
  operations.push({
    method: 'edit',
    hash,
    message
  });
}

// Reword the last step in the rebase file
function rewordStep(operations, message) {
  const argv = [Paths.tortilla.rebase, 'reword'];
  if (message) {
    argv.push(`"${message}"`);
  }

  // Replace original message with the provided message
  operations.splice(1, 0, {
    method: 'exec',
    command: `node ${argv.join(' ')}`,
  });
}

// Render all manuals since the beginning of history to the opposite format
function renderManuals(operations) {
  let offset = 2;

  // Render README.md
  operations.splice(1, 0, {
    method: 'exec',
    command: `node ${Paths.tortilla.manual} render --root`,
  });

  operations.slice(offset).forEach((operation, index) => {
    const stepDescriptor = Step.superDescriptor(operation.message);
    if (!stepDescriptor) {
      return;
    }

    // Render step manual file
    operations.splice(index + ++offset, 0, {
      method: 'exec',
      command: `node ${Paths.tortilla.manual} render ${stepDescriptor.number}`,
    });

    return offset;
  });
}

// The step limit of which sortments are needed would be determined by the step
// which is greater
function getStepLimit(oldStep, newStep) {
  oldStep = oldStep == 'root' ? '0' : oldStep;
  newSuperStep = newStep == 'root' ? '0' : newStep;

  // Grabbing step splits for easy access
  const oldStepSplits = oldStep.split('.');
  const newStepSplits = newStep.split('.');
  const oldSuperStep = oldStepSplits[0];
  var newSuperStep = newStepSplits[0];
  const oldSubStep = oldStepSplits[1];
  const newSubStep = newStepSplits[1];

  if (oldSuperStep == newSuperStep) {
    // 1.1, 1.2 or 1.2, 1.1 or 1.1 or 1.1, 1
    if (oldSubStep) {
      return oldSuperStep;
    }
    // 1, 1.1
    return Infinity;
  }

  // 1, 2.1
  if (!oldSubStep && newSubStep && newSuperStep == Number(oldSuperStep) + 1) {
    return newSuperStep;
  }

  // 2.1, 1
  if (!newSubStep && oldSubStep && oldSuperStep == Number(newSuperStep) + 1) {
    return oldSuperStep;
  }

  // 1, 2 or 1, 3.1 or 1.1, 2.1 or 1.1, 2
  return Infinity;
}

// Convert rebase file content to operations array
function disassemblyOperations(rebaseFileContent) {
  const operations = rebaseFileContent.match(/^[a-z]+\s.{7}.*$/mg);
  if (!operations) {
    return;
  }

  return operations.map((line) => {
    const split = line.split(' ');

    return {
      method: split[0],
      hash: split[1],
      message: split.slice(2).join(' '),
    };
  });
}

// Convert operations array to rebase file content
function assemblyOperations(operations) {
  return `${operations
    // Compose lines
    .map(operation => Object.keys(operation)
        .map(k => operation[k])
        .join(' '))
    // Connect lines
    .join('\n')}\n`;
}
