import { tortillaBeforeAll, tortillaBeforeEach } from './tests-helper';
import './custom-matchers';
import * as Fs from 'fs-extra';
import * as Tmp from 'tmp';
import { Paths } from '../src/paths';

let context: any = {};

describe('Dump', () => {
  beforeAll(() => {
    tortillaBeforeAll.bind(context)();

    context.dumpFile = Tmp.tmpNameSync();

    context.readDumpFile = (parse) => {
      const dumpContent = Fs.readFileSync(context.dumpFile).toString();

      return parse ? JSON.parse(dumpContent) : dumpContent;
    };
  });

  beforeEach(tortillaBeforeEach.bind(context));

  afterEach(function () {
    Fs.removeSync(context.dumpFile);
  });

  it('should dump all branches which has at least a single release', function () {
    const testBranches = ['foo', 'bar', 'baz'];

    testBranches.forEach((branchName) => {
      context.git(['checkout', '-b', branchName]);
      context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
      context.git(['checkout', 'master']);
    });

    context.tortilla(['dump', context.dumpFile]);

    expect(context.readDumpFile()).toContainSameContentAsFile('dumps/branches-dump.json');
  });

  it('should dump all releases - sorted by chronological order', function () {
    context.tortilla(['release', 'bump', 'minor', '-m', 'master release 1']);
    context.tortilla(['release', 'bump', 'minor', '-m', 'master release 2']);
    context.tortilla(['release', 'bump', 'minor', '-m', 'master release 3']);
    context.tortilla(['dump', context.dumpFile]);

    expect(context.readDumpFile()).toContainSameContentAsFile('dumps/releases-dump.json');
  });

  it('should dump all manuals - views should have no headers nor footers', function () {
    const comments = ['foo', 'bar', 'baz'];

    comments.forEach((comment, index) => {
      const step = index + 1;

      context.tortilla(['step', 'tag', '-m', comment]);
      context.tortilla(['step', 'edit', step]);
      Fs.writeFileSync(`${Paths.manuals.templates}/step${step}.tmpl`, comment);
      context.tortilla(['manual', 'render', step]);
      context.git(['add', '.']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
    });

    context.tortilla(['release', 'bump', 'minor', '-m', 'master release']);
    context.tortilla(['dump', context.dumpFile]);

    expect(context.readDumpFile()).toContainSameContentAsFile('dumps/manuals-dump.json');
  });


  it('should dump all - mixed scenario', function () {
    // Manuals dump
    const comments = ['foo', 'bar', 'baz'];

    comments.forEach((comment, index) => {
      const step = index + 1;

      context.tortilla(['step', 'tag', '-m', comment]);
      context.tortilla(['step', 'edit', step]);
      Fs.writeFileSync(`${Paths.manuals.templates}/step${step}.tmpl`, comment);
      context.tortilla(['manual', 'render', step]);
      context.git(['add', '.']);
      context.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      context.git(['rebase', '--continue']);
    });

    const testBranches = ['foo', 'bar', 'baz'];

    testBranches.forEach((branchName) => {
      context.git(['checkout', '-b', branchName]);
      context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 1`]);
      context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 2`]);
      context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 3`]);
      context.git(['checkout', 'master']);
    });

    context.tortilla(['dump', context.dumpFile]);

    expect(context.readDumpFile()).toContainSameContentAsFile('dumps/mixed-dump.json');
  });

  it('should be able to filter branches', function () {
    const testBranches = ['foo', 'bar', 'baz', 'qux'];

    testBranches.forEach((branchName) => {
      context.git(['checkout', '-b', branchName]);
      context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
      context.git(['checkout', 'master']);
    });

    context.tortilla(['dump', context.dumpFile, '--filter', 'foo bar baz']);

    expect(context.readDumpFile()).toContainSameContentAsFile('dumps/branches-dump.json');
  });

  it('should be able to reject branches', function () {
    const testBranches = ['foo', 'bar', 'baz', 'qux'];

    testBranches.forEach((branchName) => {
      context.git(['checkout', '-b', branchName]);
      context.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
      context.git(['checkout', 'master']);
    });

    context.tortilla(['dump', context.dumpFile, '--reject', 'qux']);

    expect(context.readDumpFile()).toContainSameContentAsFile('dumps/branches-dump.json');
  });

  it('should create dirs recursively if output not dir not exist', function () {
    const out = `${context.dumpFile}/foo/bar/baz.json`;
    context.tortilla(['dump', out]);

    expect(context.exists(out, 'file')).toBeTruthy();
  });

  it('should create a tutorial.json file inside dir if already exists', function () {
    Fs.mkdirSync(context.dumpFile);
    context.tortilla(['dump', context.dumpFile]);

    expect(context.exists(`${context.dumpFile}/tutorial.json`, 'file'));
  });
});
