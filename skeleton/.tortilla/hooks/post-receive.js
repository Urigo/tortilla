var Git = require('../git');
var Paths = require('../paths');

/*
  Post-receive git hook launches right after we finished pushing our changes. This script
  is also used as a npm post-install hook to format all manuals to development mode.
 */

(function () {
  // Format all manual files into development mode
  Git(['rebase', '-i', '--root', '--keep-empty'], {
    GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' format-manuals -m dev'
  });
})();