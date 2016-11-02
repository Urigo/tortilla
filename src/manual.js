var Fs = require('fs-extra');
var Minimist = require('minimist');
var Path = require('path');
var Git = require('./git');
var MDParser = require('./md-parser');
var MDComponent = require('./md-parser/md-component');
var MDRenderer = require('./md-renderer');
var Paths = require('./paths');
var Step = require('./step');

/*
  Contains manual related utilities.
 */

var prodFlag = '[__prod__]: #';


(function () {
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_'],
    boolean: ['all', 'root', 'prod', 'dev']
  });

  var method = argv._[0];
  var step = argv._[1];
  var all = argv.all;
  var root = argv.root;
  var prod = argv.prod;
  var dev = argv.dev;

  if (!step && all) step = 'all';
  if (!step && root) step = 'root';

  if (!prod && !dev) {
    prod = true;
    dev = true;
  }


  var options = {
    prod: prod,
    dev: dev
  };

  switch (method) {
    case 'convert': return convertManual(step, options);
  }
})();

// Converts manual into the opposite format
function convertManual(step, options) {
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
  if (step == 'all') {
    var argv = ['convert'];
    if (options.prod) argv.push('--prod');
    if (options.dev) argv.push('--dev');

    return Git.print(['rebase', '-i', '--root', '--keep-empty'], {
      env: {
        GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' ' + argv.join(' ')
      }
    });
  }

  // Indicates whether we should continue rebasing at the end of the invocation.
  // If this script is not run by the git editor we should continue rebasing
  var shouldContinue = !Git.rebasing();

  // Enter rebase, after all this is what rebase-continue is all about
  if (shouldContinue) {
    var base = Step.base(step);

    Git(['rebase', '-i', base, '--keep-empty'], {
      env: {
        GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' edit'
      }
    });
  }

  // Fetch the current manual
  var manualPath = getManualPath(step);
  var manual = Fs.readFileSync(manualPath, 'utf8');
  var newManual;

  var scope = {
    step: step,
    manualPath: manualPath
  };

  var newManual;

  // Get new manual
  if (isManualProd(manual)) {
    newManual = convertDevManual(manual, scope);
    // Update the manual in case dev format is not wanted
    if (!options.dev) newManual = convertProdManual(newManual, scope);
  }
  else {
    // Abort in case prod format is not wanted
    if (!options.prod) return;
    newManual = convertProdManual(manual, scope);
  }

  // If no changes made, abort
  if (newManual == null) return;

  // Rewrite manual
  Fs.writeFileSync(manualPath, newManual);

  // Amend changes
  Git(['add', manualPath]);

  Git.print(['commit', '--amend'], {
    env: {
      GIT_EDITOR: true
    }
  });

  // Continue if should
  if (shouldContinue) Git.print(['rebase', '--continue']);
}

// Converts manual content to production format
function convertProdManual(manual, scope) {
  var header = MDRenderer.renderTemplateFile('header.md', scope)
  var body = MDRenderer.renderTemplate(manual, scope);
  var footer = MDRenderer.renderTemplateFile('footer.md', scope);

  header = MDComponent.wrap('region', 'header', header);
  body = MDComponent.wrap('region', 'body', body);
  footer = MDComponent.wrap('region', 'footer', footer);

  return [prodFlag, header, body, footer].join('\n');
}

// Converts manual content to development format
function convertDevManual(manual) {
  var chunks = MDParser.parse(manual, 1);
  var body = chunks[2].chunks;

  return body.toTemplate();
}

// Gets the manual belonging to the given step
function getManualPath(step) {
  if (step == 'root') return Path.resolve(Paths.readme)
  return Path.resolve(Paths.steps, 'step' + step + '.md');
}

// Returns if manual is in production format or not
function isManualProd(manual) {
  return manual.split('\n')[0] == prodFlag;
}


module.exports = {
  convert: convertManual,
  path: getManualPath,
  isProd: isManualProd
};