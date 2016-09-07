var ChildProcess = require('child_process');


function calcIsOrigHead() {
  try {
    var head = git(['rev-parse', 'HEAD']);
    var origHead = git(['rev-parse', 'ORIG_HEAD']);
    return head == origHead;
  }
  catch (err) {
    return false;
  }
}

function getRecentCommit(args) {
  var args = ['log', '--max-count=1'].concat(args);
  return git(args);
}

function git(args, env) {
  return exec('git', args, env);
}

function exec(file, args, env) {
  if (!(args instanceof Array)) {
    env = args;
    args = [];
  }

  return ChildProcess.execFileSync(file, args, { env: env }).toString();
}


module.exports = {
  isOrigHead: calcIsOrigHead,
  recentCommit: getRecentCommit,
  git: git,
  exec: exec
};