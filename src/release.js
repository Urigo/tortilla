var Git = require('./git');
var Utils = require('./utils');

/*
  The 'release' module contains different utilities and methods which are responsible
  for release management. Before invoking any method, be sure to fetch **all** the step
  tags from the git-host, since most calculations are based on them.
 */

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

  // Create root tag along with the provided message, if at all
  if (options.message)
    Git.print(['tag', 'root@' + formattedRelease, 'root', '-m', options.message]);
  // Otherwise, open the editor
  else
    Git.print(['tag', 'root@' + formattedRelease, '-a']);

  superTags.forEach(function (superTag) {
    Git.print(['tag', superTag + '@' + formattedRelease, superTag]);
  });

  console.log(formattedRelease);
}

// Gets the current release based on the latest root tag
// e.g. if we have the tags 'root@0.0.1', 'root@0.0.2' and 'root@0.1.0' this method
// will return { major: 0, minor: 1, patch: 0 }
function getCurrentRelease() {
  var releases = Git(['tag', '-l', 'root*'])
    // Put tags into an array
    .split('\n')
    // If no tags found, filter the empty string
    .filter(Boolean)
    // Filter all the root tags which are proceeded by their release
    .filter(function (tagName) {
      return tagName.match(/^root@/);
    })
    // Map all the release strings
    .map(function (tagName) {
      return tagName.match(/^root@(.+)$/)[1];
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

  // If release was yet to be released, assume this is a null release
  return releases[0] || {
    major: 0,
    minor: 0,
    patch: 0
  };
}

// Invokes 'git diff' with the given releases. An additional arguments vector which will
// be invoked as is may be provided
function diffRelease(sourceRelease, destinationRelease, argv) {
  argv = argv || [];
  var srouceTag = getHeadRelease(sourceRelease);
  var destinationTag = getHeadRelease(destinationRelease);

  Git.print(['diff', srouceTag, destinationTag].concat(argv));
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

// Gets the latest step tag for the given release string
// e.g. given a release string of 1.0.0, and assuming that we have the tags 'root@1.0.0',
// 'step1@1.0.0' and 'step2@1.0.0' the returned value would be 'step2@1.0.0'
function getHeadRelease(releaseString) {
  var stepTags = Git(['tag', '-l', 'step*@' + sourceRelease])
    // Put tags into an array
    .split('\n')
    // If no tags found, filter the empty string
    .filter(Boolean)
    // Pluck the number of each step
    .map(function (stepTag) {
      return stepTag.match(/^step(\d+)/)[1];
    })
    // Map all step numbers to numbers
    .map(Number)
    // Put the latest step first
    .sort(function (a, b) {
      return b - a;
    });

  // If there are no step tags, assume 'root' is the head of the release
  return stepTags[0] || 'root@' + releaseString;
}


module.exports = {
  bump: bumpRelease,
  current: getCurrentRelease,
  diff: diffRelease,
  format: formatRelease,
  deformat: deformatRelease,
  head: getHeadRelease
};