#!/usr/bin/env node

import * as Program from 'commander';
import { Dump } from '../dump';
import { Utils } from '../utils';

const exec = Utils.exec as any;

/**
  Dump CLI.
 */

 Program
   .description('Dumps tutorial data as a JSON file')
   .option('-o, --out [out]', 'The output file path')
   .option('--filter [filter]', 'Filter branches')
   .option('--reject [reject]', 'Reject branches')
   .option('--override', 'Override project file if already exists')
   .action((options) => {
     Dump.create(options.out, {
       filter: options.filter && options.filter.split(/\s+/),
       reject: options.reject && options.reject.split(/\s+/),
     });
   });

Program
  .command('diff-releases <dumpFile> <srcRelease> <dstRelease>')
  .description('Prints diff between srcRelease and dstRelease')
  .action((dumpFile, srcRelease, dstRelease) => {
    exec.print('less', {
      input: Dump.diffReleases(dumpFile, srcRelease, dstRelease)
    })
  });

Program.parse(process.argv);
