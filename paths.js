var Path = require('path');
var LocalCache = require('./local-cache');
var Utils = require('./utils');

/*
  It is important to use absolute paths and not relative paths since some helpers
  are distriuted over several processes whos execution path is not always the same,
  therefore this module was created.
 */

var cache = new LocalCache();
var resolve = Path.resolve.bind(Path);

var tortilla = {
  _: resolve(__dirname),
  editor: resolve(__dirname, 'editor.js'),
  essentials: resolve(__dirname, 'essentials.js'),
  git: resolve(__dirname, 'git.js'),
  history: resolve(__dirname, 'history.js'),
  initializer: resolve(__dirname, 'initializer.js'),
  localCache: resolve(__dirname, 'local-cache.js'),
  localStorage: resolve(__dirname, 'local-storage.js'),
  manual: resolve(__dirname, 'manual.js'),
  paths: resolve(__dirname, 'paths.js'),
  step: resolve(__dirname, 'step.js'),
  utils: resolve(__dirname, 'utils.js'),
  cli: resolve(__dirname, 'cli'),
  hooks: resolve(__dirname, 'hooks'),
  mdParser: resolve(__dirname, 'md-parser'),
  mdRenderer: resolve(__dirname, 'md-renderer'),
  skeleton: resolve(__dirname, 'skeleton'),
  templates: resolve(__dirname, 'templates')
};


// Resolves a bunch of paths to a given tortilla project path
function resolveAll(cwd) {
  if (!cwd)
    throw TypeError('A project path must be provided');

  if (cache.getItem(cwd)) return cache.getItem(cwd);

  var gitHeads = {
    _: resolve(cwd, '.git/HEAD'),
    cherryPick: resolve(cwd, '.git/CHERRY_PICK_HEAD'),
    orig: resolve(cwd, '.git/ORIG_HEAD'),
    revert: resolve(cwd, '.git/REVERT_HEAD')
  };

  var gitMessages = {
    commit: resolve(cwd, '.git/COMMIT_EDITMSG'),
    merge: resolve(cwd, '.git/MERGE_MSG'),
    squash: resolve(cwd, '.git/SQUASH_MSG')
  };

  var gitRefs = {
    _: resolve(cwd, '.git/refs'),
    heads: resolve(cwd, '.git/refs/heads'),
    remotes: resolve(cwd, '.git/refs/remotes'),
    tags: resolve(cwd, '.git/refs/tags')
  };

  var git = {
    _: resolve(cwd, '.git'),
    ignore: resolve(cwd, '.gitignore'),
    hooks: resolve(cwd, '.git/hooks'),
    rebaseApply: resolve(cwd, '.git/rebase-apply'),
    rebaseMerge: resolve(cwd, '.git/rebase-merge'),
    heads: gitHeads,
    messages: gitMessages,
    refs: gitRefs
  };

  var npm = {
    ignore: resolve(cwd, '.npmignore'),
    package: resolve(cwd, 'package.json'),
    modules: resolve(cwd, 'node_modules')
  };

  return cache.setItem(cwd, {
    _: resolve(cwd),
    readme: resolve(cwd, 'README.md'),
    steps: resolve(cwd, 'steps'),
    storage: resolve(cwd, '.tortilla'),
    tortilla: tortilla,
    resolve: resolveAll,
    git: git,
    npm: npm
  });
}


module.exports = resolveAll(Utils.cwd());