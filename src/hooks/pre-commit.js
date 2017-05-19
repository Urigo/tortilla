const Fs = require('fs');
const Git = require('../git');
const LocalStorage = require('../local-storage');
const Paths = require('../paths');
const Step = require('../step');
const Utils = require('../utils');

/**
  Pre-commit git hook launches right before we commit changes. If an error was thrown
  the commit process will be aborted with the provided error message.
 */

(function () {
  if (process.env.TORTILLA_CHILD_PROCESS) {
    return;
  }
  if (!LocalStorage.getItem('USE_STRICT')) {
    return;
  }

  // Prohibit regular commits
  if (!Git.gonnaAmend()) {
    throw Error('New commits are prohibited! Use `$ tortilla step push` instead');
  }

  if (!Git.rebasing()) {
    throw Error([
      'Changes are not allowed outside editing mode!',
      'Use `$ tortilla step edit` and then make your changes',
    ].join('\n'));
  }

  const stepMessage = Step.recentCommit('%s');
  const stepDescriptor = Step.descriptor(stepMessage);
  const isSuperStep = stepDescriptor && !stepDescriptor.number.split('.')[1];

  let stagedFiles;

  // If this is a super step only the appropriate manual file can be modified
  if (isSuperStep) {
    const tag = `step${stepDescriptor.number}`;

    let allowedFiles = [
      `.tortilla/manuals/templates/${tag}.tmpl`,
      `.tortilla/manuals/views/${tag}.md`,
    ];

    const localesDir = `${Paths.manuals.templates}/locales`;

    if (Utils.exists(localesDir)) {
      const locales = Fs.readdirSync(localesDir);

      allowedFiles = allowedFiles.concat(locales.map(locale => `.tortilla/manuals/templates/locales/${locale}/${tag}.tmpl`));

      allowedFiles = allowedFiles.concat(locales.map(locale => `.tortilla/manuals/views/locales/${locale}/${tag}.md`));
    }

    stagedFiles = Git.stagedFiles().filter(stagedFile => allowedFiles.indexOf(stagedFile) !== -1);

    if (!stagedFiles.length) {
      const filesList = allowedFiles.map(file => `• ${file}`).join('\n');

      throw Error(`Staged files must be one of:\n${filesList}`);
    }
  } else if (stepDescriptor) { // Else, if this is not root commit prohibit manual files modifications
    stagedFiles = Git.stagedFiles(/^\.tortilla\/manuals\//);

    if (stagedFiles.length) {
      throw Error('Step manual files can\'t be modified');
    }
  }

  stagedFiles = Git.stagedFiles(/^README.md/);

  if (stagedFiles.length) {
    throw Error([
      'README.md can\'t be modified.',
      'Run `$ tortilla step edit --root` and edit \'.tortilla/manuals/templates/root.md\' file instead',
    ].join('\n'));
  }
}());
