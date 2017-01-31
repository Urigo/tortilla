var Fs = require('fs-extra');
var Path = require('path');
var Git = require('./git');
var Paths = require('./paths');
var Utils = require('./utils');

/*
  The 'release' module contains different utilities and methods which are responsible
  for release management. Before invoking any method, be sure to fetch **all** the step
  tags from the git-host, since most calculations are based on them.
 */

var register1Dir = '/tmp/tortilla_register1';
var register2Dir = '/tmp/tortilla_register2';


// Creates a bumped release tag of the provided type
// e.g. if the current release is @1.0.0 and we provide this function with a release type
// of 'patch', the new release would be @1.0.1
function bumpRelease(releaseType, options) {
  options = options || {};
  var currentRelease = getCurrentRelease();

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

  // The formatted release e.g. '1.0.0'
  var formattedRelease = formatRelease(currentRelease);

  var superTags = Git(['tag', '-l', 'step*'])
    // Put tags into an array
    .split('\n')
    // If no tags found, filter the empty string
    .filter(Boolean)
    // We want to avoid release tags e.g. 'step1@@1.0.0'
    .filter(function (tagName) {
      return tagName.match(/^step\d+$/);
    });

  Git(['tag', 'root@' + formattedRelease, 'root']);

  superTags.forEach(function (superTag) {
    Git(['tag', superTag + '@' + formattedRelease, superTag]);
  });

  // Create a tag with the provided message which will reference to HEAD
  // e.g. 'release@1.0.0'
  if (options.message)
    Git.print(['tag', 'release@' + formattedRelease, 'HEAD', '-m', options.message]);
  // If no message provided, open the editor
  else
    Git.print(['tag', 'release@' + formattedRelease, 'HEAD', '-a']);

  createDiffReleasesBranch();

  console.log(formattedRelease);
}

// Creates a branch that represents a list of our releases, this way we can view any
// diff combination in the git-host
function createDiffReleasesBranch() {
  var destinationDir = createDiffReleasesRepo();
  var sourceDir = destinationDir == register1Dir ? register2Dir : register1Dir;

  var branchName = 'diff/releases';

  // Make sure source is empty
  Fs.emptyDirSync(sourceDir);

  // Create dummy repo in source
  Git(['init', sourceDir, '--bare']);
  Git(['checkout', '-b', branchName], { cwd: destinationDir });
  Git(['push', sourceDir, branchName], { cwd: destinationDir });

  // Pull the newly created project to the branch name above
  if (Git.tagExists(branchName)) Git(['branch', '-D', branchName]);
  Git(['fetch', sourceDir, branchName]);
  Git(['branch', branchName, 'FETCH_HEAD']);

  // Clear registers
  Fs.removeSync(register1Dir);
  Fs.removeSync(register2Dir);
}

// Invokes 'git diff' with the given releases. An additional arguments vector which will
// be invoked as is may be provided
function diffRelease(sourceRelease, destinationRelease, argv) {
  argv = argv || [];

  var destinationDir = createDiffReleasesRepo([sourceRelease, destinationRelease]);

  // Run 'diff' between the newly created commits
  Git.print(['diff', 'HEAD^', 'HEAD'].concat(argv), { cwd: destinationDir });

  // Clear registers
  Fs.removeSync(register1Dir);
  Fs.removeSync(register2Dir);
}

// Creates the releases diff repo in a temporary dir. The result will be a path for the
// newly created repo
function createDiffReleasesRepo(releases) {
  // Fetch all releases in reversed order, since the commits are going to be stacked
  // in the opposite order
  releases = releases || getAllReleases()
    .map(formatRelease)
    .reverse();

  // Compose release tags
  var releaseTags = releases.map(function (releaseString) {
    return 'release@' + releaseString
  });

  // The 'registers' are directories which will be used for temporary FS calculations
  var destinationDir = register1Dir;
  var sourceDir = register2Dir;

  // Make sure register2 is empty
  Fs.emptyDirSync(sourceDir);

  // Initialize an empty git repo in register2
  Git(['init'], { cwd: sourceDir });

  // Start building the diff-branch by stacking releases on top of each-other
  return releaseTags.reduce(function (registers, releaseTag, index) {
    var release = releases[index];

    sourceDir = registers[0];
    destinationDir = registers[1];
    sourcePaths = Paths.resolve(sourceDir);
    destinationPaths = Paths.resolve(destinationDir);

    // Make sure destination is empty
    Fs.emptyDirSync(destinationDir);

    // Copy current git dir to destination
    Fs.copySync(Paths.git._, destinationPaths.git._, {
      filter: function (filePath) {
        return filePath.split('/').indexOf('.tortilla') == -1;
      }
    });

    // Checkout release
    Git(['checkout', releaseTag], { cwd: destinationDir });
    Git(['checkout', '.'], { cwd: destinationDir });

    // Copy destination to source, but without the git dir so there won't be any
    // conflicts with the commits
    Fs.removeSync(destinationPaths.git._);
    Fs.copySync(sourcePaths.git._, destinationPaths.git._);

    // Add commit for release
    Git(['add', '.'], { cwd: destinationDir });
    Git(['add', '-u'], { cwd: destinationDir });
    Git(['commit', '-m', 'Release ' + release, '--allow-empty'], {
      cwd: destinationDir
    });

    return registers.reverse();
  }, [
    sourceDir, destinationDir
  ]).shift();
}

// Gets the current release based on the latest release tag
// e.g. if we have the tags 'release@0.0.1', 'release@0.0.2' and 'release@0.1.0' this method
// will return { major: 0, minor: 1, patch: 0 }
function getCurrentRelease() {
  // If release was yet to be released, assume this is a null release
  return getAllReleases()[0] || {
    major: 0,
    minor: 0,
    patch: 0
  };
}

// Gets a list of all the releases represented as JSONs e.g.
// [{ major: 0, minor: 1, patch: 0 }]
function getAllReleases() {
  return Git(['tag', '-l', 'release*'])
    // Put tags into an array
    .split('\n')
    // If no tags found, filter the empty string
    .filter(Boolean)
    // Filter all the release tags which are proceeded by their release
    .filter(function (tagName) {
      return tagName.match(/^release@/);
    })
    // Map all the release strings
    .map(function (tagName) {
      return tagName.match(/^release@(.+)$/)[1];
    })
    // Deformat all the releases into a json so it would be more comfortable to work with
    .map(function (releaseString) {
      return deformatRelease(releaseString);
    })
    // Put the latest release first
    .sort(function (a, b) {
      return (
        (b.major - a.major) ||
        (b.minor - a.minor) ||
        (b.patch - a.patch)
      );
    });
}

// Takes a release json and puts it into a pretty string
// e.g. { major: 1, minor: 1, patch: 1 } -> '1.1.1'
function formatRelease(releaseJson) {
  return [
    releaseJson.major,
    releaseJson.minor,
    releaseJson.patch
  ].join('.');
}

// Takes a release string and puts it into a pretty json object
// e.g. '1.1.1' -> { major: 1, minor: 1, patch: 1 }
function deformatRelease(releaseString) {
  var releaseSlices = releaseString.split('.').map(Number);

  return {
    major: releaseSlices[0],
    minor: releaseSlices[1],
    patch: releaseSlices[2]
  };
}


module.exports = {
  bump: bumpRelease,
  createDiffBranch: createDiffReleasesBranch,
  current: getCurrentRelease,
  all: getAllReleases,
  diff: diffRelease,
  format: formatRelease,
  deformat: deformatRelease
};