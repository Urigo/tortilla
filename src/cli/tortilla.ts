#!/usr/bin/env node

import * as Program from 'commander';
import * as open from 'open';
import * as semver from 'semver';
import * as Pack from '../../package.json';
import { Essentials } from '../essentials';
import { Git } from '../git';
import { localStorage as LocalStorage } from '../local-storage';

if (!semver.gt(process.version, '6.0.0')) {
  /* tslint:disable-next-line */
  require('babel-register');
}

/**
  CLI entry point.
 */

Program
  .version(Pack.version)
  .description(Pack.description);

Program
  .command('create [name]')
  .description('Creates a new Tortilla project with the provided name')
  .option('-o, --output [path]', 'The output path of the newly created project')
  .option('-m, --message [message]', "The created project's initial commit's message")
  .option('--override', 'Override project directory if already exists')
  .action((name, options) => {
    Essentials.create(name, options);
  });

Program
  .command('init [name]')
  .description('Initializes Tortilla essentials in the provided project')
  .action((dir) => {
    const localStorage = dir ? LocalStorage.create(dir) : LocalStorage;
    localStorage.assertTortilla();
    Essentials.ensure(dir);
  });

Program
  .command('dispose [cwd]')
  .description('Remove tortilla from project')
  .action(cwd => {
    LocalStorage.assertTortilla(true);
    Essentials.dispose(cwd);
    console.log('Tortilla successfully disposed');
  })

Program
  .command('push <remote> <branch>')
  .description('Push tutorial <branch> and related git-assets to <remote>')
  .action((remote, branch) => {
    Git.pushTutorial(remote, branch);
  });

Program
  .command('pull <remote> <branch>')
  .description('Pull tutorial <branch> and related git-assets from <remote>')
  .action((remote, branch) => {
    Git.pullTutorial(remote, branch);
  });

Program
  .command('review <remote> <branch>')
  .option('-p, --print [print]', 'Print only, do not open in browser')
  .description('Print a comparison URL between original branch currently changed branch')
  .action((remote, branch, options) => {
    const url = Git.reviewTutorial(remote, branch)

    if (options.print) {
      console.log(url)
    } else {
      console.log('Opening...')
      open(Git.reviewTutorial(remote, branch));
    }
  });

Program
  .command('status')
  .description('Print edit status followed by git-status')
  .option('-i, --instruct [instruct]', 'Print additional instructions')
  .action((options) => {
    Git.tutorialStatus(options);
  });

Program
  .command('dump <command...>', 'Manage dump file')
  .command('manual <command...>', 'Manage manual files')
  .command('package <command...>', 'Manage package.json')
  .command('release <command...>', 'Manage tutorial releases')
  .command('step <command...>', 'Manage step commits history')
  .command('strict <command...>', 'Manage strict mode')
  .command('submodule <command...>', 'Manage submodules');

Program.parse(process.argv);
