var Path = require('path');
var Utils = require('./utils');

/**
  It is important to use absolute paths and not relative paths since some helpers
  are distributed over several processes whose execution path is not always the same,
  therefore this module was created.
 */

var cache = {};
var resolve = Path.resolve.bind(Path);

var ascii = resolveTree(resolve(__dirname, 'ascii'), {
  views: resolve(__dirname, 'ascii/views')
});

var mdRenderer = resolveTree(resolve(__dirname, 'md-renderer'), {
  helpers: resolve(__dirname, 'md-renderer/helpers')
});

var tortilla = resolveTree(resolve(__dirname, '..'), {
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
  mdParser: resolve(__dirname, 'md-parser'),
  mdRenderer: resolve(__dirname, 'md-renderer'),
  templates: resolve(__dirname, 'templates'),
  skeleton: 'git@github.com:Urigo/tortilla-skeleton.git',
  ascii: ascii
});

function resolveTree(root, branches) {
  branches = branches || {};

  return Object.keys(branches).reduce(function (tree, name) {
    tree[name] = branches[name];
    return tree;
  }, {
    resolve: Path.resolve.bind(Path, root)
  });
}

// Resolves a bunch of paths to a given tortilla project path
function resolveProject(cwd) {
  if (!cwd)
    throw TypeError('A project path must be provided');

  if (!process.env.TORTILLA_CACHE_DISABLED && cache[cwd]) return cache[cwd];

  var gitHeads = resolveTree(resolve(cwd, '.git/HEAD'), {
    cherryPick: resolve(cwd, '.git/CHERRY_PICK_HEAD'),
    orig: resolve(cwd, '.git/ORIG_HEAD'),
    revert: resolve(cwd, '.git/REVERT_HEAD')
  });

  var gitMessages = {
    commit: resolve(cwd, '.git/COMMIT_EDITMSG'),
    merge: resolve(cwd, '.git/MERGE_MSG'),
    squash: resolve(cwd, '.git/SQUASH_MSG')
  };

  var gitRefs = resolveTree(resolve(cwd, '.git/refs'), {
    heads: resolve(cwd, '.git/refs/heads'),
    remotes: resolve(cwd, '.git/refs/remotes'),
    tags: resolve(cwd, '.git/refs/tags')
  });

  var git = resolveTree(resolve(cwd, '.git'), {
    ignore: resolve(cwd, '.gitignore'),
    hooks: resolve(cwd, '.git/hooks'),
    rebaseApply: resolve(cwd, '.git/rebase-apply'),
    rebaseMerge: resolve(cwd, '.git/rebase-merge'),
    heads: gitHeads,
    messages: gitMessages,
    refs: gitRefs
  });

  var npm = {
    ignore: resolve(cwd, '.npmignore'),
    package: resolve(cwd, 'package.json'),
    modules: resolve(cwd, 'node_modules')
  };

  var manuals = resolveTree(resolve(cwd, 'manuals'), {
    templates: resolve(cwd, 'manuals/templates'),
    views: resolve(cwd, 'manuals/views')
  });

  return cache[cwd] = resolveTree(cwd, {
    readme: resolve(cwd, 'README.md'),
    storage: resolve(cwd, '.git/.tortilla'),
    manuals: manuals,
    tortilla: tortilla,
    git: git,
    npm: npm,
    resolveTree: resolveTree,
    resolveProject: resolveProject
  });
}


module.exports = resolveProject(Utils.cwd());
