const Fs = require('fs-extra');
const Tmp = require('tmp');

const gitConflict = /\n<<<<<<< .+(\n(?:.|\n)+)\n=======(\n(?:.|\n)+)\n>>>>>>> .+/;

function updateDependencies(updatedDeps) {
  if (updatedDeps) {
    if (!(updatedDeps instanceof Object)) {
      throw TypeError('New dependencies must be described using an object');
    }
  }
  else {
    const pack = JSON.parse(Fs.readFileSync(Paths.npm.package).toString());

    const deps = Object.assign({},
      pack.dependencies,
      pack.devDependencies,
      pack.peerDependencies
    );

    updatedDeps = JSON.parse(gitEdit(JSON.stringify(pack, null, 2)));
  }

  const packSteps = Git([
    'log',
    '--format=%s',
    '--grep=^Step [0-9]\\+',
    '--',
    Paths.npm.package,
  ]).split('\n')
    .map(line => Step.descriptor(line).number);

  const missingSuperSteps = Git([
    'log',
    '--format=%s',
    '--grep=^Step [0-9]\\+\\.[0-9]\\+:'
  ]).split('\n')
    .map(line => Step.descriptor(line).number.toString())
    .filter(step => packSteps.includes(step));

  const steps = []
    .concat(packSteps)
    .concat(missingSuperSteps)
    .sort();

  // Checking if the root commit has affected the package.json, since it has been
  // filtered in the last operation
  const shouldEditRoot = Git([
    'diff-tree', '--no-commit-id', '--name-only', '-r', Git.rootHash()
  ]).includes('package.json');

  if (shouldEditRoot) {
    steps.push('--root');
  }

  Step.edit(steps);

  while (Git.rebasing()) {
    // Reading package.json content and ensuring it's formatted correctly
    let packContent = Fs.readFileSync(Paths.npm.package).toString();
    packContent = JSON.parse(packContent);
    packContent = JSON.stringify(packContent, null, 2);

    let headPackContent = currPackContent = packContent;
    // Keep replacing conflict notations until we get both unresolved versions
    for (
      let newHeadPackContent, newCurrPackContent;
      newHeadPackContent != headPackContent &&
      newCurrPackContent != currPackContent;
      newHeadPackContent = headPackContent.replace(gitConflict, '$1'),
      newCurrPackContent = currPackContent.replace(gitConflict, '$2');
    ) {
      headPackContent = newHeadPackContent;
      currPackContent = newCurrPackContent;
    }

    const headPack = JSON.parse(headPackContent);
    const currPack = JSON.parse(currPackContent);

    // Picking the updated dependencies versions
    ['dependencies', 'devDependencies', 'peerDependencies'].forEach((depsBatch) => {
      Object.keys(headPack[depsBatch]).forEach((dep) => {
        if (currPack[depsBatch][dep]) {
          currPack[depsBatch][dep] = headPack[depsBatch][dep];
        }
      });
    });

    Fs.writeFileSync(Paths.npm.package, JSON.stringify(currPack));

    Git(['add', Paths.npm.package]);
    Git(['commit', '--amend'], { env: { GIT_EDITOR: true } });
    Git(['rebase', '--continue']);
  }
}

function gitEdit(initialContent) {
  const editor = getGitEditor();
  const file = Tmp.fileSync({ unsafeCleanup: true });

  Fs.writeFileSync(file.name, initialContent);
  Utils.exec.print(editor, file.name);

  return Fs.readFileSync(file.name).toString();
}

// https://github.com/git/git/blob/master/git-rebase--interactive.sh#L257
function getGitEditor() {
  const editor = (
    process.env.GIT_EDITOR ||
    Git(['config', 'editor']) ||
    Git(['var', 'GIT_EDITOR'])
  );

  if (!editor) {
    throw Error('Git editor could not be found');
  }

  return editor;
}
