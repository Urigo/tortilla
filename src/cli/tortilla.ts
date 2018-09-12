#!/usr/bin/env node

import * as Program from 'commander';
import * as semver from 'semver';
import * as Pack from '../../package.json';
import { Essentials } from '../essentials';
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
  .command('clone <url> [out]')
  .description('Clone a Tortilla project')
  .action((url, out) => {
    Essentials.clone(url, out)
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
