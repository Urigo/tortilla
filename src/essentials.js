const Fs = require('fs-extra');
const Handlebars = require('handlebars');
const Path = require('path');
const ReadlineSync = require('readline-sync');
const Tmp = require('tmp');
const Ascii = require('./ascii');
const Git = require('./git');
const LocalStorage = require('./local-storage');
const Paths = require('./paths');
const Rebase = require('./rebase');
const Step = require('./step');
const Submodule = require('./submodule');
const Utils = require('./utils');

/**
  Contains some essential utilities that should usually run once to create a project or
  initialize a project.
 */

const tmpDir = Tmp.dirSync({ unsafeCleanup: true });
const tmpPaths = Paths.resolveProject(tmpDir.name);
const exec = Utils.exec;

const defaultDumpFileName = 'tutorial.json';
const headEnd = '[//]: # (head-end)\n';
const footStart = '[//]: # (foot-start)\n';


(function () {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_', 'message', 'm', 'output', 'o'],
    boolean: ['override'],
  });

  const method = argv._[0];
  const arg1 = argv._[1];
  const output = argv.output || argv.o;
  const override = argv.override;

  const options = {
    output,
    override,
  };

  switch (method) {
    case 'create': return createProject(arg1, options);
    case 'ensure': return ensureTortilla(arg1);
  }
}());

// Initialize tortilla project, it will use the skeleton as the template and it will fill
// it up with the provided details. Usually should only run once
function createProject(projectName, options) {
  projectName = projectName || 'tortilla-project';

  options = Utils.extend({
    output: Path.resolve(projectName),
  }, options);

  // In case dir already exists verify the user's decision
  if (Utils.exists(options.output)) {
    options.override = options.override || ReadlineSync.keyInYN([
      'Output path already exists.',
      'Would you like to override it and continue?',
    ].join('\n'));

    if (!options.override) {
      return;
    }
  }

  Fs.removeSync(tmpDir.name);
  // Clone skeleton
  Git.print(['clone', Paths.tortilla.skeleton, tmpDir.name], { cwd: '/tmp' });
  // Checkout desired release
  Git(['checkout', '0.0.1-alpha.4'], { cwd: tmpDir.name });
  // Remove .git to remove unnecessary meta-data, git essentials should be
  // initialized later on
  Fs.removeSync(tmpPaths.git.resolve());

  const packageName = Utils.kebabCase(projectName);
  const title = Utils.startCase(projectName);

  // Fill in template files
  overwriteTemplateFile(tmpPaths.npm.package, {
    name: packageName,
  });

  overwriteTemplateFile(tmpPaths.readme, {
    title,
  });

  // Git chores
  Git(['init'], { cwd: tmpDir.name });
  Git(['add', '.'], { cwd: tmpDir.name });
  Git(['commit', '-m', title], { cwd: tmpDir.name });

  if (options.message) {
    Git.print(['commit', '--amend', '-m', options.message], { cwd: tmpDir.name });
  } else {
    Git.print(['commit', '--amend'], { cwd: tmpDir.name });
  }

  // Initializing
  ensureTortilla(tmpPaths);

  // Copy from temp to output
  Fs.removeSync(options.output);
  Fs.copySync(tmpDir.name, options.output);
  tmpDir.removeCallback();
}

// Make sure that tortilla essentials are initialized on an existing project.
// Used most commonly when cloning or creating a project
function ensureTortilla(projectDir) {
  projectDir = projectDir || Utils.cwd();

  const projectPaths = projectDir.resolve ? projectDir : Paths.resolveProject(projectDir);
  const localStorage = LocalStorage.create(projectPaths);
  const cwd = projectPaths.resolve();

  // If tortilla is already initialized don't do anything
  const isInitialized = localStorage.getItem('INIT');
  if (isInitialized) {
    return;
  }

  const hookFiles = Fs.readdirSync(projectPaths.tortilla.hooks);

  // For each hook file in the hooks directory
  hookFiles.forEach((hookFile) => {
    const handlerPath = Path.resolve(projectPaths.tortilla.hooks, hookFile);
    const hookName = Path.basename(hookFile, '.js');
    const hookPath = Path.resolve(projectPaths.git.hooks, hookName);

    // Place an executor in the project's git hooks
    const hook = [
      '',
      '# Tortilla',
      'cd .',
      `node ${handlerPath} "$@"`,
    ].join('\n');

    // If exists, append logic
    if (Utils.exists(hookPath, 'file')) {
      Fs.appendFileSync(hookPath, `\n${hook}`);
    } else { // Else, create file
      Fs.writeFileSync(hookPath, `#!/bin/sh${hook}`);
    }

    // Give read permissions to hooks so git can execute properly
    Fs.chmodSync(hookPath, '755');
  });

  // Create root branch reference for continues integration testing
  const activeBranchName = Git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  try {
    Git(['rev-parse', `${activeBranchName}-root`], { cwd });
  }
  catch (e) {
    Git(['branch', `${activeBranchName}-root`, activeBranchName], { cwd });
  }

  // Ensure submodules are initialized
  Git.print(['submodule', 'init'], { cwd });
  Git.print(['submodule', 'update'], { cwd });

  // Mark tortilla flag as initialized
  localStorage.setItem('INIT', true);
  localStorage.setItem('USE_STRICT', true);

  // The art should be printed only if the operation finished for all submodules
  if (!Submodule.isOne()) {
    Ascii.print('ready');
  }
}

// Dumps tutorial into a JSON file
// Output path defaults to cwd
function dumpProject(out = Utils.cwd(), options = {}) {
  if (out instanceof Object && !(out instanceof String)) {
    options = out;
    out = Utils.cwd();
  }

  options = Object.assign({
    filter: options.filter,
    reject: options.reject,
  }, options);

  // Output path is relative to cwd
  out = Path.resolve(Utils.cwd(), out);

  // If provided output path is a dir assume the dump file should be created inside of it
  if (Utils.exists(out, 'dir')) {
    out = Path.join(out, defaultDumpFileName);
  }

  if (Utils.exists(out, 'file')) {
    options.override = options.override || ReadlineSync.keyInYN([
      'Output path already exists.',
      'Would you like to override it and continue?',
    ].join('\n'));

    if (!options.override) {
      return;
    }
  }

  console.log();
  console.log(`Dumping into ${out}...`);
  console.log();

  // Will recursively ensure dirs as well
  Fs.ensureFileSync(out);

  // Run command once
  const tagNames = Git(['tag', '-l'])
    .split('\n')
    .filter(Boolean);

  let branchNames = tagNames
    .filter((tagName) => {
      return /^[^@]+?@\d+\.\d+\.\d+$/.test(tagName);
    })
    .map((tagName) => {
      return tagName.split('@')[0];
    })
    .reduce((branchNames, branchName) => {
      if (!branchNames.includes(branchName)) {
        branchNames.push(branchName);
      }

      return branchNames;
    }, []);

  if (options.filter) {
    branchNames = branchNames.filter((branchName) => {
      return options.filter.includes(branchName);
    });
  }

  if (options.reject) {
    branchNames = branchNames.filter((branchName) => {
      return !options.reject.includes(branchName);
    });
  }

  const dump = branchNames.map((branchName) => {
    const historyBranchName = `${branchName}-history`;

    // Run command once
    const releaseVersions = tagNames
      .map((tagName) => {
        return tagName.match(new RegExp(`${branchName}@(\\d+\\.\\d+\\.\\d+)`));
      })
      .filter(Boolean)
      .map((match) => {
        return match[1];
      })
      .reverse();

    const releases = releaseVersions.map((releaseVersion) => {
      const tagName = `${branchName}@${releaseVersion}`;
      const tagRevision = Git(['rev-parse', tagName]);

      const historyRevision = Git([
        'log', historyBranchName, `--grep=^${tagName}:`, '--format=%H'
      ]).split('\n')
        .filter(Boolean)
        .pop();

      const manuals = Fs.readdirSync(Paths.manuals.views).map((manualName, stepIndex) => {
        const format = '%H %s';
        let stepLog, manualPath;

        // Step
        if (stepIndex) {
          manualPath = Path.resolve(Paths.manuals.views, manualName);
          stepLog = Git([
            'log', branchName, `--grep=^Step ${stepIndex}:`, `--format=${format}`
          ]);
        }
        // Root
        else {
          manualPath = Paths.readme;
          stepLog = Git([
            'log', Git.rootHash(branchName), `--format=${format}`
          ]);
        }

        manualPath = Path.relative(Utils.cwd(), manualPath);
        stepLog = stepLog.split(' ');
        const stepRevision = stepLog.shift();
        const manualTitle = stepLog.join(' ');

        // Removing header and footer, since the view should be used externally on a
        // different host which will make sure to show these two
        let manualView = Git(['show', `${stepRevision}:${manualPath}`]);

        if (manualView.includes(headEnd)) {
          manualView = manualView
            .split(headEnd)
            .slice(1)
            .join(headEnd);
        }

        if (manualView.includes(footStart)) {
          manualView = manualView
            .split(footStart)
            .slice(0, -1)
            .join(footStart);
        }

        manualView = manualView.trim();

        return {
          manualTitle,
          stepRevision,
          manualView,
        };
      });

      return {
        releaseVersion,
        tagName,
        tagRevision,
        historyRevision,
        manuals,
      };
    });

    return {
      branchName,
      historyBranchName,
      releases,
    };
  });

  Fs.writeJsonSync(out, dump);
}

function overwriteTemplateFile(path, scope) {
  const templateContent = Fs.readFileSync(path, 'utf8');
  const viewContent = Handlebars.compile(templateContent)(scope);

  Fs.writeFileSync(path, viewContent);
}


module.exports = {
  create: createProject,
  ensure: ensureTortilla,
  dump: dumpProject,
};
