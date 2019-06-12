import * as Fs from 'fs-extra';
import * as Tmp from 'tmp';
import { localStorage } from './local-storage';
import { Paths, resolveProject } from './paths';
import { freeText, pluckRemoteData, Utils } from './utils';

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

// Create a compare link e.g. https://github.com/Urigo/WhatsApp/compare/xxxxxxx..xxxxxxx
function reviewTutorial(remote: string, branch: string) {
  const remoteUrl = Git(['remote', 'get-url', remote])
  const remoteData = pluckRemoteData(remoteUrl)

  if (!remoteData) {
    throw Error('Provided remote is neither HTTP nor SSH')
  }

  const { host, owner, repo } = remoteData
  const checkoutDir = Tmp.dirSync({ unsafeCleanup: true })
  const compareDir = Tmp.dirSync({ unsafeCleanup: true })
  let compareUrl = `https://${host}/${owner}/${repo}`

  try {
    // This will contain a new branch with 2 commits:
    // The first commit represents the current branch and the second one represents the changed one
    Git(['init', compareDir.name])

    // Create the commit for the current branch
    Fs.copySync(`${Utils.cwd()}/.git`, `${checkoutDir.name}/.git`)
    Git(['stash'], { cwd: checkoutDir.name })
    Git(['fetch', remote], { cwd: checkoutDir.name })
    Git(['checkout', `${remote}/${branch}`], { cwd: checkoutDir.name })
    Fs.removeSync(`${checkoutDir.name}/.git`)

    Fs.moveSync(`${compareDir.name}/.git`, `${checkoutDir.name}/.git`)
    Git(['add', '.'], { cwd: checkoutDir.name })
    Git(['commit', '-m', `Current ${branch}`], { cwd: checkoutDir.name })
    Fs.moveSync(`${checkoutDir.name}/.git`, `${compareDir.name}/.git`)

    // Create the commit for the new branch
    Fs.copySync(`${Utils.cwd()}/.git`, `${checkoutDir.name}/.git`)
    Git(['stash'], { cwd: checkoutDir.name })
    Git(['checkout', `refs/heads/${branch}`], { cwd: checkoutDir.name })
    Fs.removeSync(`${checkoutDir.name}/.git`)

    Fs.moveSync(`${compareDir.name}/.git`, `${checkoutDir.name}/.git`)
    Git(['add', '.'], { cwd: checkoutDir.name })
    Git(['commit', '-m', `New ${branch}`], { cwd: checkoutDir.name })
    Fs.moveSync(`${checkoutDir.name}/.git`, `${compareDir.name}/.git`)

    // Prepare and push
    const currBranchHash = Git(['rev-list', '--max-parents=0', 'HEAD'], { cwd: compareDir.name })
    const newBranchHash = Git(['rev-parse', 'HEAD'], { cwd: compareDir.name })
    const compareBranch = `compare-${currBranchHash.slice(0, 7)}_${newBranchHash.slice(0, 7)}`
    Git(['checkout', '-b', compareBranch], { cwd: compareDir.name })
    Git.print(['push', remoteUrl, compareBranch], { cwd: compareDir.name })
    Git(['checkout', newBranchHash], { cwd: compareDir.name })
    Git(['branch', '-D', compareBranch], { cwd: compareDir.name })
    Git.print(['push', remoteUrl, `:refs/heads/${compareBranch}`], { cwd: compareDir.name })

    compareUrl += `/compare/${currBranchHash}..${newBranchHash}`
  } finally {
    checkoutDir.removeCallback()
    compareDir.removeCallback()
  }

  return compareUrl
}

// Push a tutorial based on the provided branch.
// e.g. given 'master' then 'master-history', 'master-root', 'master@0.1.0', etc, will be pushed.
// Note that everything will be pushed by FORCE and will override existing refs within the remote
function pushTutorial(remote: string, baseBranch: string) {
  const relatedBranches = git(['branch', '-l', '-a']).split('\n').map(branch => {
    if (!branch) { return null; }

    branch = branch.split(/\*?\s+/)[1];
    const pathNodes = branch.split('/')

    if (pathNodes[0] === 'remotes') {
      if (pathNodes[1] !== remote) { return; }
    }

    const branchName = pathNodes.pop();

    if (branchName === baseBranch) { return branch; }
    if (branchName === `${baseBranch}-history`) { return branch; }
    if (branchName === `${baseBranch}-root`) { return branch; }
    if (new RegExp(`^${baseBranch}-step\\d+$`).test(branchName)) { return branch; }
  }).filter(Boolean);

  const relatedTags = git(['tag', '-l']).split('\n').map(tag => {
    if (!tag) { return null; }
    if (new RegExp(`^${baseBranch}@(\\d+\\.\\d+\\.\\d+|next)$`).test(tag)) { return tag; }
    if (new RegExp(`^${baseBranch}@root@(\\d+\\.\\d+\\.\\d+|next)$`).test(tag)) { return tag; }
    if (new RegExp(`^${baseBranch}@step\\d+@(\\d+\\.\\d+\\.\\d+|next)$`).test(tag)) { return tag; }
  }).filter(Boolean);

  const relatedBranchesNames = relatedBranches.map(b => b.split('/').pop())

  const deletedBranches = git(['ls-remote', '--heads', remote])
    .split('\n')
    .filter(Boolean)
    .map(line => line.split(/\s+/).pop())
    .filter(ref => !relatedBranchesNames.includes(ref.split('/').pop()))
    .filter(ref => {
      const branch = ref.split('/').pop();

      return (
        branch === baseBranch ||
        branch === `${baseBranch}-history` ||
        branch === `${baseBranch}-root` ||
        new RegExp(`^${baseBranch}-step\\d+$`).test(branch)
      );
    })
    // https://stackoverflow.com/questions/5480258/how-to-delete-a-remote-tag
    .map(ref => `:${ref}`);

  const deletedTags = git(['ls-remote', '--tags', remote])
    .split('\n')
    .filter(Boolean)
    .map(line => line.split(/\s+/).pop())
    .filter(ref => !relatedTags.includes(ref.split('/').pop()))
    .filter(ref =>
      new RegExp(`^refs/tags/${baseBranch}@(\\d+\\.\\d+\\.\\d+|next)$`).test(ref) ||
      new RegExp(`^refs/tags/${baseBranch}@root@(\\d+\\.\\d+\\.\\d+|next)$`).test(ref) ||
      new RegExp(`^refs/tags/${baseBranch}@step\\d+@(\\d+\\.\\d+\\.\\d+|next)$`).test(ref)
    )
    // https://stackoverflow.com/questions/5480258/how-to-delete-a-remote-tag
    .map(ref => `:${ref}`)

  const refs = [...relatedBranches, ...relatedTags, ...deletedBranches, ...deletedTags];

  return gitPrint(['push','-f', remote, ...refs]);
}

// Pull a tutorial based on the provided branch. e.g. given 'master' then 'master-history',
// 'master-root', 'master@0.1.0', etc, will be pulled.
function pullTutorial(remote: string, baseBranch: string) {
  const relatedBranches = [];
  const relatedTags = [];

  git(['ls-remote', '--tags', '--heads', remote]).split('\n').forEach(line => {
    if (!line) { return; }

    const [, ref] = line.split(/\s+/);

    if (
      new RegExp(`^refs/tags/${baseBranch}@(root|step-\\d+@)?(\\d+\\.\\d+\\.\\d+|next)$`).test(ref)
    ) {
      relatedTags.push(ref.split('/').slice(2).join('/'));
    }

    if (
      new RegExp(`^refs/heads/${baseBranch}(-root|-history|-step\\d+)?$`).test(ref)
    ) {
      relatedBranches.push(ref.split('/').slice(2).join('/'));
    }
  });

  const refs = [...relatedBranches, ...relatedTags];
  const activeBranchName = Git.activeBranchName();

  try {
    const sha1 = Git(['rev-parse', activeBranchName]);

    // Detach HEAD so we can change the reference of the branch
    Git(['checkout', sha1]);
    // --tags flag will overwrite tags
    gitPrint(['fetch', '--tags', '-f', remote, ...refs]);

    // Make sure that all local branches track the right remote branches
    relatedBranches.forEach(branch => {
      try {
        Git(['branch', '-D', branch]);
      } catch (e) {
        // Branch doesn't exist
      }

      Git.print(['branch', '--track', branch, `remotes/${remote}/${branch}`]);
    });
  } finally {
    // Get back to where we were, regardless of the outcome
    Git(['checkout', activeBranchName]);
  }
}

// Used internally by tutorialStatus() to get the right step message
function getRefStep(ref = 'HEAD') {
  if (getRootHash() === Git(['rev-parse', ref])) {
    return 'root';
  }

  const match = Git(['log', ref, '-1', '--format=%s']).match(/^Step (\d+(?:\.\d+)?)/);

  if (match) {
    return match[1];
  }

  return Git(['rev-parse', '--short', ref]);
}

// Print edit status followed by git-status
function tutorialStatus(options: { instruct?: boolean } = {}) {
  Git.print(['status']);

  let instructions;
  position:
  if (isRebasing()) {
    const head = Git(['rev-parse', 'HEAD']);
    const rebaseHead = Git(['rev-parse', 'REBASE_HEAD']);
    const headStep = getRefStep('HEAD');

    if (head === rebaseHead) {
      console.log(`\nEditing ${headStep}`);
      instructions = 'edit';
      break position;
    }

    const rebaseHeadStep = getRefStep('REBASE_HEAD');
    const isConflict = localStorage.getItem('REBASE_NEW_STEP') !== headStep;

    if (isConflict) {
      console.log(`\nSolving conflict between ${headStep} and ${rebaseHeadStep}`);
      instructions = 'conflict';
      break position;
    }

    console.log(`\nBranched out from ${rebaseHeadStep} to ${headStep}`);
    instructions = 'edit';
  }

  switch (options.instruct && instructions) {
    case 'edit':
      console.log('\n' + freeText(`
        To edit the current step, stage your changes and amend them:

            $ git add xxx
            $ git commit --amend

        Feel free to push or pop steps:

            $ tortilla step push/pop

        Once you finish, continue the rebase and Tortilla will take care of the rest:

            $ git rebase --continue

        You can go back to re-edit previous steps at any point, but be noted that this will discard all your changes thus far:

            $ tortilla step back

        If for some reason, at any point you decide to quit, use the comand:

            $ git rebase --abort
      `))
    case 'conflict':
      console.log('\n' + freeText(`
        Once you solved the conflict, stage your changes and continue the rebase.
        DO NOT amend your changes, push or pop steps:

            $ git add xxx
            $ git rebase --continue

        You can go back to re-edit previous steps at any point, but be noted that this will discard all your changes thus far:

            $ tortilla step back

        If for some reason, at any point you decide to quit, use the comand:

            $ git rebase --abort
      `))
  }
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
function getRootHash(head = 'HEAD', options = {}) {
  return git(['rev-list', '--max-parents=0', head], options);
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
  const file = Tmp.fileSync();

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

// Commander will split equal signs e.g. `--format=%H` which is is not the desired
// behavior for git. This puts the everything back together when necessary
function normalizeArgv(argv: string[]): string[] {
  argv = [...argv]

  {
    const i = argv.indexOf('--format')

    if (i !== -1) {
      argv.splice(i, 2, `--format=${argv[i + 1]}`)
    }
  }

  return argv
}

function getRevisionIdFromObject(object: string): string {
  return git(['rev-list', '-n', '1', object]);
}


export const Git = Utils.extend(git.bind(null), git, {
  pushTutorial,
  pullTutorial,
  reviewTutorial,
  tutorialStatus,
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
  normalizeArgv,
  getRevisionIdFromObject,
});
