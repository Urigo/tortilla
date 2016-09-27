var ChildProcess = require('child_process');
var Fs = require('fs');
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


module.exports = {
  runBy: isRunBy,
  npm: npm,
  node: node,
  git: git,
  exec: exec,
  exists: exists,
  filterMatches: filterMatches,
  extend: extend
};