var Git = require('../git');
var LocalStorage = require('../local-storage');
var Paths = require('../paths');
var Step = require('../step');
var Utils = require('../utils');

/**
  Pre-commit git hook launches right before we commit changes. If an error was thrown
  the commit process will be aborted with the provided error message.
 */

(function () {
  if (process.env.TORTILLA_CHILD_PROCESS) return;
  if (!LocalStorage.getItem('USE_STRICT')) return;

  // Prohibit regular commits
  if (!Git.gonnaAmend()) throw Error(
    'New commits are prohibited! Use `$ tortilla step push` instead'
  );

  if (!Git.rebasing()) throw Error([
    'Changes are not allowed outside editing mode!',
    'Use `$ tortilla step edit` and then make your changes'
  ].join('\n'));

  var stepMessage = Step.recentCommit('%s');
  var stepDescriptor = Step.descriptor(stepMessage);
  var isSuperStep = stepDescriptor && !stepDescriptor.number.split('.')[1];

  // If this is a super step only the appropriate manual file can be modified
  if (isSuperStep) {
    var tag = 'step' + stepDescriptor.number;

    var allowedFiles = [
      '.tortilla/manuals/templates/' + tag + '.tmpl',
      '.tortilla/manuals/views/' + tag + '.md'
    ];

    var localesDir = Paths.manuals.templates + '/locales';

    if (Utils.exists(localesDir)) {
      var locales = Fs.readdirSync(localesDir);

      allowedFiles = allowedFiles.concat(locales.map(function (locale) {
        return '.tortilla/manuals/templates/locales/' + locale + '/' + tag + '.tmpl';
      }));

      allowedFiles = allowedFiles.concat(locales.map(function (locale) {
        return '.tortilla/manuals/views/locales/' + locale + '/' + tag + '.md';
      }));
    }

    var stagedFiles = Git.stagedFiles().filter(function (stagedFile) {
      return allowedFiles.indexOf(stagedFile) != -1;
    });

    if (!stagedFiles.length) {
      var filesList = allowedFiles.map(function (file) {
        return '• ' + file;
      }).join('\n');

      throw Error('Staged files must be one of:\n' + filesList);
    }
  }
  // Else, if this is not root commit prohibit manual files modifications
  else if (stepDescriptor) {
    var stagedFiles = Git.stagedFiles(/^\.tortilla\/manuals\//);

    if (stagedFiles.length) throw Error(
      'Step manual files can\'t be modified'
    );
  }

  var stagedFiles = Git.stagedFiles(/^README.md/);

  if (stagedFiles.length) throw Error([
    'README.md can\'t be modified.',
    'Run `$ tortilla step edit --root` and edit \'.tortilla/manuals/templates/root.md\' file instead',
  ].join('\n'));
})();