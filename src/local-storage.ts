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
  - TABLE_OF_CONTENTS - Store git log information transformed into useful TOC data
    to be used between processes.
 */

const cache = {};
export const localStorage: any = {
  create: createLocalStorage,
  native: LocalStorage,
  assertTortilla,
};

// Creates a new instance of local-storage
function createLocalStorage(cwd) {
  // LocalStorage instance creating involves FS operations which is a quiet heavy task.
  // With the cache, we can save ourselves the extra work which will result in a visible
  // performance boost
  if (!process.env.TORTILLA_CACHE_DISABLED && cache[cwd]) {
    return cache[cwd];
  }

  const paths = cwd.resolve ? cwd : Paths.resolveProject(cwd);

  let l;
  // If git dir exists use it as a local-storage dir
  if (Utils.exists(paths.git.resolve(), 'dir')) {
    // If initialized a second time after the dir has been removed, LocalStorage would
    // assume the dir exists based on cache, which is not necessarily true in some cases
    Fs.ensureDirSync(paths.storage);
    l = new LocalStorage(paths.storage);
  } else {
    l = new LocalCache();
  }

  return cache[cwd] = l;
}

// Creates a new instance of local storage, and delegates all its method calls through the exported
// object
function delegateLocalStorage(cwd) {
  const l = createLocalStorage(cwd);
  const descriptors = Object.getOwnPropertyDescriptors(l.__proto__);

  Object.entries(descriptors).forEach(([key, descriptor]) => {
    const delegator: PropertyDescriptor = {};

    if ('configurable' in descriptor) { delegator.configurable = descriptor.configurable; }
    if ('enumerable' in descriptor) { delegator.enumerable = descriptor.configurable; }
    if ('writable' in descriptor) { delegator.writable = descriptor.configurable; }

    if (descriptor.get) {
      delegator.get = (...args) => {
        return descriptor.get.apply(l, args);
      };
    }
    if (descriptor.set) {
      delegator.set = (...args) => {
        return descriptor.set.apply(l, args);
      };
    }
    if (typeof descriptor.value === 'function') {
      delegator.value = (...args) => {
        return descriptor.value.apply(l, args);
      };
    }

    Object.defineProperty(localStorage, key, delegator);
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

delegateLocalStorage(Paths.resolve());
// The same instance of the exported LocalStorage module should reference a difference storage
Utils.on('cwdChange', delegateLocalStorage);

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
