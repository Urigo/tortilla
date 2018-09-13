import * as Fs from 'fs-extra';
import * as Handlebars from 'handlebars';
import * as Minimist from 'minimist';
import * as Path from 'path';
import * as ReadlineSync from 'readline-sync';
import * as Tmp from 'tmp';
import { Ascii } from './ascii';
import { Git } from './git';
import { localStorage as LocalStorage } from './local-storage';
import { Paths } from './paths';
import { Submodule } from './submodule';
import { Utils } from './utils';

/**
 Contains some essential utilities that should usually run once to create a project or
 initialize a project.
 */

const exec = Utils.exec as any
const tmpDir = Tmp.dirSync({ unsafeCleanup: true });
const tmpPaths = Paths.resolveProject(tmpDir.name);

function init() {
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
    case 'create':
      return createProject(arg1, options);
    case 'ensure':
      return ensureTortilla(arg1);
  }
}

init();

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

  Fs.emptyDirSync(tmpDir.name);
  // Unpack skeleton
  exec.print('tar', [
    '--strip-components', 1, '-xf', Paths.tortilla.skeleton, '-C', tmpDir.name
  ])

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
  } catch (e) {
    Git(['branch', `${activeBranchName}-root`, activeBranchName], { cwd });
  }

  // Ensure submodules are initialized
  Git.print(['submodule', 'init'], { cwd });
  Git.print(['submodule', 'update', '--recursive', '--remote'], { cwd });

  // Mark tortilla flag as initialized
  localStorage.setItem('INIT', true);
  localStorage.setItem('USE_STRICT', true);

  // The art should be printed only if the operation finished for all submodules
  if (!Submodule.isOne()) {
    Ascii.print('ready');
  }
}

// TODO: **Add tests**
function cloneProject(url, out) {
  if (!out) {
    // git@github.com:srtucker22/chatty.git -> chatty
    out = url.split('/').pop().split('.').shift()
  }

  out = Path.resolve(Utils.cwd(), out)

  Git.print(['clone', url, out])

  ensureTortilla(out)

  // List all branches in origin
  Git(['branch', '-a'], { cwd: out })
    .split('\n')
    .filter(Boolean)
    .filter((remoteBranch) =>
      /remotes\/origin\/[^\s]+$/.test(remoteBranch)
    )
    .map((remoteBranch) =>
      remoteBranch.trim()
    )
    .map((remoteBranch) =>
      remoteBranch.split('remotes/origin/').pop()
    )
    .forEach((remoteBranch) => {
      const branchName = remoteBranch.split('/').pop()

      // Create all branches
      try {
        Git(['checkout', '-b', branchName], { cwd: out })
      }
      catch (e) {
        // Branch already exists. I don't care
      }
    })

  // Switch back to the original branch
  Git(['checkout', 'master'], { cwd: out })
}

// Will reclone the current project. By doing so, we will sync the most recent changes
function recloneProject(remote = 'origin') {
  const proceed = ReadlineSync.keyInYN([
    '⚠ Warning ⚠',
    'Recloning will sync your project with the most recent changes but will discard',
    'the current git-state completely. Are you sure you would like to proceed?',
  ].join('\n'))

  if (!proceed) { return }

  const url = Git(['remote', 'get-url', remote])
  Fs.removeSync(Utils.cwd())
  cloneProject(url, Utils.cwd())
}

// Will force push our changes to the provided remote, including branches and tags
function pushChanges(remote = 'origin') {
  const proceed = ReadlineSync.keyInYN([
    '⚠ Warning ⚠',
    'Pushing your changes will override the entire hosted project.',
    'Are you sure you would like to proceed?',
  ].join('\n'))

  if (!proceed) { return }

  Git.print(['push', remote, '--mirror'])
}

function overwriteTemplateFile(path, scope) {
  const templateContent = Fs.readFileSync(path, 'utf8');
  const viewContent = Handlebars.compile(templateContent)(scope);

  Fs.writeFileSync(path, viewContent);
}

export const Essentials = {
  clone: cloneProject,
  reclone: recloneProject,
  create: createProject,
  ensure: ensureTortilla,
  push: pushChanges,
};
