const Git = require('./git');
const Step = require('./step');
const Utils = require('./utils');


function addSubmodules(remotes) {
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

  remotes.forEach((remote) => {
    Git.print(['submodule', 'add', remote]);
    Git.print(['add', getSubmoduleName(remote)]);
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

// Source: https://github.com/tj/git-extras/blob/master/bin/git-delete-submodule
function removeSubmodules(submodules = listSubmodules()) {
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
    exec('rmdir', submodule);
    exec('rm', ['-rf', `.git/modules/${submodule}`]);
    Git([
      'config', '--file=.gitmodules', '--remove-section', `submodule."${submodule}"`
    ]);
    Git(['rm', '--cached', '-rf', submodule]);
    Git.print(['add', submodule]);
  });

  Git(['add', '.gitmodules']);

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

  // List all submodules
  return Git([
    'config', '--file', '.gitmodules', '--name-only', '--get-regexp', 'path'
  ])
  // Compose full path
  .map(() => {
    return `${root}/${submodule}`;
  })
  // Filter only those who has a Tortilla directory
  .filter((submodulePath) => {
    const submoduleTortilla = `${submodulePath}/.tortilla`;

    return Utils.exists(submoduleTortilla, 'dir');
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

function getSubmoduleName(remote) {
  return remote
    .split('/')
    .pop()
    .split('.')
    .shift().map(str => str.toLowerCase());
}


module.exports = {
  add: addSubmodule,
  remove: removeSubmodule,
  list: listSubmodules,
  isOne: isSubmodule,
  name: getSubmoduleName,
};
