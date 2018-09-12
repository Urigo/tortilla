import * as Fs from 'fs-extra';
import * as Minimist from 'minimist';
import { LocalStorage } from 'node-localstorage';
import { LocalCache } from './local-cache';
import { Paths } from './paths';
import { Utils } from './utils';

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
  - HOOK_STEP - Forcibly set the step number which should be used by Tortilla's
    git hooks.
  - POTENTIAL_RELEASE - Used by the renderer so it will be aware of the release
    which have just been bumped.
  - STEP_MAP - A map of old steps and their new indexes which is being built during the
    step editing process in order to be able to update the diffStep template helpers in
    the manuals being rebased later on.
  - STEP_MAP_PENDING - Indicates that this stored step map will be used in another
    tortilla repo and not in the current repo where the process started running at.
 */

export let localStorage: any;

// Creates a new instance of local-storage
function createLocalStorage(cwd) {
  const paths = cwd.resolve ? cwd : Paths.resolveProject(cwd);

  // If git dir exists use it as a local-storage dir
  if (Utils.exists(paths.git.resolve(), 'dir')) {
    // If initialized a second time after the dir has been removed, LocalStorage would
    // assume the dir exists based on cache, which is not necessarily true in some cases
    Fs.ensureDirSync(paths.storage);
    localStorage = new LocalStorage(paths.storage);
  } else {
    localStorage = new LocalCache();
  }

  return Utils.extend(localStorage, {
    create: createLocalStorage,
    assertTortilla,
  });
}

// Asserts if tortilla is initialized or not
function assertTortilla(exists) {
  const isInit = this.getItem('INIT');

  if (exists && !isInit) {
    throw Error([
      'Tortilla essentials must be initialized!',
      'Please run `$ tortilla init` before proceeding.',
    ].join('\n'));
  }

  if (!exists && isInit) {
    throw Error([
      'Tortilla essentials are already initialized!',
    ].join('\n'));
  }
}

localStorage = createLocalStorage(Paths.resolve());

(() => {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_'],
  });

  const method = argv._[0];
  const args = argv._.slice(1);

  switch (method) {
    case 'set':
      for (let i = 0; i < args.length; i += 2) {
        localStorage.setItem(args[i], args[i + 1]);
      }
      break;
    case 'remove':
      for (let i = 0; i < args.length; i++) {
        localStorage.removeItem(args[i]);
      }
      break;
    default:
      break;
  }
})();
