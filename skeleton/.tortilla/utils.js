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

commit.print = commitPrint;
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

// Tells if amending or not
function isAmending() {
  return isRunBy('git', ['--amend']);
}

// Tells if a tag exists or not
function tagExists(tag) {
  return exists(Path.resolve(Paths.git.refs.tags, tag));
}

// Get the recent commit by the provided arguments. An offset can be specified which
// means that the recent commit from several times back can be fetched as well
function getRecentCommit(offset, argv) {
  if (offset instanceof Array) {
    argv = offset;
    offset = 0;
  }
  else {
    argv = argv || [];
    offset = offset || 0;
  }

  var hash = typeof offset == 'string' ? offset : ('HEAD~' + offset);

  argv = ['log', hash, '-1'].concat(argv);
  return git(argv);
}

// Gets a list of the modified files reported by git matching the provided pattern.
// This includes untracked files, changed files and deleted files
function getStagedFiles(pattern) {
  var stagedFiles = git(['diff', '--name-only', '--cached'])
    .split('\n')
    .filter(Boolean);

  return filterMatches(stagedFiles, pattern);
}

// Checks if one of the parent processes launched by the provided file and has
// the provided arguments
function isRunBy(file, argv) {
  var processFormat = '{ "ppid": "%P", "file": "%c", "argv": "%a" }';
  var processJson = { ppid: Number(process.pid) };
  var processString;
  var pid;

  do {
    pid = processJson.ppid;
    if (!pid) return false;

    processString = exec('ps', ['--no-headers', '-o', processFormat, '-p', pid]);

    processJson = JSON.parse(processString, function (k, v) {
      switch (k) {
        case 'ppid': return Number(v);
        case 'file': return v.trim();
        case 'argv': return v.trim().split(' ').slice(1);
        default: return v;
      }
    });

  } while (processJson.file != file);

  return argv.every(function (arg) {
    return processJson.argv.indexOf(arg) != -1;
  });
}

// Commit changes and print to the terminal
function commitPrint(argv) {
  argv = argv || [];
  return git.print(['commit'].concat(argv).concat(['--allow-empty', '--no-verify']));
}

// Commit changes
function commit(argv) {
  argv = argv || [];
  return git(['commit'].concat(argv).concat(['--allow-empty', '--no-verify']));
}

// Spawn new process and print result to the terminal
function execPrint(file, argv, env, input) {
  if (!(argv instanceof Array)) {
    input = env;
    env = argv;
    argv = [];
  }

  if (!(env instanceof Object)) {
    input = env;
    env = {};
  }

  env = extend({}, process.env, env);

  return ChildProcess.spawnSync(file, argv, {
    cwd: Paths._,
    env: env,
    input: input,
    stdio: env.TORTILLA_STDIO || 'inherit'
  });
}

// Execute file
function exec(file, argv, env, input) {
  if (!(argv instanceof Array)) {
    input = env;
    env = argv;
    argv = [];
  }

  if (!(env instanceof Object)) {
    input = env;
    env = {};
  }

  env = extend({}, process.env, env);

  return ChildProcess.execFileSync(file, argv, {
    cwd: Paths._,
    env: env,
    input: input,
    stdio: 'pipe'
  }).toString()
    .trim();
}

// Filter all strings matching the provided pattern in an array
function filterMatches(arr, pattern) {
  pattern = pattern || '';

  return arr.filter(function (str) {
    return str.match(pattern);
  });
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
  amending: isAmending,
  recentCommit: getRecentCommit,
  stagedFiles: getStagedFiles,
  runBy: isRunBy,
  commit: commit,
  npm: npm,
  node: node,
  git: git,
  exec: exec,
  filterMatches: filterMatches,
  extend: extend,
  exists: exists
};