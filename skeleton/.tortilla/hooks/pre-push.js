var Git = require('../git');
var Paths = require('../paths');

/*
  Pre-push git hook launches right before we push our changes.
 */

(function () {
  // Format all manual files into production mode
  Git(['rebase', '-i', '--root', '--keep-empty'], {
    GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' format-manuals -m prod'
  });
})();