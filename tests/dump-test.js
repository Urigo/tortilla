const Chai = require('chai');
const Fs = require('fs-extra');
const Tmp = require('tmp');
const Paths = require('../src/paths');


const expect = Chai.expect;


describe('tortilla dump', function () {
  before(function () {
    this.dumpFile = Tmp.tmpNameSync();

    this.readDumpFile = (parse) => {
      const dumpContent = Fs.readFileSync(this.dumpFile).toString();

      return parse ? JSON.parse(dumpContent) : dumpContent;
    };
  });

  afterEach(function () {
    Fs.removeSync(this.dumpFile);
  });

  it('should dump all branches which has at least a single release', function () {
    this.slow(10000);

    const testBranches = ['foo', 'bar', 'baz'];

    testBranches.forEach((branchName) => {
      this.git(['checkout', '-b', branchName]);
      this.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
      this.git(['checkout', 'master']);
    });

    this.tortilla(['dump', this.dumpFile]);

    expect(this.readDumpFile()).to.be.a.file('dumps/branches-dump.json');
  });

  it('should dump all releases - sorted by chronological order', function () {
    this.slow(10000);

    this.tortilla(['release', 'bump', 'minor', '-m', 'master release 1']);
    this.tortilla(['release', 'bump', 'minor', '-m', 'master release 2']);
    this.tortilla(['release', 'bump', 'minor', '-m', 'master release 3']);

    this.tortilla(['dump', this.dumpFile]);

    expect(this.readDumpFile()).to.be.a.file('dumps/releases-dump.json');
  });

  it('should dump all manuals - views should have no headers nor footers', function () {
    this.slow(25000);

    const comments = ['foo', 'bar', 'baz'];

    comments.forEach((comment, index) => {
      const step = index + 1;

      this.tortilla(['step', 'tag', '-m', comment]);
      this.tortilla(['step', 'edit', step]);

      Fs.writeFileSync(`${Paths.manuals.templates}/step${step}.tmpl`, comment);


      this.tortilla(['manual', 'render', step]);

      this.git(['add', '.']);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);
    });

    this.tortilla(['release', 'bump', 'minor', '-m', 'master release']);
    this.tortilla(['dump', this.dumpFile]);

    expect(this.readDumpFile()).to.be.a.file('dumps/manuals-dump.json');
  });

  it('should dump all - mixed scenario', function () {
    this.timeout(100000);
    this.slow(50000);

    // Manuals dump
    const comments = ['foo', 'bar', 'baz'];

    comments.forEach((comment, index) => {
      const step = index + 1;

      this.tortilla(['step', 'tag', '-m', comment]);
      this.tortilla(['step', 'edit', step]);

      Fs.writeFileSync(`${Paths.manuals.templates}/step${step}.tmpl`, comment);


      this.tortilla(['manual', 'render', step]);

      this.git(['add', '.']);
      this.git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
      this.git(['rebase', '--continue']);
    });

    const testBranches = ['foo', 'bar', 'baz'];

    testBranches.forEach((branchName) => {
      this.git(['checkout', '-b', branchName]);
      this.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 1`]);
      this.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 2`]);
      this.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release 3`]);
      this.git(['checkout', 'master']);
    });

    this.tortilla(['dump', this.dumpFile]);

    expect(this.readDumpFile()).to.be.a.file('dumps/mixed-dump.json');
  });

  it('should be able to filter branches', function () {
    this.slow(15000)

    const testBranches = ['foo', 'bar', 'baz', 'qux'];

    testBranches.forEach((branchName) => {
      this.git(['checkout', '-b', branchName]);
      this.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
      this.git(['checkout', 'master']);
    });

    this.tortilla(['dump', this.dumpFile, '--filter', 'foo bar baz']);

    expect(this.readDumpFile()).to.be.a.file('dumps/branches-dump.json');
  });

  it('should be able to reject branches', function () {
    this.slow(15000)

    const testBranches = ['foo', 'bar', 'baz', 'qux'];

    testBranches.forEach((branchName) => {
      this.git(['checkout', '-b', branchName]);
      this.tortilla(['release', 'bump', 'minor', '-m', `${branchName} release`]);
      this.git(['checkout', 'master']);
    });

    this.tortilla(['dump', this.dumpFile, '--reject', 'qux']);

    expect(this.readDumpFile()).to.be.a.file('dumps/branches-dump.json');
  });

  it('should create dirs recursively if output not dir not exist', function () {
    this.slow(300);

    const out = `${this.dumpFile}/foo/bar/baz.json`;

    this.tortilla(['dump', out]);

    expect(this.exists(out, 'file')).to.be.true;
  });

  it('should create a tutorial.json file inside dir if already exists', function () {
    this.slow(300);

    Fs.mkdirSync(this.dumpFile);

    this.tortilla(['dump', this.dumpFile]);

    expect(this.exists(`${this.dumpFile}/tutorial.json`, 'file'));
  });
});
