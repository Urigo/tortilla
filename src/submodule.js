const Git = require('./git');
const Paths = require('./paths');
const Step = require('./step');
const Utils = require('./utils');


const exec = Utils.exec;


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
    Git(['rm', '--cached', '-rf', submodule]);
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

function getSubmoduleCheckouts(whiteList) {
  if (whiteList) {
    whiteList = [].concat(whiteList);
  }

  const submodules = listSubmodules();
  const checkouts = Utils.exists(Paths.checkouts) ? require(Paths.checkouts) : {};

  // Applying defaults
  submodules.forEach((submodule) => {
    // Create an empty map for that specific submodule to prevent potential future
    // conflicts
    if (!checkouts[submodule]) {
      checkouts[submodule] = [];
    }
  });

  Object.keys(checkouts).forEach((coSubmodule) => {
    // Filter based on white list
    if (whiteList && !whiteList.includes(coSubmodule)) {
      delete checkouts[coSubmodule];
      return;
    }

    if (!submodules.includes(coSubmodule)) {
      throw Error(`Submodule ${coSubmodule} not found`);
    }

    const submoduleCheckouts = checkouts[coSubmodule];

    // Execution commands will run against the current submodule
    Utils.scopeEnv(() => submoduleCheckouts.forEach((coSuperIndex, superIndex) => {
      let coSuperHash;

      if (coSuperIndex == 'root') {
        coSuperHash = Git.rootHash();
      }
      else {
        const coSuperHash = Step.recentSuperCommit(coSuperIndex, '%h');

        if (!coSuperHash) {
          throw Error(`Super step ${coSuperIndex} in submodule ${submodule} not found`);
        }
      }

      submoduleCheckouts[superIndex] = coSuperHash;
    }), {
      TORTILLA_CWD: `${Utils.cwd()}/${coSubmodule}`
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
  checkouts: getSubmoduleCheckouts,
};
