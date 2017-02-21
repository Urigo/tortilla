var LocalStorage = require('node-localstorage').LocalStorage;
var Minimist = require('minimist');
var LocalCache = require('./local-cache');
var Paths = require('./paths');
var Utils = require('./utils');

/*
  A local-storage whose storage dir is git's internals dir. Comes in handy when we want
  to share data between processes like git-hooks.
 */

var localStorage = createLocalStorage(Paths._);


(function () {
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_']
  });

  var method = argv._[0];
  var key = argv._[1];
  var value = argv._[2];

  switch (method) {
    case 'set': return localStorage.setItem(key, value);
    case 'remove': return localStorage.removeItem(key);
  }
})();

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
    assertTortilla: assertTortilla
  });
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


module.exports = localStorage;