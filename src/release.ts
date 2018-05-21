import * as Fs from 'fs-extra';
import * as Path from 'path';
import * as Tmp from 'tmp';
import { Git } from './git';
import { localStorage as LocalStorage } from './local-storage';
import { Manual } from './manual';
import { Paths, resolveProject } from './paths';
import { prompt } from './prompt';
import { Step } from './step';
import { Submodule } from './submodule';
import { Utils } from './utils';

/**
 The 'release' module contains different utilities and methods which are responsible
 for release management. Before invoking any method, be sure to fetch **all** the step
 tags from the git-host, since most calculations are based on them.
 */

const tmp1Dir = Tmp.dirSync({ unsafeCleanup: true });
const tmp2Dir = Tmp.dirSync({ unsafeCleanup: true });

async function promptForGitRevision(submoduleName, submodulePath) {
  const mostRecentCommit = Git.recentCommit(null, '--format="oneline"', null, submodulePath);
  const answer = await prompt([
    {
      type: 'list',
      name: 'update-module',
      message: `Submodule '${submoduleName}' is pointing to the following commit: ${mostRecentCommit}, is that correct?`,
      choices: [
        { name: `Yes, it's the correct commit!`, value: 'yes' },
        { name: `No - I need to make sure some things before releasing`, value: 'exit' },
        { name: `No - I need to update this submodule to the latest commit`, value: 'update' },
      ],
      default: 'yes',
    },
  ]);

  if (answer === 'yes') {
    const commitId = Git.recentCommit(null, '--format="%H"', null, submodulePath);

    return {
      [submodulePath]: { gitRevision: commitId },
    };
  } else if (answer === 'exit') {
    return null;
  } else if (answer === 'update') {
    console.log(`🔃 Updating submodule ${submoduleName}...`);
    Submodule.update([submodulePath]);

    return promptForGitRevision(submoduleName, submodulePath);
  }
}

async function promptAndHandleSubmodules(listSubmodules) {
  console.log(`ℹ️ Found total of ${listSubmodules.length} submodules.`);
  console.log(`❗ Note that you need to make sure your submodules are pointing the correct versions:`);
  console.log(`\t- If your submodule is a Tortilla project, make sure to release a new version there.`);
  console.log(`\t- If your submodule is NOT a Tortilla project, make sure it's updated and pointing to the correct Git revision.\n`);

  let modulesToVersionsMap: any = {};

  for (const submodulePath of listSubmodules) {
    const fullPath = Path.resolve(Utils.cwd(), submodulePath);
    const isTortillaProject = Utils.exists(resolveProject(fullPath).tortillaDir);
    const submoduleName = Path.basename(submodulePath);

    if (isTortillaProject) {
      const allReleases = getAllReleasesOfAllBranches(fullPath);

      if (allReleases.length === 0) {
        console.log(`🛑 Found a Tortilla project submodule: '${submoduleName}', but there are no Tortilla releases!`);
        console.log(`Please make sure to release a version with Tortilla, and then try again`);

        return null;
      } else {
        const answer = await prompt([
          {
            type: 'list',
            name: submodulePath,
            message: `Submodule '${submoduleName}' is a valid Tortilla project. Please pick a release from the list:`,
            choices: allReleases.map(releaseInfo => releaseInfo.tagName),
          },
        ]);

        modulesToVersionsMap = {
          ...(modulesToVersionsMap || {}),
          [fullPath]: { tortillaVersion: answer },
        };
      }
    } else {
      const result = await promptForGitRevision(submoduleName, fullPath);

      if (result === null) {
        return null;
      }

      modulesToVersionsMap = {
        ...modulesToVersionsMap,
        ...result,
      };
    }
  }

  return modulesToVersionsMap;
}

// Creates a bumped release tag of the provided type
// e.g. if the current release is @1.0.0 and we provide this function with a release type
// of 'patch', the new release would be @1.0.1
async function bumpRelease(releaseType, options) {
  options = options || {};

  const currentRelease = getCurrentRelease();

  // Increase release type
  switch (releaseType) {
    case 'major':
      currentRelease.major++;
      currentRelease.minor = 0;
      currentRelease.patch = 0;
      break;
    case 'minor':
      currentRelease.minor++;
      currentRelease.patch = 0;
      break;
    case 'patch':
      currentRelease.patch++;
      break;
    default:
      throw Error('Provided release type must be one of "major", "minor" or "patch"');
  }

  const listSubmodules = Submodule.list();

  let submodulesRevisions: { [submoduleName: string]: string } = {};
  const hasSubmodules = listSubmodules.length > 0;

  if (hasSubmodules) {
    submodulesRevisions = await promptAndHandleSubmodules(listSubmodules);

    if (!submodulesRevisions || Object.keys(submodulesRevisions).length !== listSubmodules.length) {
      throw new Error(`Unexpected submodules versions results!`);
    } else {
      for (const [submodulePath, revisionChoice] of Object.entries<any>(submodulesRevisions)) {
        if (revisionChoice && revisionChoice.tortillaVersion) {
          console.log(`▶️ Checking out "${revisionChoice.tortillaVersion}" in Tortilla submodule "${Path.basename(submodulePath)}"...`);
          Git(['checkout', revisionChoice.tortillaVersion], { cwd: submodulePath });
        } else if (revisionChoice && revisionChoice.gitRevision) {
          console.log(`▶️ Checking out "${revisionChoice.gitRevision}" in submodule "${Path.basename(submodulePath)}"...`);
          Git(['checkout', revisionChoice.gitRevision], { cwd: submodulePath });
        }
      }
    }
  }

  try {
    // Store potential release so it can be used during rendering
    LocalStorage.setItem('POTENTIAL_RELEASE', JSON.stringify(currentRelease));
    // Render manuals before bumping version to make sure the views are correlated with
    // the templates
    Manual.render('all');
  } finally {
    LocalStorage.removeItem('POTENTIAL_RELEASE');
  }

  const branch = Git.activeBranchName();
  // The formatted release e.g. 1.0.0
  const formattedRelease = formatRelease(currentRelease);

  // Extract root data
  const rootHash = Git.rootHash();
  const rootTag = [branch, 'root', formattedRelease].join('@');

  // Create root tag
  // e.g. master@root@1.0.1
  createReleaseTag(rootTag, rootHash);

  // Create a release tag for each super step
  Git([
    // Log commits
    'log',
    // Specifically for steps
    '--grep', '^Step [0-9]\\+:',
    // Formatted with their subject followed by their hash
    '--format=%s %H',
  ]).split('\n')
    .filter(Boolean)
    .forEach((line) => {
      // Extract data
      const words = line.split(' ');
      const hash = words.pop();
      const subject = words.join(' ');
      const descriptor = Step.descriptor(subject);
      const currentTag = [branch, `step${descriptor.number}`, formattedRelease].join('@');

      // Create tag
      // e.g. master@step1@1.0.1
      createReleaseTag(currentTag, hash);
    });

  const tag = `${branch}@${formattedRelease}`;

  // Create a tag with the provided message which will reference to HEAD
  // e.g. 'master@1.0.1'
  if (options.message) {
    createReleaseTag(tag, 'HEAD', options.message);
    // If no message provided, open the editor
  } else {
    createReleaseTag(tag, 'HEAD', true);
  }

  createDiffReleasesBranch();
  printCurrentRelease();
}

// Creates a branch that represents a list of our releases, this way we can view any
// diff combination in the git-host
function createDiffReleasesBranch() {
  const destinationDir = createDiffReleasesRepo();
  const sourceDir = destinationDir === tmp1Dir.name ? tmp2Dir.name : tmp1Dir.name;

  // e.g. master
  const currBranch = Git.activeBranchName();
  // e.g. master-history
  const historyBranch = `${currBranch}-history`;

  // Make sure source is empty
  Fs.emptyDirSync(sourceDir);

  // Create dummy repo in source
  Git(['init', sourceDir, '--bare']);
  Git(['checkout', '-b', historyBranch], { cwd: destinationDir });
  Git(['push', sourceDir, historyBranch], { cwd: destinationDir });

  // Pull the newly created project to the branch name above
  if (Git.tagExists(historyBranch)) {
    Git(['branch', '-D', historyBranch]);
  }
  Git(['fetch', sourceDir, historyBranch]);
  Git(['branch', historyBranch, 'FETCH_HEAD']);

  // Clear registers
  tmp1Dir.removeCallback();
  tmp2Dir.removeCallback();
}

// Invokes 'git diff' with the given releases. An additional arguments vector which will
// be invoked as is may be provided
function diffRelease(
  sourceRelease?: string,
  destinationRelease: string,
  argv?: string[],
  options: {
    branch?: string,
    pipe?: boolean
  } = {}
 ) {
  // Will work even if null
  argv = argv || [];

  // Will assume that we would like to run diff with the most recent release
  if (!destinationRelease) {
    const releases = getAllReleases().map(formatRelease);
    const destinationIndex = releases.indexOf(sourceRelease) + 1;

    destinationRelease = releases[destinationIndex];
  }

  const branch = options.branch || Git.activeBranchName();
  // Compose tags
  // If release ain't exist we will print the entire changes
  const sourceReleaseTag = sourceRelease && `${branch}@${sourceRelease}`;
  const destinationReleaseTag = `${branch}@${destinationRelease}`;
  // Create repo
  const sourceDir = createDiffReleasesRepo(sourceReleaseTag, destinationReleaseTag);

  const gitOptions = {
    cwd: sourceDir,
    stdio: options.pipe ? 'pipe' : 'inherit'
  };

  let result
  if (sourceReleaseTag) {
    // Run 'diff' between the newly created commits
    result = Git.print(['diff', 'HEAD^', 'HEAD'].concat(argv), gitOptions);
  } else {
    // Run so called 'diff' between HEAD and --root. A normal diff won't work here
    result = Git.print(['show', '--format='].concat(argv), gitOptions);
  }

  // Clear registers
  tmp1Dir.removeCallback();
  tmp2Dir.removeCallback();

  // If the right arguments were specified we could receive the diff as a string
  return result.output && result.output.join('');
}

// Creates the releases diff repo in a temporary dir. The result will be a path for the
// newly created repo
function createDiffReleasesRepo(...tags) {
  if (tags.length === 0) {
    const branch = Git.activeBranchName();

    // Fetch all releases in reversed order, since the commits are going to be stacked
    // in the opposite order
    tags = getAllReleases()
      .map(formatRelease)
      .reverse()
      .map((releaseString) => `${branch}@${releaseString}`);
  } else {
    // Sometimes an empty argument might be provided e.g. diffRelease() method
    tags = tags.filter(Boolean);
  }

  // The 'registers' are directories which will be used for temporary FS calculations
  let destinationDir = tmp1Dir.name;
  let sourceDir = tmp2Dir.name;

  // Make sure register2 is empty
  Fs.emptyDirSync(sourceDir);

  // Initialize an empty git repo in register2
  Git(['init'], { cwd: sourceDir });

  // Start building the diff-branch by stacking releases on top of each-other
  return tags.reduce((registers, tag, index) => {
    sourceDir = registers[0];
    destinationDir = registers[1];
    const sourcePaths = Paths.resolveProject(sourceDir);
    const destinationPaths = Paths.resolveProject(destinationDir);

    // Make sure destination is empty
    Fs.emptyDirSync(destinationDir);

    // Copy current git dir to destination
    Fs.copySync(Paths.git.resolve(), destinationPaths.git.resolve(), {
      filter(filePath) {
        return filePath.split('/').indexOf('.tortilla') === -1;
      },
    });

    // Checkout release
    Git(['checkout', tag], { cwd: destinationDir });
    Git(['checkout', '.'], { cwd: destinationDir });

    // Copy destination to source, but without the git dir so there won't be any
    // conflicts with the commits
    Fs.removeSync(destinationPaths.git.resolve());
    Fs.copySync(sourcePaths.git.resolve(), destinationPaths.git.resolve());

    // Add commit for release
    Git(['add', '.'], { cwd: destinationDir });
    Git(['add', '-u'], { cwd: destinationDir });

    // Extracting tag message
    const tagLine = Git(['tag', '-l', tag, '-n99']);
    const tagMessage = tagLine.replace(/([^\s]+)\s+((?:.|\n)+)/, '$1: $2');

    // Creating a new commit with the tag's message
    Git(['commit', '-m', tagMessage, '--allow-empty'], {
      cwd: destinationDir,
    });

    return registers.reverse();
  }, [
    sourceDir, destinationDir,
  ]).shift();
}

function printCurrentRelease() {
  const currentRelease = getCurrentRelease();
  const formattedRelease = formatRelease(currentRelease);
  const branch = Git.activeBranchName();

  console.log();
  console.log(`🌟 Release: ${formattedRelease}`);
  console.log(`🌟 Branch:  ${branch}`);
  console.log();
}

// Gets the current release based on the latest release tag
// e.g. if we have the tags 'master@0.0.1', 'master@0.0.2' and 'master@0.1.0' this method
// will return { major: 0, minor: 1, patch: 0 }
function getCurrentRelease() {
  // Return potential release, if defined
  const potentialRelease = LocalStorage.getItem('POTENTIAL_RELEASE');

  if (potentialRelease) {
    return JSON.parse(potentialRelease);
  }

  // If release was yet to be released, assume this is a null release
  return getAllReleases()[0] || {
    major: 0,
    minor: 0,
    patch: 0,
  };
}

function getAllReleasesOfAllBranches(path = null) {
  return Git(['tag'], path ? { cwd: path } : null)
  // Put tags into an array
    .split('\n')
    // If no tags found, filter the empty string
    .filter(Boolean)
    // Filter all the release tags which are proceeded by their release
    .filter((tagName) => {
      const pattern = /^[^@]+@\d+\.\d+\.\d+$/;

      return tagName.match(pattern);
    })
    // Map all the release strings
    .map((tagName) => {
      const splitted = tagName.split('@');

      return {
        tagName,
        deformatted: deformatRelease(splitted[1]),
      };
    })
    // Put the latest release first
    .sort((a, b) => (
      (b.deformatted.major - a.deformatted.major) ||
      (b.deformatted.minor - a.deformatted.minor) ||
      (b.deformatted.patch - a.deformatted.patch)
    ));
}

// Gets a list of all the releases represented as JSONs e.g.
// [{ major: 0, minor: 1, patch: 0 }]
function getAllReleases(path = null) {
  const branch = Git.activeBranchName(path);

  return Git(['tag'], path ? { cwd: path } : null)
  // Put tags into an array
    .split('\n')
    // If no tags found, filter the empty string
    .filter(Boolean)
    // Filter all the release tags which are proceeded by their release
    .filter((tagName) => {
      const pattern = new RegExp(`${branch}@\\d+\\.\\d+\\.\\d+`);

      return tagName.match(pattern);
    })
    // Map all the release strings
    .map((tagName) => tagName.split('@').pop())
    // Deformat all the releases into a json so it would be more comfortable to work with
    .map((releaseString) => deformatRelease(releaseString))
    // Put the latest release first
    .sort((a, b) => (
      (b.major - a.major) ||
      (b.minor - a.minor) ||
      (b.patch - a.patch)
    ));
}

// Takes a release json and puts it into a pretty string
// e.g. { major: 1, minor: 1, patch: 1 } -> '1.1.1'
function formatRelease(releaseJson) {
  return [
    releaseJson.major,
    releaseJson.minor,
    releaseJson.patch,
  ].join('.');
}

// Takes a release string and puts it into a pretty json object
// e.g. '1.1.1' -> { major: 1, minor: 1, patch: 1 }
function deformatRelease(releaseString) {
  const releaseSlices = releaseString.split('.').map(Number);

  return {
    major: releaseSlices[0],
    minor: releaseSlices[1],
    patch: releaseSlices[2],
  };
}

function createReleaseTag(tag, dstHash, message?) {
  let srcHash = Git.activeBranchName();
  if (srcHash === 'HEAD') {
    srcHash = Git(['rev-parse', 'HEAD']);
  }

  Git(['checkout', dstHash]);

  // Remove files which shouldn't be included in releases
  // TODO: Remove files based on a user defined blacklist
  Fs.removeSync(Paths.travis);
  Fs.removeSync(Paths.renovate);

  // Releasing a version
  Git.print(['commit', '--amend'], { env: { GIT_EDITOR: true } });

  // Provide a quick message
  if (typeof message === 'string') {
    Git.print(['tag', tag, '-m', message]);
    // Open editor
  } else if (message === true) {
    Git.print(['tag', tag, '-a']);
    // No message
  } else {
    Git(['tag', tag]);
  }

  // Returning to the original hash
  Git(['checkout', srcHash]);
  // Restore renovate.json and .travis.yml
  Git(['checkout', '.']);
}

export const Release = {
  bump: bumpRelease,
  createDiffBranch: createDiffReleasesBranch,
  printCurrent: printCurrentRelease,
  current: getCurrentRelease,
  all: getAllReleases,
  diff: diffRelease,
  format: formatRelease,
  deformat: deformatRelease,
};
