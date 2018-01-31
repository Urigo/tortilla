const Path = require('path');
const Utils = require('./utils');

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
  editor: resolve(__dirname, 'editor.js'),
  essentials: resolve(__dirname, 'essentials.js'),
  git: resolve(__dirname, 'git.js'),
  rebase: resolve(__dirname, 'rebase.js'),
  initializer: resolve(__dirname, 'initializer.js'),
  localCache: resolve(__dirname, 'local-cache.js'),
  localStorage: resolve(__dirname, 'local-storage.js'),
  manual: resolve(__dirname, 'manual.js'),
  paths: resolve(__dirname, 'paths.js'),
  release: resolve(__dirname, 'release.js'),
  step: resolve(__dirname, 'step.js'),
  utils: resolve(__dirname, 'utils.js'),
  hooks: resolve(__dirname, 'hooks'),
  skeleton: 'https://github.com/Urigo/tortilla-skeleton.git',
  ascii,
  renderer,
  translator,
});

const cli = resolveTree(resolve(__dirname, '../cli'), {
  tortilla: resolve(__dirname, '../cli/tortilla'),
  tortillaManual: resolve(__dirname, '../cli/tortilla-manual'),
  tortillaRelease: resolve(__dirname, '../cli/tortilla-release'),
  tortillaStep: resolve(__dirname, '../cli/tortilla-step'),
  tortillaStrict: resolve(__dirname, '../cli/tortilla-strict'),
  tortillaSubmodule: resolve(__dirname, '../cli/tortilla-submodule'),
});

// Makes the root path available in the branches object using a 'resolve()' method
// e.g. ('foo', { bar: 'bar' }) -> { resolve() -> 'foo', bar: 'bar' }
function resolveTree(root, branches) {
  branches = branches || {};

  return Object.keys(branches).reduce((tree, name) => {
    tree[name] = branches[name];
    return tree;
  }, {
    resolve: Path.resolve.bind(Path, root),
  });
}

// Resolves a bunch of paths to a given tortilla project path
function resolveProject(cwd) {
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
    readme: resolve(cwd, 'README.md'),
    renovate: resolve(cwd, 'renovate.json'),
    travis: resolve(cwd, 'travis.yml'),
    locales: resolve(cwd, '.tortilla/locales'),
    storage: resolve(cwd, '.git/.tortilla'),
    manuals,
    tortilla,
    cli,
    git,
    npm,
    resolveTree,
    resolveProject,
  });
}


module.exports = resolveProject(Utils.cwd());
