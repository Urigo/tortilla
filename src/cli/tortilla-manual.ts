#!/usr/bin/env node

import * as Program from 'commander';
import { localStorage as LocalStorage} from '../local-storage';
import { Manual} from '../manual';

/**
  Manual CLI.
 */

Program
  .command('render [step]')
  .description('Render [step] manual to its opposite format')
  .option('--root', "Render 'README.md'")
  .option('--all', 'Render all manuals through out history')
  .action((step, options) => {
    LocalStorage.assertTortilla(true);
    step = step || (options.root && 'root');
    step = step || (options.all && 'all');
    Manual.render(step);
  });

Program.parse(process.argv);
