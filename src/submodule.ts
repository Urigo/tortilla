import * as Fs from 'fs-extra'
import { resolve } from 'path'
import { Git } from './git'
import { Paths } from './paths'
import { Utils } from './utils'

// Like git-submodule-add, but will ensure that we're currently at root and will detach HEAD
function addSubmodule(name: string, url: string) {
  if (!name) {
    throw TypeError('Submodule name must be provided')
  }

  if (!url) {
    throw TypeError('Submodule URL must be provided')
  }

  {
    const isRoot = Git.rootHash() === Git(['rev-parse', 'HEAD'])

    if (!isRoot) {
      throw Error('Use `$ tortilla step edit --root` first')
    }
  }

  Git.print(['submodule', 'add', url, name])

  const cwd = resolveSubmodulePath(name)
  const sha1 = Git(['rev-parse', 'HEAD'], { cwd })

  Git.print(['checkout', sha1], { cwd })
  Git(['add', '.gitmodules', name])
}

// Will remove the submodule completely, even from the git-registry. This command doesn't
// exist on git and it can be very useful
function removeSubmodule(name: string) {
  if (!name) {
    throw TypeError('Submodule name must be provided')
  }

  {
    const isRoot = Git.rootHash() === Git(['rev-parse', 'HEAD'])

    if (!isRoot) {
      throw Error('Use `$ tortilla step edit --root` first')
    }
  }

  Git.print(['submodule', 'deinit', '-f', name])
  Fs.removeSync(resolveSubmodulePath(name))
  Fs.remove(resolve(Paths.git.modules, name))
  Git(['config', '--file=.gitmodules', '--remove-section', `submodule.${name}`])
  // Adding to stage is necessary before we can clean the cache
  Git(['add', '.gitmodules'])
  // This will also stage the submodule
  Git.print(['rm', '--cached', '-rf', name])
}

// Will run git-submodule-update --init, and it will remove deleted files from stage if
// pointed object doesn't exist in submodule's remote. This behavior is much more expected
// and less confusing rather than seeing that everything was deleted for an odd reason.
function updateSubmodule(name: string) {
  if (!name) {
    throw TypeError('Submodule name must be provided')
  }

  Git.print(['submodule', 'update', '--init', name])

  const cwd = resolveSubmodulePath(name)

  // Will be effective only if hash doesn't exist
  Git(['reset', '.'], { cwd })
  Git(['checkout', '.'], { cwd })
}

// In other words, this will 'unclone' the submodule, but will keep it initialized. This is
// reliable method to get away from messy situations with submodules, so whenever you don't know
// what to do, run this command.
function resetSubmodule(name: string) {
  if (!name) {
    throw TypeError('Submodule name must be provided')
  }

  const cwd = resolveSubmodulePath(name)

  Fs.removeSync(cwd)
  Git.print(['checkout', cwd])
}

function fetchSubmodule(name: string) {
  if (!name) {
    throw TypeError('Submodule name must be provided')
  }

  if (!isSubmoduleUpdated(name)) {
    throw Error(`Submodule is not updated! Run "$ tortilla submodule update ${name}"`)
  }

  const cwd = resolveSubmodulePath(name)

  Git.print(['fetch', 'origin', '--tags', '-f'], { cwd })
}

// This will check out the specified submodule to provided ref. It will also guide you through
// with some detailed instructions if you should do things beforehand, this can prevent a lot of
// potential issues and confusion.
function checkoutSubmodule(name: string, ref: string) {
  if (!name) {
    throw TypeError('Submodule name must be provided')
  }

  if (!ref) {
    throw TypeError('Submodule ref must be provided')
  }

  {
    const isRoot = Git.rootHash() === Git(['rev-parse', 'HEAD'])

    if (!isRoot) {
      throw Error('Command must run in root! Run "$ tortilla step edit --root"')
    }
  }

  if (!isSubmoduleUpdated(name)) {
    throw Error(`Submodule is not updated! Run "$ tortilla submodule update ${name}"`)
  }

  const cwd = resolveSubmodulePath(name)

  try {
    Git(['rev-parse', ref], { cwd })
  } catch (e) {
    throw Error(`git-ref ${ref} doesn't exist! Run "$ tortilla submodule fetch ${name}"`)
  }

  Git.print(['checkout', ref], { cwd })
  Git.print(['add', cwd])
}

function isSubmoduleUpdated(name: string) {
  if (!name) {
    throw TypeError('Submodule name must be provided')
  }

  // Fetch most recent changes if already initialized
  return (
    Fs.existsSync(resolve(Paths.git.modules, name)) &&
    Fs.existsSync(`${resolveSubmodulePath(name)}/.git`)
  )
}

function resolveSubmodulePath(name: string, relativePath = '') {
  const absolutePath = resolve(Utils.cwd(), name, relativePath)

  if (!Fs.existsSync(absolutePath)) {
    throw Error(`Submodule folder "${name}" doesn't exist`)
  }

  return absolutePath
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

function listSubmodulesUrls(whiteList = []) {
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
      cwd: resolve(root, '..'),
    });
  } catch (e) {
    return false;
  }
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

  return resolve(Utils.cwd(), relativePath);
}

// Gets data regards specified submodules from git's objects tree
function getSubmodulesFSNodes({ whitelist, blacklist, revision, cwd }: {
  whitelist?: string[],
  blacklist?: string[],
  revision?: string,
  cwd?: string,
} = {
  cwd: Utils.cwd(),
}) {
  if (typeof revision === 'undefined') {
    revision = Git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  }

  return Git(['ls-tree', revision], { cwd })
    // Each line represents a node
    .split('\n')
    // Map splits into informative jsons
    .map(line => {
      // Each split in the output represents different data
      const [mode, type, hash, file] = line.split(/\s+/);

      return { mode, type, hash, file };
    })
    // Filter submodules which are included in the list
    .filter(({ type, file }) =>
      type === 'commit' &&
      (!whitelist || whitelist.includes(file)) &&
      (!blacklist || !blacklist.includes(file))
    );
}

export const Submodule = {
  add: addSubmodule,
  remove: removeSubmodule,
  reset: resetSubmodule,
  fetch: fetchSubmodule,
  update: updateSubmodule,
  checkout: checkoutSubmodule,
  isUpdated: isSubmoduleUpdated,
  resolvePath: resolveSubmodulePath,
  list: listSubmodules,
  urls: listSubmodulesUrls,
  isOne: isSubmodule,
  getRemoteName: getRemoteSubmoduleName,
  getLocalName: getLocalSubmoduleName,
  getCwd: getSubmoduleCwd,
  getFSNodes: getSubmodulesFSNodes,
}
