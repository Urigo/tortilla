#!/usr/bin/env node

import * as Program from 'commander';
import { localStorage as LocalStorage} from '../local-storage';

/**
  Strict CLI.
 */

Program
  .command('get')
  .description('Prints whether strict mode is enabled or disabled')
  .action(() => {
    LocalStorage.assertTortilla(true);
    const mode = !!LocalStorage.getItem('USE_STRICT');
    printStrictMode(mode);
  });

Program
  .command('set <mode>')
  .description('Sets strict mode')
  .action((mode) => {
    LocalStorage.assertTortilla(true);
    mode = JSON.parse(mode);

    if (mode) {
      LocalStorage.setItem('USE_STRICT', true);
    } else {
      LocalStorage.removeItem('USE_STRICT');
    }

    printStrictMode(mode);
  });

function printStrictMode(mode) {
  if (mode == null) {
    mode = !!LocalStorage.getItem('USE_STRICT');
  }
  const strictStatus = mode ? 'enabled' : 'disabled';
  console.log();
  console.log(`Strict mode is ${strictStatus}`);
  console.log();
}

Program.parse(process.argv);
