const Fs = require('fs-extra');
const Path = require('path');
const Git = require('./git');
const Manual = require('./manual');
const Paths = require('./paths');
const Step = require('./step');
const Utils = require('./utils');

/**
  This module contains package.json related methods
 */

// Updates all the dependencies in the package.json file based on a provided manifest.
// If no manifest was provided an editor will be provided where we will be able to create
// the manifest on the run. Rebase conflicts will be resolved automatically
function updateDependencies(updatedDeps) {
  if (updatedDeps) {
    if (!(updatedDeps instanceof Object)) {
      throw TypeError('New dependencies must be described using an object');
    }
  }
  else {
    const pack = Fs.readJsonSync(Paths.npm.package);

    const deps = Object.assign({},
      pack.dependencies,
      pack.devDependencies,
      pack.peerDependencies
    );

    const versionColumn = Object.keys(deps).reduce((depLength, dep) => {
      return depLength < dep.length ? dep.length : depLength;
    }, 0);

    let initialContent =
      "# Please pick the new versions of the project's dependencies\n\n";

    initialContent += Object.keys(deps).sort().map((dep) => {
      return `${Utils.padRight(dep, versionColumn)} ${deps[dep]}`;
    }).join('\n');

    const editedContent = Git.edit(initialContent);

    if (initialContent == editedContent) return;

    updatedDeps = editedContent
      .trim()
      .replace(/# .+/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split(/\s+/))
      .reduce((updatedDeps, [dep, version]) => {
        updatedDeps[dep] = version;
        return updatedDeps;
      }, {});
  }

  const packSteps = Git([
    'log',
    '--format=%s',
    '--grep=^Step [0-9]\\+',
    '--',
    Paths.npm.package,
  ]).split('\n')
    .filter(Boolean)
    .map(line => Step.descriptor(line).number);

  const minPackSuperStep = Math.min.apply(Math, packSteps).toFixed();

  const missingSuperSteps = Git([
    'log',
    '--format=%s',
    '--grep=^Step [0-9]\\+:',
  ]).split('\n')
    .filter(Boolean)
    .map(line => Step.descriptor(line).number.toString())
    .filter(step => !packSteps.includes(step))
    .filter(step => step >= minPackSuperStep);

  const steps = []
    .concat(packSteps)
    .concat(missingSuperSteps);

  // Checking if the root commit has affected the package.json, since it has been
  // filtered in the last operation
  const shouldEditRoot = Git([
    'diff-tree', '--no-commit-id', '--name-only', '-r', Git.rootHash()
  ]).includes('package.json');

  if (shouldEditRoot) {
    steps.push('root');
  }

  Step.edit(steps);

  while (Git.rebasing()) {
    // Reading package.json content and ensuring it's formatted correctly
    let packContent = Fs.readFileSync(Paths.npm.package).toString();
    // Plucking indention
    let indent = packContent.match(/\{\n([^"]+)/) || [];
    // Default indention
    indent = indent[1] || '\s\s';

    let headPackContent = currPackContent = packContent;
    // Keep replacing conflict notations until we get both unresolved versions
    for (
      let newHeadPackContent, newCurrPackContent;
      newHeadPackContent != headPackContent &&
      newCurrPackContent != currPackContent;
      newHeadPackContent = headPackContent.replace(Git.conflict, '$1'),
      newCurrPackContent = currPackContent.replace(Git.conflict, '$2')
    ) {
      // Force initialization
      if (!newHeadPackContent || !newCurrPackContent) continue;

      headPackContent = newHeadPackContent;
      currPackContent = newCurrPackContent;
    }

    const headPack = JSON.parse(headPackContent);
    const currPack = JSON.parse(currPackContent);
    const depsTypes = ['dependencies', 'devDependencies', 'peerDependencies'];

    // We have some conflicts to resolve
    if (headPackContent != currPackContent) {
      // Picking the updated dependencies versions
      depsTypes.forEach((depsType) => {
        if (!currPack[depsType]) return;

        Object.keys(headPack[depsType]).forEach((dep) => {
          if (currPack[depsType][dep]) {
            currPack[depsType][dep] = headPack[depsType][dep];
          }
        });
      });
    }

    // Running a second update based on the provided manifest
    Object.keys(updatedDeps).forEach((dep) => {
      // Picking the updated dependencies versions
      depsTypes.forEach((depsType) => {
        if (!currPack[depsType]) return;

        Object.keys(updatedDeps).forEach((dep) => {
          if (currPack[depsType][dep]) {
            currPack[depsType][dep] = updatedDeps[dep];
          }
        });
      });
    });

    Fs.writeFileSync(Paths.npm.package, JSON.stringify(currPack, null, indent));

    Git.print(['add', Paths.npm.package]);
    Git.print(['commit', '--amend'], { env: { GIT_EDITOR: true } });

    // If this is root commit or a super-step, re-render the correlated manual
    const commitMsg = Git.recentCommit(['--format=%s']);
    const isSuperStep = !!Step.superDescriptor(commitMsg);

    if (isSuperStep) {
      Manual.render();
    }

    try {
      Git.print(['rebase', '--continue']);
    }
    // Will stop here if there was a conflict
    catch (e) {
      const modifiedFiles = Git(['diff', '--name-only'])
        .split('\n')
        .filter(Boolean);

      // Checking if only package.json is both modified
      const expectedConflict = modifiedFiles.length == 2 && modifiedFiles.every((file) => {
        return file == 'package.json';
      });

      if (!expectedConflict) throw e;
    }
  }
}

module.exports = {
  updateDependencies,
};
