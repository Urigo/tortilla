#!/usr/bin/env node

import * as Program from 'commander';
import { Dump } from '../dump';
import { Utils } from '../utils';

const exec = Utils.exec as any;

/**
  Dump CLI.
 */

 Program
   .command('create [out]')
   .description('Dumps tutorial data as a JSON file')
   .option('--filter [filter]', 'Filter branches')
   .option('--reject [reject]', 'Reject branches')
   .option('--override', 'Override project file if already exists')
   .action((out, options) => {
     Dump.create(out, {
       filter: options.filter && options.filter.split(/\s+/),
       reject: options.reject && options.reject.split(/\s+/),
     });
   });

Program
  .command('diff-releases <dumpFile> <srcRelease> <dstRelease>')
  .description('Prints diff between srcRelease and dstRelease')
  .action((dumpFile, srcRelease, dstRelease) => {
    Utils.inspect(Dump.diffReleases(dumpFile, srcRelease, dstRelease));
  });

Program.parse(process.argv);
