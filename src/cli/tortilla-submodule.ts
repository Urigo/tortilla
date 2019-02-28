#!/usr/bin/env node

import * as Program from 'commander';
import { localStorage as LocalStorage } from '../local-storage';
import { Submodule } from '../submodule';

/**
 Submodule CLI.
 */

Program
  .command('add <name> <url>')
  .description('Add submodule <name> from <url>')
  .action((name, url, hash) => {
    LocalStorage.assertTortilla(true);
    Submodule.add(name, url);
  });

Program
  .command('remove <name>')
  .description('Remove submodule <name>')
  .action((name) => {
    LocalStorage.assertTortilla(true);
    Submodule.remove(name);
  });

Program
  .command('update <name>')
  .description('Update/init submodule <name>')
  .action((name) => {
    LocalStorage.assertTortilla(true);
    Submodule.update(name);
  });

Program
  .command('fetch <name>')
  .description('Fetch objects from submodule <name> origin remote')
  .action((name) => {
    LocalStorage.assertTortilla(true);
    Submodule.fetch(name);
  });

Program
  .command('reset <name>')
  .description('Unclone submodule <name> but keep it initialized')
  .action((name) => {
    LocalStorage.assertTortilla(true);
    Submodule.reset(name);
  });

Program
  .command('checkout <name> <ref>')
  .description('Checkout submodule <name> to <ref>')
  .action((name, ref) => {
    LocalStorage.assertTortilla(true);
    Submodule.checkout(name, ref);
  });

Program.parse(process.argv);
