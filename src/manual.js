var Fs = require('fs-extra');
var Minimist = require('minimist');
var Path = require('path');
var Git = require('./git');
var Paths = require('./paths');
var Renderer = require('./renderer');
var Step = require('./step');
var Utils = require('./utils');

/**
  Contains manual related utilities.
 */

(function () {
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_'],
    boolean: ['all', 'root']
  });

  var method = argv._[0];
  var step = argv._[1];
  var all = argv.all;
  var root = argv.root;

  if (!step && all) step = 'all';
  if (!step && root) step = 'root';

  switch (method) {
    case 'render': return renderManual(step);
  }
})();

// Converts manual into the opposite format
function renderManual(step) {
  if (step) {
    var isSuperStep = !step.split('.')[1];
    if (!isSuperStep) throw TypeError('Provided step must be a super step');
  }
  // Grab recent super step by default
  else {
    var superMessage = Step.recentSuperCommit('%s');
    step = superMessage ? Step.descriptor(superMessage).number : 'root';
  }

  // Convert all manuals since the beginning of history
  if (step == 'all')
    return Git.print(['rebase', '-i', '--root', '--keep-empty'], {
      env: {
        GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' render'
      }
    });

  // Indicates whether we should continue rebasing at the end of the invocation.
  // If this script is not run by the git editor we should continue rebasing
  var shouldContinue = !Git.rebasing();

  // Enter rebase, after all this is what rebase-continue is all about
  if (shouldContinue) Utils.scopeEnv(Step.edit.bind(Step, step), {
    TORTILLA_STDIO: 'ignore'
  });

  var localesDir = Paths.manuals.templates + '/locales';
  var locales = [''];

  if (Utils.exists(localesDir)) {
    locales = locales.concat(Fs.readdirSync(localesDir));
  }

  // Render manual for each locale
  locales.forEach(function (locale) {
    // Fetch the current manual and other useful models
    var manualTemplatePath = getManualTemplatePath(step, locale);
    var manualTemplate = Fs.readFileSync(manualTemplatePath, 'utf8');
    var manualViewPath = getManualViewPath(step, locale);
    var commitMessage = getStepCommitMessage(step);

    var manualView = renderManualView(manualTemplate, {
      step: step,
      commitMessage: commitMessage,
      templatePath: manualTemplatePath,
      viewPath: manualViewPath
    });

    // Rewrite manual
    Fs.ensureDir(Paths.manuals.views);

    // In case a custom render target is specified, ensure its dir exists
    var target = process.env.TORTILLA_RENDER_TARGET;
    if (target) {
      var customTargetDir = Path.resolve(Paths.manuals.views, target);
      Fs.ensureDir(customTargetDir);
    }

    Fs.writeFileSync(manualViewPath, manualView);

    // Amend changes
    Git(['add', manualViewPath]);

    // The following code is dedicated for locale-free manuals
    if (locale) return;

    var symlinkPath = Path.resolve(Paths.manuals.views, 'root.md');

    // If this is the root step, create a symlink to README.md if not yet exists
    if (step != 'root' || Utils.exists(symlinkPath)) return;

    var relativeSymlink = Path.relative(Path.dirname(symlinkPath), manualViewPath);
    Fs.symlinkSync(relativeSymlink, symlinkPath);
    Git(['add', symlinkPath]);
  });

  Git.print(['commit', '--amend'], {
    env: {
      GIT_EDITOR: true
    }
  });

  // Continue if should
  if (shouldContinue) Git.print(['rebase', '--continue']);
}

// Renders manual template into informative view
function renderManualView(manual, scope) {
  var header = Renderer.renderTemplateFile('header', scope)
  var body = Renderer.renderTemplate(manual, scope);
  var footer = Renderer.renderTemplateFile('footer', scope);

  return [header, body, footer].join('\n');
}

// Gets the manual template belonging to the given step
function getManualTemplatePath(step, locale) {
  locale = locale ? ('locales/' + locale) : '';

  var baseDir = Path.resolve(Paths.manuals.templates, locale);
  var fileName = step == 'root' ? 'root.tmpl' : ('step' + step + '.tmpl');

  return Path.resolve(baseDir, fileName);
}

// Gets the manual view belonging to the given step
function getManualViewPath(step, locale) {
  locale = locale ? ('locales/' + locale) : '';

  // The sub-dir of our views in case a custom render target is specified
  var subDir = process.env.TORTILLA_RENDER_TARGET || '';
  var fileName = step == 'root' ? 'root.md' : ('step' + step + '.md');

  // If sub-dir exists, return its path e.g. manuals/view/medium
  if (subDir) return Path.resolve(Paths.manuals.views, subDir, locale, fileName);
  // If we're trying to render root step, return README.md
  if (step == 'root') return Paths.readme;
  // Resolve normally e.g. manuals/views/step1.md
  return Path.resolve(Paths.manuals.views, locale, fileName);
}

// Gets the commit message belonging to the given step
function getStepCommitMessage(step) {
  if (step == 'root') {
    var rootHash = Git.rootHash();
    return Git(['log', '-1', rootHash, '--format=%s']);
  }

  return Git(['log', '-1', '--grep', '^Step ' + step + ':', '--format=%s'])
}


module.exports = {
  render: renderManual,
  manualTemplatePath: getManualTemplatePath,
  manualViewPath: getManualViewPath
};