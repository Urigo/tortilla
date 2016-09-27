var Path = require('path');

/*
  It is important to use absolute paths and not relative paths since some helpers
  are distriuted over several processes whos execution path is not always the same,
  therefore this module was created.
 */

var resolve = Path.resolve.bind(Path, __dirname, '..');


var gitHeads = {
  _: resolve('.git/HEAD'),
  cherryPick: resolve('.git/CHERRY_PICK_HEAD'),
  orig: resolve('.git/ORIG_HEAD'),
  revert: resolve('.git/REVERT_HEAD')
};

var gitRefs = {
  _: resolve('.git/refs'),
  heads: resolve('.git/refs/heads'),
  remotes: resolve('.git/refs/remotes'),
  tags: resolve('.git/refs/tags')
};

var git = {
  _: resolve('.git'),
  ignore: resolve('.gitignore'),
  rebaseMerge: resolve('.git/rebase-merge'),
  rebaseApply: resolve('.git/rebase-apply'),
  heads: gitHeads,
  refs: gitRefs
};

var npm = {
  ignore: resolve('.npmignore'),
  package: resolve('package.json'),
  modules: resolve('node_modules')
};

var tortilla = {
  _: resolve('.tortilla'),
  editor: resolve('.tortilla/editor.js'),
  git: resolve('.tortilla/git.js'),
  paths: resolve('.tortilla/paths.js'),
  retagger: resolve('.tortilla/retagger.js'),
  reworder: resolve('.tortilla/reworder.js'),
  step: resolve('.tortilla/step.js'),
  superPicker: resolve('.tortilla/super-picker.js'),
  utils: resolve('.tortilla/utils.js')
};

module.exports = {
  _: resolve(),
  readme: resolve('README.md'),
  steps: resolve('steps'),
  git: git,
  npm: npm,
  tortilla: tortilla
};