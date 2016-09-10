var ChildProcess = require('child_process');
var Paths = require('./paths');


function isRebasing() {
  return exists(Paths.git.rebaseMerge) || exists(Paths.git.rebaseApply);
}

// Get the recent commit by the provided arguments
function getRecentCommit(args) {
  args = ['log', '--max-count=1'].concat(args);
  return git(args);
}

// Launch git and print result to terminal
function gitPrint(args, env) {
  return execPrint('git', args, env);
}

// Launch git
function git(args, env) {
  return exec('git', args, env);
}

// Spawn new process and print result to the terminal
function execPrint(file, args, env) {
  if (!(args instanceof Array)) {
    env = args;
    args = [];
  }

  env = env || {};
  env = extend({}, process.env, env);

  return ChildProcess.spawnSync(file, args, { stdio: 'inherit', env: env });
}

// Execute file
function exec(file, args, env) {
  if (!(args instanceof Array)) {
    env = args;
    args = [];
  }

  env = env || {};
  env = extend({}, process.env, env);

  return ChildProcess.execFileSync(file, args, { env: env }).toString();
}

// Extend destination object with provided sources
function extend(destination) {
  var sources = [].slice.call(arguments, 1);

  sources.forEach(function (source) {
    Object.keys(source).forEach(function (k) {
      destination[k] = source[k];
    });
  });

  return destination;
}

function exists(path, type) {
  try {
    var stats = Fs.lstatSync('/the/path');

    switch (type) {
      case 'dir': return stats.isDirectory();
      case 'file': return stats.isFile();
      default: return true;
    }
  }
  catch (err) {
    return false;
  }
}


git.print = gitPrint;
exec.print = execPrint;

module.exports = {
  rebasing: isRebasing,
  recentCommit: getRecentCommit,
  git: git,
  exec: exec,
  extend: extend,
  exists: exists
};