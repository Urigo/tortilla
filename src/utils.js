var ChildProcess = require('child_process');
var Fs = require('fs-extra');

/**
  Contains general utilities.
 */

var cwd;
var git;
var npm;
var node;


(function () {
  // Defaults to process's current working dir
  cwd = process.cwd();

  try {
    cwd = ChildProcess.execFileSync('git', [
      'rev-parse', '--show-toplevel'
    ], {
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'ignore']
    }).toString()
      .trim();
  }
  catch (err) {
    // If no git-exists nor git-failed use default value instead
  }

  // Setting all relative utils
  exec.print = spawn;
  git = exec.bind(null, 'git');
  git.print = spawn.bind(null, 'git');
  npm = exec.bind(null, 'npm');
  npm.print = spawn.bind(null, 'npm');
  node = exec.bind(null, 'node');
  node.print = spawn.bind(null, 'node');
  // It's better to have a getter rather than an explicit value otherwise
  // it might be reset
  cwd = String.bind(null, cwd);
})();

// Checks if one of the parent processes launched by the provided file and has
// the provided arguments
function isChildProcessOf(file, argv, offset) {
  // There might be nested processes of the same file so we wanna go through all of them,
  // This variable represents how much skips will be done anytime the file is found.
  var trial = offset = offset || 0;

  // The current process would be the node's
  var currProcess = {
    file: process.title,
    pid: process.pid,
    argv: process.argv
  };

  // Will abort once the file is found and there are no more skips left to be done
  while (currProcess.file != file || trial--) {
    // Get the parent process id
    currProcess.pid = Number(getProcessData(currProcess.pid, 'ppid'));
    // The root process'es id is 0 which means we've reached the limit
    if (!currProcess.pid) return false;

    currProcess.argv = getProcessData(currProcess.pid, 'command')
      .split(' ')
      .filter(Boolean);

    // The first word in the command would be the file name
    currProcess.file = currProcess.argv[0];
    // The rest would be the arguments vector
    currProcess.argv = currProcess.argv.slice(1);
  }

  // Make sure it has the provided arguments
  var result = argv.every(function (arg) {
    return currProcess.argv.indexOf(arg) != -1;
  });

  // If this is not the file we're looking for keep going up in the processes tree
  return result || isChildProcessOf(file, argv, ++offset);
}

// Gets process data using 'ps' formatting
function getProcessData(pid, format) {
  if (arguments.length == 1) {
    format = pid;
    pid = process.pid;
  }

  var result = exec('ps', ['-p', pid, '-o', format]).split('\n');
  result.shift();

  return result.join('\n');
}

// Spawn new process and print result to the terminal
function spawn(file, argv, options) {
  argv = argv || [];

  options = extend({
    cwd: process.env.TORTILLA_CWD || cwd(),
    stdio: process.env.TORTILLA_STDIO || 'inherit'
  }, options);

  options.env = extend({
    TORTILLA_CHILD_PROCESS: true
  }, process.env, options.env);

  return ChildProcess.spawnSync(file, argv, options);
}

// Execute file
function exec(file, argv, options) {
  argv = argv || [];

  options = extend({
    cwd: process.env.TORTILLA_CWD || cwd(),
    stdio: 'pipe'
  }, options);

  options.env = extend({
    TORTILLA_CHILD_PROCESS: true
  }, process.env, options.env);

  return ChildProcess
    .execFileSync(file, argv, options)
    .toString()
    .trim();
}

// Tells if entity exists or not by an optional document type
function exists(path, type) {
  try {
    var stats = Fs.lstatSync(path);

    switch (type) {
      case 'dir': return stats.isDirectory();
      case 'file': return stats.isFile();
      case 'symlink': return stats.isSymbolicLink();
      default: return true;
    }
  }
  catch (err) {
    return false;
  }
}

// Create a temporary scope which will define provided variables on the environment
function scopeEnv(fn, env) {
  var keys = Object.keys(env);
  var originalEnv = pluck(process.env, keys);

  var nullKeys = keys.filter(function (key) {
    return process.env[key] == null;
  });

  extend(process.env, env);

  try {
    fn();
  }
  finally {
    extend(process.env, originalEnv);
    contract(process.env, nullKeys);
  }
}

// Filter all strings matching the provided pattern in an array
function filterMatches(arr, pattern) {
  pattern = pattern || '';

  return arr.filter(function (str) {
    return str.match(pattern);
  });
}

// Deeply merges destination object with source object
function merge(destination, source) {
  if (!(destination instanceof Object) ||
      !(source instanceof Object)) {
    return source;
  }

  Object.keys(source).forEach(function (k) {
    destination[k] = merge(destination[k], source[k]);
  });

  return destination;
}

// Extend destination object with provided sources
function extend(destination) {
  var sources = [].slice.call(arguments, 1);

  sources.forEach(function (source) {
    if (!(source instanceof Object)) return;

    Object.keys(source).forEach(function (k) {
      destination[k] = source[k];
    });
  });

  return destination;
}

// Deletes all keys in the provided object
function contract(destination, keys) {
  keys.forEach(function (key) {
    delete destination[key];
  });

  return destination;
}

// Plucks all keys from object
function pluck(obj, keys) {
  return keys.reduce(function (result, key) {
    result[key] = obj[key];
    return result;
  }, {});
}

// Pad the provided string with the provided pad params from the left
// '1' -> '00001'
function pad(str, length, char) {
  str = str.toString();
  char = char || ' ';
  var chars = Array(length + 1).join(char);

  return chars.substr(0, chars.length - str.length) + str;
}

// foo_barBaz -> foo-bar-baz
function toKebabCase(str) {
  return splitWords(str)
    .map(lowerFirst)
    .join('-');
}

// foo_barBaz -> Foo Bar Baz
function toStartCase(str) {
  return splitWords(str)
    .map(upperFirst)
    .join(' ');
}

// Lower -> lower
function lowerFirst(str) {
  return str.substr(0, 1).toLowerCase() + str.substr(1);
}

// upper -> Upper
function upperFirst(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1);
}

// foo_barBaz -> ['foo', 'bar', 'Baz']
function splitWords(str) {
  return str
    .replace(/[A-Z]/, ' $&')
    .split(/[^a-zA-Z0-9]+/);
}

// Wraps source descriptors and defines them on destination. The modifiers object
// contains the wrappers for the new descriptors, and has 3 properties:
// - value - A value wrapper, if function
// - get - A getter wrapper
// - set - A setter wrapper
// All 3 wrappers are called with 3 arguments: handler, propertyName, args
function delegateProperties(destination, source, modifiers) {
  Object.getOwnPropertyNames(source).forEach(function (propertyName) {
    var propertyDescriptor = Object.getOwnPropertyDescriptor(source, propertyName);

    if (typeof propertyDescriptor.value == 'function' && modifiers.value) {
      var superValue = propertyDescriptor.value;

      propertyDescriptor.value = function () {
        var args = [].slice.call(arguments);

        return modifiers.value.call(this, superValue, propertyName, args);
      };
    }
    else {
      if (propertyDescriptor.get && modifiers.get) {
        var superGetter = propertyDescriptor.get;

        propertyDescriptor.get = function () {
          return modifiers.get.call(this, superGetter, propertyName);
        };
      }

      if (propertyDescriptor.set && modifiers.set) {
        var superGetter = propertyDescriptor.set;

        propertyDescriptor.set = function (value) {
          return modifiers.value.call(this, superGetter, propertyName, value);
        };
      }
    }

    Object.defineProperty(destination, propertyName, propertyDescriptor);
  });

  return destination;
}


module.exports = {
  cwd: cwd,
  exec: exec,
  git: git,
  npm: npm,
  childProcessOf: isChildProcessOf,
  exists: exists,
  scopeEnv: scopeEnv,
  filterMatches: filterMatches,
  merge: merge,
  extend: extend,
  contract: contract,
  pluck: pluck,
  pad: pad,
  kebabCase: toKebabCase,
  startCase: toStartCase,
  lowerFirst: lowerFirst,
  upperFirst: upperFirst,
  words: splitWords,
  delegateProperties: delegateProperties
};