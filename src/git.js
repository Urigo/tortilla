const Path = require('path');
const LocalStorage = require('./local-storage');
const Paths = require('./paths');
const Utils = require('./utils');

/**
  Contains general git utilities.
 */

const git = Utils.git;


// Tells if rebasing or not
function isRebasing() {
  return Utils.exists(Paths.git.rebaseMerge) || Utils.exists(Paths.git.rebaseApply);
}

// Tells if cherry-picking or not
function isCherryPicking() {
  return Utils.exists(Paths.git.heads.cherryPick) || Utils.exists(Paths.git.heads.revert);
}

// Tells if going to amend or not
function gonnaAmend() {
  return Utils.childProcessOf('git', ['commit', '--amend']);
}

// Tells if a tag exists or not
function tagExists(tag) {
  try {
    git(['rev-parse', tag]);
    return true;
  } catch (err) {
    return false;
  }
}

// Get the recent commit by the provided arguments. An offset can be specified which
// means that the recent commit from several times back can be fetched as well
function getRecentCommit(offset, argv, options) {
  if (offset instanceof Array) {
    options = argv;
    argv = offset;
    offset = 0;
  } else {
    argv = argv || [];
    offset = offset || 0;
  }

  const hash = typeof offset === 'string' ? offset : (`HEAD~${offset}`);

  argv = ['log', hash, '-1'].concat(argv);
  return git(argv, options);
}

// Gets a list of the modified files reported by git matching the provided pattern.
// This includes untracked files, changed files and deleted files
function getStagedFiles(pattern) {
  const stagedFiles = git(['diff', '--name-only', '--cached'])
    .split('\n')
    .filter(Boolean);

  return Utils.filterMatches(stagedFiles, pattern);
}

// Gets active branch name
function getActiveBranchName() {
  // If rebasing, return stored branch name
  if (isRebasing()) {
    return LocalStorage.getItem('REBASE_BRANCH');
  }

  return git(['rev-parse', '--abbrev-ref', 'HEAD']);
}

// Gets the root hash of HEAD
function getRootHash() {
  return git(['rev-list', '--max-parents=0', 'HEAD']);
}

// Returns a list of all Tortilla submodules
function listSubmodules() {
  const root = getRoot();

  if (!root) return [];

  // List all submodules
  return git([
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
  const root = getRoot();

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

function getRoot() {
  try {
    return git(['rev-parse', '--show-toplevel']);
  // Not a git project
  } catch (e) {
    return '';
  }
}


module.exports = Utils.extend(git.bind(null), git, {
  rebasing: isRebasing,
  cherryPicking: isCherryPicking,
  gonnaAmend,
  tagExists,
  recentCommit: getRecentCommit,
  stagedFiles: getStagedFiles,
  activeBranchName: getActiveBranchName,
  rootHash: getRootHash,
  submodules: listSubmodules,
  isSubmodule,
  root: getRoot,
});
