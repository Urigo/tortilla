#!/usr/bin/env node

import * as Program from 'commander';
import { localStorage as LocalStorage } from '../local-storage';
import { Release } from '../release';

/**
 Release CLI.
 */

Program
  .command('bump <type>')
  .description('Bumps the current release of the tutorial')
  .option('-m, --message [message]', 'A message describing the newly created release')
  .action((type, options) => {
    LocalStorage.assertTortilla(true);
    Release.bump(type, options);
  });

Program
  .command('current')
  .description('Prints the current release')
  .action(() => {
    LocalStorage.assertTortilla(true);
    Release.printCurrent();
  });

Program
  .command('diff <sourceRelease> <destinationRelease>')
  .description('Runs `git diff` between 2 specified releases')
  .allowUnknownOption(true)
  .action((sourceRelease, destinationRelease) => {
    LocalStorage.assertTortilla(true);
    Release.diff(sourceRelease, destinationRelease, process.argv.slice(5));
  });

Program
  .command('edit-notes <release>')
  .description('Attaches a message to a release')
  .option('-b, --branch [branch]', 'Release branch')
  .option('-e, --editor [editor]', 'Editor file name')
  .option('-m, --message [message]', 'A message describing the release')
  .action((release, options) => {
    LocalStorage.assertTortilla(true);
    Release.editNotes(release, options)
  });

Program
  .command('view-notes <release>')
  .description('View message of a release')
  .option('-b, --branch [branch]', 'Release branch')
  .option('-p, --pager [pager]', 'Pager file name')
  .action((release, options) => {
    LocalStorage.assertTortilla(true);
    Release.viewNotes(release, options)
  });

Program.parse(process.argv);
