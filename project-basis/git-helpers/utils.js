var ChildProcess = require('child_process');


function calcIsOrigHead() {
  try {
    var head = git('rev-parse HEAD');
    var origHead = git('rev-parse ORIG_HEAD');
    return head == origHead;
  }
  catch (err) {
    return false;
  }
}

function getRecentCommit(options) {
  var cmd = git('log --max-count=1');
  if (options.grep) cmd += ' --grep=' + options.grep;
  if (options.format) cmd += ' --format=' + options.format;

  return git(cmd);
}

function git(args, env) {
  var cmd = 'git ' + args;
  return exec(cmd, env);
}

function exec(cmd, env) {
  return ChildProcess.execSync(cmd, { env: env }).toString();
}


module.exports = {
  isOrigHead: calcIsOrigHead,
  recentCommit: getRecentCommit,
  git: git,
  exec: exec
};