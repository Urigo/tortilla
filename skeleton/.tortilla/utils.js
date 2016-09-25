var ChildProcess = require('child_process');
var Fs = require('fs');
var Path = require('path');
var Paths = require('./paths');

/*
  Contains general utilities.
 */

var git = exec.bind(null, 'git');
var gitPrint = execPrint.bind(null, 'git');
var node = exec.bind(null, 'node');
var nodePrint = execPrint.bind(null, 'node');
var npm = exec.bind(null, 'npm');
var npmPrint = execPrint.bind(null, 'npm');

node.print = nodePrint;
npm.print = npmPrint;
git.print = gitPrint;
exec.print = execPrint;


// Tells if rebasing or not
function isRebasing() {
  return exists(Paths.git.rebaseMerge) || exists(Paths.git.rebaseApply);
}

// Tells if cherry-picking or not
function isCherryPicking() {
  return exists(Paths.git.heads.cherryPick) || exists(Paths.git.heads.revert);
}

// Tells if a tag exists or not
function tagExists(tag) {
  return exists(Path.resolve(Paths.git.refs.tags, tag));
}

// Get the recent commit by the provided arguments. An offset can be specified which
// means that the recent commit from several times back can be fetched as well
function getRecentCommit(offset, args) {
  if (offset instanceof Array) {
    args = offset;
    offset = 0;
  }
  else {
    args = args || [];
    offset = offset || 0;
  }

  var hash = typeof offset == 'string' ? offset : ('HEAD~' + offset);

  args = ['log', hash, '-1'].concat(args);
  return git(args);
}

// Spawn new process and print result to the terminal
function execPrint(file, args, env, input) {
  if (!(args instanceof Array)) {
    input = env;
    env = args;
    args = [];
  }

  if (!(env instanceof Object)) {
    input = env;
    env = {};
  }

  env = extend({}, process.env, env);

  return ChildProcess.spawnSync(file, args, {
    cwd: Paths._,
    env: env,
    input: input,
    stdio: 'inherit'
  });
}

// Execute file
function exec(file, args, env, input) {
  if (!(args instanceof Array)) {
    input = env;
    env = args;
    args = [];
  }

  if (!(env instanceof Object)) {
    input = env;
    env = {};
  }

  env = extend({}, process.env, env);

  return ChildProcess.execFileSync(file, args, {
    cwd: Paths._,
    env: env,
    input: input
  }).toString()
    .trim();
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

// Tells if entity exists or not by an optional document type
function exists(path, type) {
  try {
    var stats = Fs.lstatSync(path);

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


module.exports = {
  rebasing: isRebasing,
  cherryPicking: isCherryPicking,
  tagExists: tagExists,
  recentCommit: getRecentCommit,
  npm: npm,
  node: node,
  git: git,
  exec: exec,
  extend: extend,
  exists: exists
};