import * as Fs from 'fs-extra';
import * as Minimist from 'minimist';
import * as Path from 'path';
import { Git } from './git';
import { localStorage as LocalStorage } from './local-storage';
import { Paths } from './paths';
import { Step } from './step';
import { Utils } from './utils';

/**
 This is the editor for interactive rebases and amended commits. Instead of opening
 an editing software like 'nano' or 'vim', this module will edit the file by specified
 methods we choose.
 */

function init() {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm', 'udiff'],
  });

  // The first argument will be the rebase file path provided to us by git
  const method = argv._[0];
  const steps = argv._.slice(1, -1);
  const rebaseFilePath = argv._[argv._.length - 1];
  const message = argv.message || argv.m;
  const udiff = argv.udiff;

  // Rebase file path will always be appended at the end of the arguments vector,
  // therefore udiff has to have a value, otherwise it will be matched with the wrong
  // argument
  const options = {
    udiff: udiff === 'true' ? '' : udiff,
  };

  const rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
  // Convert to array of jsons so it would be more comfortable to word with
  const operations = disassemblyOperations(rebaseFileContent);

  // Set flag just in case recent rebase was aborted
  LocalStorage.removeItem('REBASE_HOOKS_DISABLED');

  // Automatically invoke a method by the provided arguments.
  // The methods will manipulate the operations array.
  switch (method) {
    case 'edit':
      editStep(operations, steps, options);
      break;
    case 'edit-head':
      editHead(operations);
      break;
    case 'sort':
      sortSteps(operations, options);
      break;
    case 'reword':
      rewordStep(operations, message);
      break;
    case 'render':
      renderManuals(operations);
      break;
  }

  // Put everything back together and rewrite the rebase file
  const newRebaseFileContent = assemblyOperations(operations);
  Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);
}

init();

// Edit the last step in the rebase file
function editStep(operations, steps, options) {
  // Create initial step map
  // Note that udiff is a string, since it may very well specify a module path
  if (options.udiff != null) {
    // Providing pending flag
    Step.initializeStepMap(!!options.udiff);
  }

  if (!steps || steps.length === 0) {
    const descriptor = Step.descriptor(operations[0].message);
    const step = (descriptor && descriptor.number) || 'root';

    steps = [step];
  }

  // This way we can store data on each step string
  // We have to keep it as `new String` and not `String`!
  /* tslint:disable-next-line */
  steps = steps.map((step) => new String(step));

  // Edit each commit which is relevant to the specified steps
  steps.forEach((step) => {
    if (String(step) === 'root') {
      const operation = operations[0];
      operation.method = 'edit';
      step.operation = operation;
    } else {
      const operation = operations.find(({ message }) => {
        if (!message) { return; }
        const descriptor = Step.descriptor(message);

        return descriptor && descriptor.number === String(step);
      });

      if (!operation) { return; }

      operation.method = 'edit';
      step.operation = operation;
    }
  });

  // Probably editing the recent step in which case no sortments are needed
  if (operations.length > 1) {
    // Prepare meta-data for upcoming sortments
    const descriptor = Step.descriptor(operations[0].message);

    // Step exists
    if (descriptor) {
      LocalStorage.setItem('REBASE_OLD_STEP', descriptor.number);
      LocalStorage.setItem('REBASE_NEW_STEP', descriptor.number);
    } else {
      LocalStorage.setItem('REBASE_OLD_STEP', 'root');
      LocalStorage.setItem('REBASE_NEW_STEP', 'root');
    }

    // Building sort command
    let sort = `node ${Paths.tortilla.editor} sort`;

    if (options.udiff) {
      sort = `${sort} --udiff=${options.udiff}`;
    }

    sort = `GIT_SEQUENCE_EDITOR="${sort}"`;

    // Continue sorting the steps after step editing has been finished
    steps.forEach((step) => {
      const operation = step.operation;

      if (!operation) { return; }

      const index = operations.indexOf(operation);

      // Insert the following operation AFTER the step's operation
      operations.splice(index + 1, 0, {
        method: 'exec',
        command: `${sort} git rebase --edit-todo`,
      });
    });
  }

  // Whether we edit the most recent step or not, rebranching process should be initiated
  const rebranchSuper = `GIT_SEQUENCE_EDITOR="node ${Paths.tortilla.rebase} rebranch-super"`;

  // After rebase has finished, update the brancehs referencing the super steps
  operations.push({
    method: 'exec',
    command: `${rebranchSuper} git rebase --edit-todo`,
  });
}

// Adjusts upcoming step numbers in rebase
function sortSteps(operations, options) {
  // Grab meta-data
  const oldStep = LocalStorage.getItem('REBASE_OLD_STEP');
  const newStep = LocalStorage.getItem('REBASE_NEW_STEP');
  const submoduleCwd = LocalStorage.getItem('SUBMODULE_CWD');

  // If delta is 0 no sortments are needed
  if (oldStep === newStep) {
    LocalStorage.setItem('REBASE_HOOKS_DISABLED', 1);

    // Escape unless we need to update stepDiffs for submodules
    if (!submoduleCwd) { return; }
  }

  const stepLimit = getStepLimit(oldStep, newStep);
  let editFlag = false;
  let offset = 0;

  operations.slice().some((operation, index) => {
    const currStepDescriptor = Step.descriptor(operation.message || '');
    // Skip commits which are not step commits
    if (!currStepDescriptor) {
      return;
    }

    const currStepSplit = currStepDescriptor.number.split('.');
    const currSuperStep = currStepSplit[0];
    const currSubStep = currStepSplit[1];

    if (submoduleCwd) {
      // If this is a super step, replace pick operation with the super pick
      if (!currSubStep) {
        operations.splice(index + offset, 1, {
          method: 'exec',
          command: `node ${Paths.tortilla.rebase} super-pick ${operation.hash}`,
        });
      }
    } else if (currSuperStep > stepLimit) {
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
    if (operation.method === 'edit') {
      // Pick BEFORE edit
      operations.splice(index + offset++, 0, {...operation, 
        method: 'pick'});

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

    // If specified udiff is a path to another tortilla repo
    if (options.udiff) {
      const subCwd = Utils.cwd();
      const cwd = Path.resolve(Utils.cwd(), options.udiff);

      // Update the specified repo's manual files
      // Note that TORTILLA_CHILD_PROCESS and TORTILLA_CWD flags are set to
      // prevent external interventions, mostly because of tests
      operations.push({
        method: 'exec',
        command: Utils.shCmd(`
          export GIT_DIR=${cwd}/.git
          export GIT_WORK_TREE=${cwd}
          export TORTILLA_CHILD_PROCESS=true
          export TORTILLA_CWD=${cwd}
          export TORTILLA_SUBMODULE_CWD=${subCwd}

          if node ${Paths.cli.tortilla} step edit --root ; then
            git rebase --continue
          else
            git rebase --abort
          fi
        `),
      });
    }

    // Ensure step map is being disposed
    operations.push({
      method: 'exec',
      command: `node ${Paths.tortilla.localStorage} remove STEP_MAP STEP_MAP_PENDING`,
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
    command: 'git reset --hard HEAD~1',
  });

  // Re-pick and edit head commit
  operations.push({
    method: 'edit',
    hash,
    message,
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

  // Re-adjust branch references since hash values are outdated at this point
  operations.push({
    method: 'exec',
    command: `node ${Paths.tortilla.rebase} rebranch-super`,
  });
}

// The step limit of which sortments are needed would be determined by the step
// which is greater
function getStepLimit(oldStep, newStep) {
  oldStep = oldStep === 'root' ? '0' : oldStep;
  let newSuperStep = newStep === 'root' ? '0' : newStep;

  // Grabbing step splits for easy access
  const oldStepSplits = oldStep.split('.');
  const newStepSplits = newStep.split('.');
  const oldSuperStep = oldStepSplits[0];
  newSuperStep = newStepSplits[0];
  const oldSubStep = oldStepSplits[1];
  const newSubStep = newStepSplits[1];

  if (oldSuperStep === newSuperStep) {
    // 1.1, 1.2 or 1.2, 1.1 or 1.1 or 1.1, 1
    if (oldSubStep) {
      return oldSuperStep;
    }

    // 1, 1.1
    return Infinity;
  }

  // 1, 2.1
  if (!oldSubStep && newSubStep && Number(newSuperStep) === Number(oldSuperStep) + 1) {
    return newSuperStep;
  }

  // 2.1, 1
  if (!newSubStep && oldSubStep && Number(oldSuperStep) === Number(newSuperStep) + 1) {
    return oldSuperStep;
  }

  // 1, 2 or 1, 3.1 or 1.1, 2.1 or 1.1, 2
  return Infinity;
}

// Convert rebase file content to operations array
function disassemblyOperations(rebaseFileContent) {
  const operations = rebaseFileContent.match(/^[a-z]+\s.{7}.*$/mg);

  if (!operations) {
    return [];
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
  return operations
  // Compose lines
    .map((operation) => Object
      .keys(operation)
      .map((k) => operation[k])
      .join(' '),
    )
    // Connect lines
    .join('\n') + '\n';
}
