import * as Fs from 'fs-extra';
import * as Tmp from 'tmp';
import { Paths, resolveProject } from './paths';
import { Utils } from './utils';

/**
 Contains general git utilities.
 */

const exec = Utils.exec;
// This RegExp will help us pluck the versions in a conflict and solve it
const conflict = /\n\s*<<<<<<< [^\n]+(\n(?:.|\n)+?)\n\s*=======(\n(?:.|\n)+?)\n\s*>>>>>>> [^\n]+/;

function git(argv, options?) {
  return gitBody(Utils.git, argv, options);
}

const gitPrint = (git as any).print = (argv, options = {}) => {
  return gitBody(Utils.git.print, argv, options);
};

// Push a tutorial based on the provided branch.
// e.g. given 'master' then 'master-history', 'master-root', 'master@0.1.0', etc, will be pushed.
// Note that everything will be pushed by FORCE and will override existing refs within the remote
function pushTutorial(remote: string, baseBranch: string) {
  const relatedBranches = git(['branch', '-l']).split('\n').map(branch => {
    if (!branch) { return null; }

    branch = branch.split(/\*?\s+/)[1];

    if (branch === baseBranch) { return branch; }
    if (branch === `${baseBranch}-history`) { return branch; }
    if (branch === `${baseBranch}-root`) { return branch; }
    if (new RegExp(`^${baseBranch}-step\\d+$`).test(branch)) { return branch; }
  }).filter(Boolean);

  const relatedTags = git(['tag', '-l']).split('\n').map(tag => {
    if (!tag) { return null; }
    if (new RegExp(`^${baseBranch}@(\\d+\\.\\d+\\.\\d+|next)$`).test(tag)) { return tag; }
    if (new RegExp(`^${baseBranch}@root@(\\d+\\.\\d+\\.\\d+|next)$`).test(tag)) { return tag; }
    if (new RegExp(`^${baseBranch}@step\\d+@(\\d+\\.\\d+\\.\\d+|next)$`).test(tag)) { return tag; }
  }).filter(Boolean);

  const refs = [...relatedBranches, ...relatedTags];

  return gitPrint(['push','-f', remote, ...refs]);
}

// The body of the git execution function, useful since we use the same logic both for
// exec and spawn
function gitBody(handler, argv, options) {
  options = {
    env: {}, ...options
  };

  // Zeroing environment vars which might affect other executions
  options.env = {
    GIT_DIR: null,
    GIT_WORK_TREE: null, ...options.env
  };

  return handler(argv, options);
}

// Tells if rebasing or not
function isRebasing(path = null) {
  const paths = path ? resolveProject(path).git : Paths.git;

  return Utils.exists(paths.rebaseMerge) || Utils.exists(paths.rebaseApply);
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
function getRecentCommit(offset, argv, options, path = null) {
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

  return git(argv, path ? { ...options, cwd: path } : options);
}

// Gets a list of the modified files reported by git matching the provided pattern.
// This includes untracked files, changed files and deleted files
function getStagedFiles(pattern?) {
  const stagedFiles = git(['diff', '--name-only', '--cached'])
    .split('\n')
    .filter(Boolean);

  return Utils.filterMatches(stagedFiles, pattern);
}

// Gets active branch name
function getActiveBranchName(path = null) {
  if (!isRebasing(path)) {
    return git(['rev-parse', '--abbrev-ref', 'HEAD'], path ? { cwd: path } : null);
  }

  // Getting a reference for the hash of which the rebase have started
  const branchHash = git(['reflog', '--format=%gd %gs'], path ? { cwd: path } : null)
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split(' '))
    .map((split) => [split.shift(), split.join(' ')])
    .find(([ref, msg]) => msg.match(/^rebase -i \(start\)/))
    .shift()
    .match(/^HEAD@\{(\d+)\}$/)
    .slice(1)
    .map((i) => `HEAD@{${++i}}`)
    .map((ref) => git(['rev-parse', ref]))
    .pop();

  // Comparing the found hash to each of the branches' hashes
  return Fs.readdirSync(Paths.git.refs.heads).find((branchName) => {
    return git(['rev-parse', branchName], path ? { cwd: path } : null) === branchHash;
  });
}

// Gets the root hash of HEAD
function getRootHash(head = 'HEAD') {
  return git(['rev-list', '--max-parents=0', head]);
}

function getRoot() {
  try {
    return git(['rev-parse', '--show-toplevel']);
    // Not a git project
  } catch (e) {
    return '';
  }
}

function edit(initialContent) {
  const editor = getEditor();
  const file = Tmp.fileSync({ unsafeCleanup: true });

  Fs.writeFileSync(file.name, initialContent);
  (exec as any).print('sh', ['-c', `${editor} ${file.name}`]);

  const content = Fs.readFileSync(file.name).toString();
  file.removeCallback();

  return content;
}

// https://github.com/git/git/blob/master/git-rebase--interactive.sh#L257
function getEditor() {
  let editor = process.env.GIT_EDITOR;

  if (!editor) {
    try {
      editor = git(['config', 'core.editor']);
    } catch (e) {
      // Ignore
    }
  }

  if (!editor) {
    try {
      editor = git(['var', 'GIT_EDITOR']);
    } catch (e) {
      // Ignore
    }
  }

  if (!editor) {
    throw Error('Git editor could not be found');
  }

  return editor;
}

function getRevisionIdFromObject(object: string): string {
  return git(['rev-list', '-n', '1', object]);
}


export const Git = Utils.extend(git.bind(null), git, {
  pushTutorial,
  conflict,
  rebasing: isRebasing,
  cherryPicking: isCherryPicking,
  gonnaAmend,
  tagExists,
  recentCommit: getRecentCommit,
  stagedFiles: getStagedFiles,
  activeBranchName: getActiveBranchName,
  rootHash: getRootHash,
  root: getRoot,
  edit,
  editor: getEditor,
  getRevisionIdFromObject,
});
