var Fs = require('fs-extra');
var Path = require('path');
var ReadlineSync = require('readline-sync');
var Ascii = require('./ascii');
var Rebase = require('./rebase');
var Git = require('./git');
var LocalStorage = require('./local-storage');
var MDRenderer = require('./md-renderer');
var Paths = require('./paths');
var Utils = require('./utils');

/*
  Contains some essential utilities that should usually run once to create a project or
  initialize a project.
 */

var tempPaths = Paths.resolve('/tmp/tortilla');
var exec = Utils.exec;


(function () {
  if (require.main !== module) return;

  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm', 'output', 'o'],
    boolean: ['override']
  });

  var method = argv._[0];
  var arg1 = argv._[1];
  var output = argv.output || argv.o;
  var override = argv.override;

  var options = {
    output: output,
    override: override
  };

  switch (method) {
    case 'create': return createProject(arg1, options);
    case 'init': return initializeProject(arg1);
  }
})();

// Initialize tortilla project, it will use the skeleton as the template and it will fill
// it up with the provided details. Usually should only run once
function createProject(projectName, options) {
  projectName = projectName || 'tortilla-project';

  options = Utils.extend({
    output: Path.resolve(Paths._, projectName)
  }, options);

  // In case dir already exists verify the user's decision
  if (Utils.exists(options.output)) {
    options.override = options.override || ReadlineSync.keyInYN([
      'Output path already eixsts.',
      'Would you like to override it and continue?'
    ].join('\n'));

    if (!options.override) return;
  }

  Fs.removeSync(tempPaths._);
  // Clone skeleton
  Git.print(['clone', Paths.tortilla.skeleton, tempPaths._]);
  // Remove .git to remove unnecessary meta-data, git essentials should be
  // initialized later on
  Fs.removeSync(tempPaths.git._);

  var packageName = Utils.kebabCase(projectName);
  var title = Utils.startCase(projectName);

  // Fill in template files
  MDRenderer.overwriteTemplateFile(tempPaths.npm.package, {
    name: packageName
  });

  MDRenderer.overwriteTemplateFile(tempPaths.readme, {
    title: title
  });

  // Git chores
  Git(['init'], { cwd: tempPaths._ });
  Git(['add', '.'], { cwd: tempPaths._ });
  Git(['commit', '-m', title], { cwd: tempPaths._ });

  // Initializing
  ensureTortilla(tempPaths);

  // Copy from temp to output
  Fs.removeSync(options.output);
  Fs.copySync(tempPaths._, options.output);
  Fs.removeSync(tempPaths._);
}

// Make sure that tortilla essentials are initialized on an existing project.
// Used most commonly when cloning or creating a project
function ensureTortilla(projectDir) {
  projectDir = projectDir || Utils.cwd();

  var projectPaths = projectDir.resolve ? projectDir : Paths.resolve(projectDir);
  var localStorage = LocalStorage.create(projectPaths);

  // If tortilla is already initialized don't do anything
  var isInitialized = localStorage.getItem('INIT');
  if (isInitialized) return;

  var hookFiles = Fs.readdirSync(projectPaths.tortilla.hooks);

  // For each hook file in the hooks directory
  hookFiles.forEach(function (hookFile) {
    var handlerPath = Path.resolve(projectPaths.tortilla.hooks, hookFile);
    var hookName = Path.basename(hookFile, '.js');
    var hookPath = Path.resolve(projectPaths.git.hooks, hookName);

    // Place an executor in the project's git hooks
    var hook = [
      '',
      '# Tortilla',
      'cd .',
      'node ' + handlerPath + ' "$@"'
    ].join('\n');

    // If exists, append logic
    if (Utils.exists(hookPath, 'file'))
      Fs.appendFileSync(hookPath, '\n' + hook);
    // Else, create file
    else
      Fs.writeFileSync(hookPath, '#!/bin/sh' + hook);

    // Give read permissions to hooks so git can execute properly
    Fs.chmodSync(hookPath, 0755);
  });

  // Mark tortilla flag as initialized
  localStorage.setItem('INIT', true);
  localStorage.setItem('USE_STRICT', true);

  // Retag steps
  Utils.scopeEnv(Rebase.retagSteps.bind(Rebase), {
    TORTILLA_CWD: projectPaths._
  });

  Ascii.print('ready');
}


module.exports = {
  create: createProject,
  ensure: ensureTortilla
};