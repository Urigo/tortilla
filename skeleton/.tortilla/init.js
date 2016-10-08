var Git = require('./git');
var Paths = require('./paths');

/*
  This script will run right after `$ npm install` to initialize some essential logic.
  This operation is very important because without it tortilla will not work. The reason
  why it is hooked with the install command is beacuse this command is most likely to
  ve run right after we close a tortilla project from a git repository.
 */

function main() {
	// Turn all manual files into dev format so they can be user-friendly
	Git(['rebase', '-i', '--root', '--keep-empty'], {
    GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' format-manuals -m dev'
  });
}


if (require.main === module) main();