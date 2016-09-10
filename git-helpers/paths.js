var Path = require('path');

/*
  It is important to use absolute paths and not relative paths since some helpers
  are distriuted over several processes whos execution path is not always the same,
  therefore this module was created.
 */

var gitHelpers = {
  _: Path.resolve('./git-helpers'),
  editor: Path.resolve('./git-helpers/editor.js'),
  localStorage: Path.resolve('./git-helpers/local-storage.js'),
  retagger: Path.resolve('./git-helpers/retagger.js'),
  step: Path.resolve('./git-helpers/step.js'),
  utils: Path.resolve('./git-helpers/utils.js')
};

var git = {
  _: Path.resolve('./.git'),
  rebaseMerge: Path.resolve('./.git/rebase-merge'),
  rebaseApply: Path.resolve('./.git/rebase-apply'),
  helpers: gitHelpers
};

module.exports = {
  _: Path.resolve('.');
  steps: Path.resolve('./step');
  git: git
};