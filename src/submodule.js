const Fs = require('fs-extra');
const Minimist = require('minimist');
const Git = require('./git');
const Paths = require('./paths');
const Step = require('./step');
const Utils = require('./utils');


const exec = Utils.exec;


(function () {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_'],
  });

  const method = argv._[0];
  const arg1 = argv._[1];

  switch (method) {
    case 'ensure': return ensureSubmodules(arg1);
  }
}());

function addSubmodules(remotes) {
  // remote-name mapping loop
  for (let i = 0; i < remotes.length; i++) {
    const remote = remotes[i];
    let name = remotes[i + 1];

    // No remote name was provided, but yet another remote
    if (name && !name.includes('/')) {
      remotes[i++] = { remote, name };

      continue;
    }

    name = getSubmoduleName(remote);

    if (!remote.includes('/')) {
      throw Error('Provided remote is not a path');
    }

    remotes[i] = { remote, name };
  }

  const rebasing = Git.rebasing();

  // Submodule can only be added in the root commit, therefore in case we're rebasing
  // we should check whether we're editing the root or not
  if (rebasing) {
    const commitHash = Git.recentCommit(['--format=%H']);
    const rootHash = Git.rootHash();

    if (commitHash != rootHash) {
      throw TypeError("Can't add submodules in the middle of the stack");
    }
  }
  else {
    Step.edit('root');
  }

  remotes.forEach(({ remote, name }) => {
    Git.print(['submodule', 'add', remote, name]);
    Git.print(['add', name]);
  });

  Git.print(['add', '.gitmodules']);

  // If we're not in rebase mode, amend the changes
  if (!rebasing) {
    Git.print(['commit', '--amend'], {
      env: {
        GIT_EDITOR: true,
      }
    });
    Git.print(['rebase', '--continue']);
  }
}

// Source: https://github.com/tj/git-extras/blob/master/bin/git-delete-submodule
function removeSubmodules(submodules) {
  if (!submodules || submodules.length == 0) {
    submodules = listSubmodules();
  }

  const rebasing = Git.rebasing();

  // Submodule can only be removed from the root commit, therefore in case we're rebasing
  // we should check whether we're editing the root or not
  if (rebasing) {
    const commitHash = Git.recentCommit(['--format=%H']);
    const rootHash = Git.rootHash();

    if (commitHash != rootHash) {
      throw TypeError("Can't remove submodules from the middle of the stack");
    }
  }
  else {
    Step.edit('root');
  }

  submodules.forEach((submodule) => {
    Git.print(['submodule', 'deinit', '-f', submodule]);
    exec('rmdir', [submodule]);
    exec('rm', ['-rf', `.git/modules/${submodule}`]);
    Git([
      'config', '--file=.gitmodules', '--remove-section', `submodule.${submodule}`
    ]);
    Git(['add', '.gitmodules']);
    // This will also stage the submodule
    Git(['rm', '--cached', '-rf', submodule]);
  });

  ensureSubmodules('root', rebasing);

  // If we're not in rebase mode, amend the changes
  if (!rebasing) {
    Git.print(['commit', '--amend'], {
      env: {
        GIT_EDITOR: true,
      }
    });
    Git.print(['rebase', '--continue']);
  }
}

function updateSubmodules(submodules) {
  if (!submodules || submodules.length == 0) {
    submodules = listSubmodules();
  }

  const rebasing = Git.rebasing();

  // Submodule can only be removed from the root commit, therefore in case we're rebasing
  // we should check whether we're editing the root or not
  if (rebasing) {
    const commitHash = Git.recentCommit(['--format=%H']);
    const rootHash = Git.rootHash();

    if (commitHash != rootHash) {
      throw TypeError("Can't remove submodules from the middle of the stack");
    }
  }
  else {
    Step.edit('root');
  }

  submodules.forEach((submodule) => {
    Git.print(['submodule', 'update', submodule]);
    Git.print(['add', submodule]);
  });

  // If we're not in rebase mode, amend the changes
  if (!rebasing) {
    Git.print(['commit', '--amend'], {
      env: {
        GIT_EDITOR: true,
      }
    });
    Git.print(['rebase', '--continue']);
  }
}

function listSubmodules() {
  const root = Git.root();

  if (!root) return [];

  let configData;
  try {
    configData = Git([
      'config', '--file', '.gitmodules', '--name-only', '--get-regexp', 'path'
    ]);
  // No submodules exit
  } catch (e) {
    return [];
  }

  return configData.split('\n').map((submodule) => {
    return submodule.split('.')[1];
  });
}

function isSubmodule() {
  const root = Git.root();

  if (!root) return false;

  // If the directory one level up the root is a git project then it means that
  // the current directory is a git project as well
  try {
    // This command should only work if we're in a git project
    return !!git(['rev-parse', '--show-toplevel'], {
      cwd: Path.resolve(root, '..'),
    });
  } catch (e) {
    return false;
  }
}

// Ensures that all submodules are set to the current hash based on the checkouts file
// and the provided step index
function ensureSubmodules(step, rebasing) {
  if (step == 'root') {
    step = 0;
  }

  // Ensure submodules are set to the right branches when picking the new super step
  const checkouts = getSubmoduleCheckouts();

  Object.keys(checkouts).forEach((submodule) => {
    const hash = checkouts[submodule].hashes[step];

    Git(['checkout', hash], {
      cwd: `${Utils.cwd()}/${submodule}`
    });

    Git(['add', submodule]);
  });

  // If not rebasing to begin with, amend the changes
  if (!rebasing) {
    Git(['commit', '--amend', '--allow-empty'], {
      env: {
        TORTILLA_CHILD_PROCESS: true,
        GIT_EDITOR: true
      }
    });
  }
}

function getSubmoduleCheckouts(whiteList) {
  if (whiteList) {
    whiteList = [].concat(whiteList);
  }

  const submodules = listSubmodules();
  const checkouts = Utils.exists(Paths.checkouts) ?
    Fs.readJsonSync(Paths.checkouts) : {};

  Object.keys(checkouts).forEach((coSubmodule) => {
    // Filter based on white list
    if (whiteList && !whiteList.includes(coSubmodule)) {
      delete checkouts[coSubmodule];
      return;
    }

    if (!submodules.includes(coSubmodule)) {
      throw Error(`Submodule "${coSubmodule}" not found`);
    }

    const { head, steps } = checkouts[coSubmodule];

    if (!head) {
      throw Error(`Submodule "${coSubmodule}" head not specified`);
    }

    if (!steps) {
      throw Error(`Submodule "${coSubmodule}" steps not specified`);
    }

    const hashes = checkouts[coSubmodule].hashes = [];

    // Execution commands will run against the current submodule
    steps.forEach((coSuperIndex, superIndex) => {
      const cwd = `${Utils.cwd()}/${coSubmodule}`;
      let coSuperHash;

      if (coSuperIndex == 'root') {
        coSuperHash = Git(['rev-list', '--max-parents=0', 'HEAD'], { cwd });
      }
      else {
        coSuperHash = Git([
          'log', head, `--grep=^Step ${coSuperIndex}:`, '--format=%H'
        ], { cwd });
      }

      if (!coSuperHash) {
        throw Error(`Super step ${coSuperIndex} in submodule "${coSubmodule}" not found`);
      }

      hashes.push(coSuperHash);
    });
  });

  return checkouts;
}

function getSubmoduleName(remote) {
  return remote
    .split('/')
    .pop()
    .split('.')
    .shift();
}


module.exports = {
  add: addSubmodules,
  remove: removeSubmodules,
  update: updateSubmodules,
  list: listSubmodules,
  isOne: isSubmodule,
  ensure: ensureSubmodules,
};
