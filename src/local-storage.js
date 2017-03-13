var LocalStorage = require('node-localstorage').LocalStorage;
var Minimist = require('minimist');
var LocalCache = require('./local-cache');
var Paths = require('./paths');
var Utils = require('./utils');

/**
  A local storage whose storage dir is located under '.git/.tortilla'.
  Mostly comes in handy when we want to share data between processes.
  If no '.git' dir was found, an in memory storage will be used instead.

  Used storage variables are listed below:

  - INIT - A flag used to determine whether Tortilla is initialized or not.
  - USE_STRICT - Tortilla's strict mode flag. If set, Tortilla will run certain
    validations before committing changes or rebasing them.
  - REBASE_HOOKS_DISABLED - This flag used to determine whether a step is currently
    being rebased or not, so Tortilla will know if it should overlook certain
    git hooks.
  - REBASE_OLD_STEP - Used by the editor to set the old step before rebasing.
  - REBASE_NEW_STEP - Will be set any time we run a step operation and is used by the
    editor so it can rebase our changes correctly.
  - REBASE_BRANCH - Set before rebasing step so the editor will know branch of ORIG_HEAD.
  - HOOK_STEP - Forcibly set the step number which should be used by Tortilla's
    git hooks.
  - POTENTIAL_RELEASE - Used by the renderer so it will be aware of the release
    which have just been bumed.
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