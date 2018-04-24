import * as Fs from 'fs-extra';
import * as Minimist from 'minimist';
import * as Path from 'path';
import { Git } from './git';
import { Paths } from './paths';
import { Step } from './step';
import { Utils } from './utils';

const exec = Utils.exec;

function init() {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_'],
  });

  const method = argv._[0];
  const arg1 = argv._[1];

  switch (method) {
    case 'ensure':
      return ensureSubmodules(arg1);
  }
}

init();

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

    name = getRemoteSubmoduleName(remote);

    if (!remote.includes('/')) {
      throw Error('Provided remote is not a path');
    }

    remotes[i] = { remote, name };
  }

  // Cleanup names leftovers
  remotes = remotes.filter((raw) => typeof raw !== 'string');

  const rebasing = Git.rebasing();

  // Submodule can only be added in the root commit, therefore in case we're rebasing
  // we should check whether we're editing the root or not
  if (rebasing) {
    const commitHash = Git.recentCommit(['--format=%H']);
    const rootHash = Git.rootHash();

    if (commitHash !== rootHash) {
      throw TypeError('Can\'t add submodules in the middle of the stack');
    }
  } else {
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
      },
    });
    Git.print(['rebase', '--continue']);
  }
}

// Source: https://github.com/tj/git-extras/blob/master/bin/git-delete-submodule
function removeSubmodules(submodules) {
  if (!submodules || submodules.length === 0) {
    submodules = listSubmodules();
  }

  const rebasing = Git.rebasing();

  // Submodule can only be removed from the root commit, therefore in case we're rebasing
  // we should check whether we're editing the root or not
  if (rebasing) {
    const commitHash = Git.recentCommit(['--format=%H']);
    const rootHash = Git.rootHash();

    if (commitHash !== rootHash) {
      throw TypeError('Can\'t remove submodules from the middle of the stack');
    }
  } else {
    Step.edit('root');
  }

  submodules.forEach((submodule) => {
    Git.print(['submodule', 'deinit', '-f', submodule]);
    exec('rmdir', [submodule]);
    exec('rm', ['-rf', `.git/modules/${submodule}`]);
    Git([
      'config', '--file=.gitmodules', '--remove-section', `submodule.${submodule}`,
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
      },
    });
    Git.print(['rebase', '--continue']);
  }
}

// This is useful when we not only want to update the files inside the submodules,
// but rather ensure that the hash is set to the latest after rebasing the submodule
function resetSubmodules(submodules) {
  if (!submodules || submodules.length === 0) {
    submodules = listSubmodules();
  }

  const rebasing = Git.rebasing();

  // Submodule can only be reseted from the root commit, therefore in case we're rebasing
  // we should check whether we're editing the root or not
  if (rebasing) {
    const commitHash = Git.recentCommit(['--format=%H']);
    const rootHash = Git.rootHash();

    if (commitHash !== rootHash) {
      throw TypeError('Can\'t remove submodules from the middle of the stack');
    }
  } else {
    Step.edit('root');
  }

  // After removing submodules they need to be re-added with the right url
  const submodulesUrls = listUrls(submodules);

  const submodleUrlPairs = submodules.reduce((pairs, submodule, index) => {
    const url = submodulesUrls[index];

    pairs.push(url, submodule);

    return pairs;
  }, []);

  // Actual reset
  removeSubmodules(submodules);
  addSubmodules(submodleUrlPairs);

  // If we're not in rebase mode, amend the changes
  if (!rebasing) {
    Git.print(['commit', '--amend'], {
      env: {
        GIT_EDITOR: true,
      },
    });
    Git.print(['rebase', '--continue']);
  }
}

function updateSubmodules(submodules) {
  if (!submodules || submodules.length === 0) {
    submodules = listSubmodules();
  }

  const rebasing = Git.rebasing();

  // Submodule can only be removed from the root commit, therefore in case we're rebasing
  // we should check whether we're editing the root or not
  if (rebasing) {
    const commitHash = Git.recentCommit(['--format=%H']);
    const rootHash = Git.rootHash();

    if (commitHash !== rootHash) {
      throw TypeError('Can\'t remove submodules from the middle of the stack');
    }
  } else {
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
      },
    });
    Git.print(['rebase', '--continue']);
  }
}

function listSubmodules() {
  const root = Git.root();

  if (!root) {
    return [];
  }

  let configData;
  try {
    configData = Git([
      'config', '--file', '.gitmodules', '--name-only', '--get-regexp', 'path',
    ]);
    // No submodules exit
  } catch (e) {
    return [];
  }

  return configData.split('\n').map((submodule) => {
    return submodule.split('.')[1];
  });
}

function listUrls(whiteList = []) {
  return Git([
    'config', '--file', '.gitmodules', '--get-regexp', 'url',
  ]).split('\n')
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^submodule\.([^\.]+)\.url\s(.+)$/);

      if (!match) {
        return;
      }

      const submodule = match[1];
      const url = match[2];

      if (!whiteList.length || whiteList.includes(submodule)) {
        return url;
      }
    })
    .filter(Boolean);
}

function isSubmodule() {
  const root = Git.root();

  if (!root) {
    return false;
  }

  // If the directory one level up the root is a git project then it means that
  // the current directory is a git project as well
  try {
    // This command should only work if we're in a git project
    return !!Git(['rev-parse', '--show-toplevel'], {
      cwd: Path.resolve(root, '..'),
    });
  } catch (e) {
    return false;
  }
}

// Ensures that all submodules are set to the current hash based on the checkouts file
// and the provided step index
function ensureSubmodules(step, rebasing?) {
  if (step === 'root') {
    step = 0;
  }

  // Ensure submodules are set to the right branches when picking the new super step
  const checkouts = getSubmoduleCheckouts();

  Object.keys(checkouts).forEach((submodule) => {
    const hash = checkouts[submodule].hashes[step];

    Git(['checkout', hash], {
      cwd: `${Utils.cwd()}/${submodule}`,
    });

    Git(['add', submodule]);
  });

  // If not rebasing to begin with, amend the changes
  if (!rebasing) {
    Git(['commit', '--amend', '--allow-empty'], {
      env: {
        TORTILLA_CHILD_PROCESS: true,
        GIT_EDITOR: true,
      },
    });
  }
}

function getSubmoduleCheckouts(whiteList?) {
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

      if (coSuperIndex === 'root') {
        coSuperHash = Git(['rev-list', '--max-parents=0', 'HEAD'], { cwd });
      } else {
        coSuperHash = Git([
          'log', head, `--grep=^Step ${coSuperIndex}:`, '--format=%H',
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

function getRemoteSubmoduleName(remote) {
  return remote
    .split('/')
    .pop()
    .split('.')
    .shift();
}

function getLocalSubmoduleName(givenPath) {
  if (!givenPath) {
    return '';
  }

  const givenPackPath = Paths.resolveProject(givenPath).npm.package;
  const givenPackName = JSON.parse(Fs.readFileSync(givenPackPath).toString()).name;

  const submoduleName = listSubmodules().find((name) => {
    const submodulePath = `${Utils.cwd()}/${name}`;
    const submodulePackPath = Paths.resolveProject(submodulePath).npm.package;
    const submodulePackName = JSON.parse(Fs.readFileSync(submodulePackPath).toString()).name;

    return submodulePackName === givenPackName;
  });

  return submoduleName || '';
}

// Will get the path of the development sub-repo
function getSubmoduleCwd(name) {
  const configLine = Git([
    'config', '--file', '.gitmodules', '--get-regexp', `submodule.${name}.url`,
  ]);

  if (!configLine) {
    return;
  }

  const relativePath = configLine.split(' ')[1];

  return Path.resolve(Utils.cwd(), relativePath);
}

export const Submodule = {
  add: addSubmodules,
  remove: removeSubmodules,
  update: updateSubmodules,
  reset: resetSubmodules,
  list: listSubmodules,
  urls: listUrls,
  isOne: isSubmodule,
  ensure: ensureSubmodules,
  getRemoteName: getRemoteSubmoduleName,
  getLocalName: getLocalSubmoduleName,
  getCwd: getSubmoduleCwd,
};
