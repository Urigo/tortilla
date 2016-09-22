var Path = require('path');

/*
  It is important to use absolute paths and not relative paths since some helpers
  are distriuted over several processes whos execution path is not always the same,
  therefore this module was created.
 */

 var gitHeads = {
  _: Path.resolve('./.git/HEAD'),
  cherryPick: Path.resolve('./.git/CHERRY_PICK_HEAD'),
  orig: Path.resolve('./.git/ORIG_HEAD'),
  revert: Path.resolve('./.git/REVERT_HEAD')
};

var gitHelpers = {
  _: Path.resolve('./git-helpers'),
  editor: Path.resolve('./git-helpers/editor.js'),
  initTutorial: Path.resolve('./git-helpers/init-tutorial.js'),
  retagger: Path.resolve('./git-helpers/retagger.js'),
  reworder: Path.resolve('./git-helpers/reworder.js'),
  step: Path.resolve('./git-helpers/step.js'),
  superPicker: Path.resolve('./git-helpers/super-picker.js'),
  utils: Path.resolve('./git-helpers/utils.js')
};

var gitRefs = {
  _: Path.resolve('./.git/refs'),
  heads: Path.resolve('./.git/refs/heads'),
  remotes: Path.resolve('./.git/refs/remotes'),
  tags: Path.resolve('./.git/refs/tags')
};

var git = {
  _: Path.resolve('./.git'),
  ignore: Path.resolve('./.gitignore'),
  rebaseMerge: Path.resolve('./.git/rebase-merge'),
  rebaseApply: Path.resolve('./.git/rebase-apply'),
  heads: gitHeads,
  helpers: gitHelpers,
  refs: gitRefs
};

var npm = {
  ignore: Path.resolve('./.npmignore'),
  pack: Path.resolve('./package.json'),
  modules: Path.resolve('./node_modules')
};

module.exports = {
  _: Path.resolve('.'),
  license: Path.resolve('./LICENSE'),
  readme: Path.resolve('./README.md'),
  steps: Path.resolve('./steps'),
  test: Path.resolve('./test'),
  git: git,
  npm: npm
};