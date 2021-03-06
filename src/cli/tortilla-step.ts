#!/usr/bin/env node

import * as Program from 'commander';
import { Git } from '../git';
import { localStorage as LocalStorage } from '../local-storage';
import { Step } from '../step';

/**
 Step CLI.
 */

Program
  .command('push')
  .description('Pushes a new step')
  .option('-m, --message [message]', 'A message describing the newly created step')
  .option('--allow-empty', 'Allow an empty step to be pushed')
  .action((options) => {
    LocalStorage.assertTortilla(true);
    Step.push(options.message, options);
  });

Program
  .command('pop')
  .description('Pops the most recent step')
  .action(() => {
    LocalStorage.assertTortilla(true);
    Step.pop();
  });

Program
  .command('tag')
  .description('Mark this step as finished and move on to the next one')
  .option('-m, --message [message]', 'A message describing the newly created step')
  .action((options) => {
    LocalStorage.assertTortilla(true);
    Step.tag(options.message);
  });

Program
  .command('edit [steps...]')
  .description('Edits the specified step/s')
  .option('--root [root]', 'Edit the root step (initial commit)')
  .option('--udiff [updateDiff]', 'Update step-diffs of manuals being rebased')
  .action((steps, options) => {
    LocalStorage.assertTortilla(true);

    if (options.root) {
      steps.unshift('root');
    }

    Step.edit(steps, options);
  });

Program
  .command('sort [step]')
  .description('Adjust all step indexes from a given step index')
  .option('--root [root]', 'Adjust from root commit')
  .action((step, options) => {
    LocalStorage.assertTortilla(true);
    step = step || (options.root && 'root');
    Step.sort(step);
  });

Program
  .command('reword [step]')
  .description("Rename the specified step's commit message")
  .option('-m, --message [message]', 'The new message of the reworded step')
  .option('--root', 'Reword the root step (initial commit)')
  .action((step, options) => {
    LocalStorage.assertTortilla(true);
    step = step || (options.root && 'root');
    Step.reword(step, options.message);
  });

Program
  .command('show <step>')
  .description('Run git-show for given step index')
  .allowUnknownOption(true)
  .action((step) => {
    const argv = Git.normalizeArgv(process.argv.slice(4))
    Step.show(step, ...argv);
  });

Program
  .command('back [targetStep]')
  .description('Go back to edit previous step')
  .option('-i, --interactive [interactive]', 'interactively pick step')
  .action((targetStep, options) => {
    Step.back(targetStep, options).catch((e) => {
      console.error(e.stack);
      process.exit(1);
    });
  });

Program.parse(process.argv);
