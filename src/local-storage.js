var LocalStorage = require('node-localstorage').LocalStorage;
var LocalCache = require('./local-cache');
var Paths = require('./paths');
var Utils = require('./utils');

/*
  A local-storage whos storage dir is git's internals dir. Comes in handy when we want
  to share data between processes like git-hooks.
 */

// Creates a new instance of local-storage
function createLocalStorage(cwd) {
  var paths = cwd.resolve ? cwd : Paths.resolve(cwd);

  // If git dir exists use it as a local-storage dir
  if (Utils.exists(paths.git._))
    localStorage = new LocalStorage(paths.storage);
  // Else, create local cache
  else
    localStorage = new LocalCache();

  return Utils.extend(localStorage, {
    create: createLocalStorage,
    assertGit: assertGit,
    assertTortilla: assertTortilla
  });
}

function assertGit(exists) {
  var isGit = !(this instanceof LocalCache);

  if (exists && !isGit) throw Error([
    'Project is not initialized by git!',
    'Please run `$ git init` or `$ tortilla create` before proceeding.'
  ].join('\n'));

  if (!exists && isGit) throw Error([
    'Git is already initialized on this project!'
  ])
}

 // Asserts if tortilla is initialized or not
function assertTortilla(exists) {
  var isInit = this.getItem('INIT');

  if (exists && !isInit) throw Error([
    'Tortilla essentials must be initialized!',
    'Please run `$ tortilla init` before proceeding.'
  ].join('\n'));

  if (!exists && isInit) throw Error([
    'Tortilla essentials are already initialized!'
  ].join('\n'));
}


module.exports = createLocalStorage(Paths._);