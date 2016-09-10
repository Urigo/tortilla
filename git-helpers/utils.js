var ChildProcess = require('child_process');


// Calculate if in the middle of rebase or not
function calcIsOrigHead() {
  try {
    // Get HEAD hash
    var head = git(['rev-parse', 'HEAD']);
    // Get ORIG_HEAD hash
    // Note that ORIG_HEAD may not exist and an error might be thrown
    var origHead = git(['rev-parse', 'ORIG_HEAD']);
    return head == origHead;
  }
  catch (err) {
    return false;
  }
}

// Get the recent commit by the provided arguments
function getRecentCommit(args) {
  args = ['log', '--max-count=1'].concat(args);
  return git(args);
}

// Launch git
function git(args, env) {
  return exec('git', args, env);
}

function gitPrint(args, env) {
  return spawn('git', args, env);
}

// Execute file
function exec(file, args, env) {
  if (!(args instanceof Array)) {
    env = args;
    args = [];
  }

  return ChildProcess.execFileSync(file, args, { env: env }).toString();
}

// Spawn new process
function spawn(file, args, env) {
  if (!(args instanceof Array)) {
    env = args;
    args = [];
  }

  return ChildProcess.spawnSync(file, args, { stdio: 'inherit', env: env });
}


git.print = gitPrint;

module.exports = {
  isOrigHead: calcIsOrigHead,
  recentCommit: getRecentCommit,
  git: git,
  exec: exec,
  spawn: spawn
};