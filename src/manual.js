var Fs = require('fs-extra');
var Minimist = require('minimist');
var Path = require('path');
var Git = require('./git');
var MDComponent = require('./md-parser/md-component');
var MDRenderer = require('./md-renderer');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');

/*
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

  // Fetch the current manual
  var manualTemplatePath = getManualTemplatePath(step);
  var manualTemplate = Fs.readFileSync(manualTemplatePath, 'utf8');

  var manualView = renderManualView(manualTemplate, {
    step: step,
    commitMessage: getStepCommitMessage(step)
  });

  // Rewrite manual
  var manualViewPath = getManualViewPath(step);
  Fs.ensureDir(Paths.manuals.views);
  Fs.writeFileSync(manualViewPath, manualView);

  // Amend changes
  Git(['add', manualViewPath]);
  var symlinkPath = Path.resolve(Paths.manuals.views, 'root.md');

  // If this is the root step, create a symlink to README.md if not yet exists
  if (step == 'root' && !Utils.exists(symlinkPath)) {
    var relativeSymlink = Path.relative(Path.dirname(symlinkPath), manualViewPath);
    Fs.symlinkSync(relativeSymlink, symlinkPath);
    Git(['add', symlinkPath]);
  }

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
  var header = MDRenderer.renderTemplateFile('header.md', scope)
  var body = MDRenderer.renderTemplate(manual, scope);
  var footer = MDRenderer.renderTemplateFile('footer.md', scope);

  header = MDComponent.wrap('region', 'header', header);
  body = MDComponent.wrap('region', 'body', body);
  footer = MDComponent.wrap('region', 'footer', footer);

  return [header, body, footer].join('\n');
}

// Gets the manual template belonging to the given step
function getManualTemplatePath(step) {
  if (step == 'root') return Path.resolve(Paths.manuals.templates, 'root.md');
  return Path.resolve(Paths.manuals.templates, 'step' + step + '.md');
}

// Gets the manual view belonging to the given step
function getManualViewPath(step) {
  if (step == 'root') return Paths.readme;
  return Path.resolve(Paths.manuals.views, 'step' + step + '.md');
}

// Gets the commit message belonging to the given step
function getStepCommitMessage(step) {
  if (step == 'root') {
    var rootHash = Git(['rev-list', '--max-parents=0', 'HEAD']);
    return Git(['log', '-1', rootHash, '--format=%s']);
  }

  return Git(['log', '-1', '--grep', '^Step ' + step + ':', '--format=%s'])
}


module.exports = {
  render: renderManual,
  manualTemplatePath: getManualTemplatePath,
  manualViewPath: getManualViewPath
};