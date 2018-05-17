import * as Path from 'path';
import { Utils } from './utils';

export interface TortillaPaths {
  resolve: () => string;
  resolveTree: (path: string) => object;
  resolveProject: (path: string) => TortillaPaths;
  config: string;
  checkouts: string;
  locales: string;
  readme: string;
  renovate: string;
  storage: string;
  travis: string;
  manuals: {
    resolve: () => string;
    templates: string;
    views: string;
  };
  cli: {
    resolve: () => string;
    tortilla: string;
    tortillaManual: string;
    tortillaRelease: string;
    tortillaStep: string;
    tortillaStrict: string;
    tortillaSubmodule: string;
  };
  git: {
    resolve: () => string;
    ignore: string;
    hooks: string;
    rebaseApply: string;
    rebaseMerge: string;
    heads: {
      resolve: () => string;
      cherryPick: string;
      orig: string;
      revert: string;
    },
    messages: {
      resolve: () => string;
      commit: string;
      merge: string;
      squash: string;
    },
    refs: {
      resolve: () => string;
      heads: string;
      remotes: string;
      tags: string;
    },
  };
  tortillaDir: string;
  tortilla: {
    resolve: () => string;
    dump: string;
    editor: string;
    essentials: string;
    git: string;
    initializer: string;
    localCache: string;
    localStorage: string;
    manual: string;
    package: string;
    paths: string;
    rebase: string;
    release: string;
    step: string;
    submodule: string;
    utils: string;
    hooks: string;
    skeleton: string;
    ascii: {
      resolve: () => string;
      views: string;
    };
    renderer: {
      resolve: () => string;
      helpers: string;
      templates: string;
    };
    translator: {
      resolve: () => string;
      translation: string;
      locales: string;
    };
  };
  npm: {
    resolve: () => string;
    ignore: string;
    package: string;
    modules: string;
  };
}

/**
 It is important to use absolute paths and not relative paths since some helpers
 are distributed over several processes whose execution path is not always the same,
 therefore this module was created.
 */

const cache = {};
const resolve = Path.resolve.bind(Path);

const ascii = resolveTree(resolve(__dirname, 'ascii'), {
  views: resolve(__dirname, 'ascii/views'),
});

const renderer = resolveTree(resolve(__dirname, 'renderer'), {
  helpers: resolve(__dirname, 'renderer/helpers'),
  templates: resolve(__dirname, 'renderer/templates'),
});

const translator = resolveTree(resolve(__dirname, 'translator'), {
  translation: resolve(__dirname, 'translator/translation'),
  locales: resolve(__dirname, 'translator/locales'),
});

const tortilla = resolveTree(resolve(__dirname, '..'), {
  dump: resolve(__dirname, 'dump.js'),
  editor: resolve(__dirname, 'editor.js'),
  essentials: resolve(__dirname, 'essentials.js'),
  git: resolve(__dirname, 'git.js'),
  initializer: resolve(__dirname, 'initializer.js'),
  localCache: resolve(__dirname, 'local-cache.js'),
  localStorage: resolve(__dirname, 'local-storage.js'),
  manual: resolve(__dirname, 'manual.js'),
  package: resolve(__dirname, 'package.js'),
  paths: resolve(__dirname, 'paths.js'),
  rebase: resolve(__dirname, 'rebase.js'),
  release: resolve(__dirname, 'release.js'),
  step: resolve(__dirname, 'step.js'),
  submodule: resolve(__dirname, 'submodule.js'),
  utils: resolve(__dirname, 'utils.js'),
  hooks: resolve(__dirname, 'hooks'),
  skeleton: 'git@github.com:Urigo/tortilla-skeleton.git',
  ascii,
  renderer,
  translator,
});

const cli = resolveTree(resolve(__dirname, '../cli'), {
  tortilla: resolve(__dirname, '../dist/cli/tortilla.js'),
  tortillaManual: resolve(__dirname, '../dist/cli/tortilla-manual.js'),
  tortillaRelease: resolve(__dirname, '../dist/cli/tortilla-release.js'),
  tortillaStep: resolve(__dirname, '../dist/cli/tortilla-step.js'),
  tortillaStrict: resolve(__dirname, '../dist/cli/tortilla-strict.js'),
  tortillaSubmodule: resolve(__dirname, '../dist/cli/tortilla-submodule.js'),
});

// Makes the root path available in the branches object using a 'resolve()' method
// e.g. ('foo', { bar: 'bar' }) -> { resolve() -> 'foo', bar: 'bar' }
function resolveTree(root, branches): any {
  branches = branches || {};

  return Object.keys(branches).reduce((tree, name) => {
    tree[name] = branches[name];

    return tree;
  }, {
    resolve: Path.resolve.bind(Path, root),
  });
}

// Resolves a bunch of paths to a given tortilla project path
export function resolveProject(cwd: string): TortillaPaths {
  if (!cwd) { throw TypeError('A project path must be provided'); }

  if (!process.env.TORTILLA_CACHE_DISABLED && cache[cwd]) {
    return cache[cwd];
  }

  const gitHeads = resolveTree(resolve(cwd, '.git/HEAD'), {
    cherryPick: resolve(cwd, '.git/CHERRY_PICK_HEAD'),
    orig: resolve(cwd, '.git/ORIG_HEAD'),
    revert: resolve(cwd, '.git/REVERT_HEAD'),
  });

  const gitMessages = {
    commit: resolve(cwd, '.git/COMMIT_EDITMSG'),
    merge: resolve(cwd, '.git/MERGE_MSG'),
    squash: resolve(cwd, '.git/SQUASH_MSG'),
  };

  const gitRefs = resolveTree(resolve(cwd, '.git/refs'), {
    heads: resolve(cwd, '.git/refs/heads'),
    remotes: resolve(cwd, '.git/refs/remotes'),
    tags: resolve(cwd, '.git/refs/tags'),
  });

  const git = resolveTree(resolve(cwd, '.git'), {
    ignore: resolve(cwd, '.gitignore'),
    hooks: resolve(cwd, '.git/hooks'),
    rebaseApply: resolve(cwd, '.git/rebase-apply'),
    rebaseMerge: resolve(cwd, '.git/rebase-merge'),
    heads: gitHeads,
    messages: gitMessages,
    refs: gitRefs,
  });

  const npm = {
    ignore: resolve(cwd, '.npmignore'),
    package: resolve(cwd, 'package.json'),
    modules: resolve(cwd, 'node_modules'),
  };

  const manuals = resolveTree(resolve(cwd, '.tortilla/manuals'), {
    templates: resolve(cwd, '.tortilla/manuals/templates'),
    views: resolve(cwd, '.tortilla/manuals/views'),
  });

  return cache[cwd] = resolveTree(cwd, {
    tortillaDir: resolve(cwd, '.tortilla'),
    config: resolve(cwd, '.tortilla/config.js'),
    checkouts: resolve(cwd, '.tortilla/checkouts.json'),
    locales: resolve(cwd, '.tortilla/locales'),
    readme: resolve(cwd, 'README.md'),
    renovate: resolve(cwd, 'renovate.json'),
    storage: resolve(cwd, '.git/.tortilla'),
    travis: resolve(cwd, '.travis.yml'),
    manuals,
    tortilla,
    cli,
    git,
    npm,
    resolveTree,
    resolveProject,
  });
}

export const Paths: TortillaPaths = resolveProject(Utils.cwd());
