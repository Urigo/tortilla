var Git = require('./git');
var Utils = require('./utils');


// Creates a bumped version tag of the provided type
// e.g. if the current version is v1.0.0 and we provide this function with a version type
// of 'patch', the new version would be v1.0.1
function bumpVersion(versionType, options) {
  options = options || {};
  var currentVersion = getCurrentVersion();

  // Increase version type
  switch (versionType) {
    case 'major': currentVersion.major++;
    case 'minor': currentVersion.minor++;
    case 'patch': currentVersion.patch++;
    default: throw Error(
      'Provided version type must be one of "major", "minor" or "patch"'
    );
  }

  // The formatted version e.g. 'v1.0.0'
  var formattedVersion = formatVersion(currentVersion);

  var superSteps = Git(['tag', '-l', 'step*'])
    // Put tags into an array
    .split('\n')
    // If no tags found, filter the empty string
    .filter(Boolean)
    // We want to avoid version tags e.g. 'step1v1.0.0'
    .filter(function (tagName) {
      return tagName.match(/^step\d+$/);
    })
    // Pluck all super step numbers
    .map(function (tagName) {
      return tagName.match(/^step(\d+)$/)[1];
    })
    // Convert all elements from strings to numbers
    .map(Number);

  // Create root tag along with the provided message, if at all
  if (options.message)
    Git.print(['tag', 'root' + formattedVersion, '-m', options.message]);
  // Otherwise, open the editor
  else
    Git.print(['tag', 'root' + formattedVersion, '-a']);

  superSteps.forEach(function (superStep) {
    Git(['tag', 'step' + superStep + formattedVersion]);
  });
}

function getCurrentVersion() {
  var versions = Git(['log', '-l', 'step*'])
    // Put tags into an array
    .split('\n')
    // If no tags found, filter the empty string
    .filter(Boolean)
    // Filter all the step tags which are proceeded by their version
    .filter(function (tagName) {
      return tagName.match(/^step\d+v/);
    })
    // Map all the version strings
    .map(function (tagName) {
      return tagName.match(/^step\d+v(.+)$/)[1];
    })
    // Deformat all the versions into a json so it would be more comfortable to work with
    .map(function (versionString) {
      return deformatVersion(versionString);
    })
    // Put the latest version first
    .sort(function (a, b) {
      return (
        (b.major - a.major) ||
        (b.minor - a.minor) ||
        (b.patch - a.patch)
      );
    });

  // If version was yet to be released, assume this is a null version
  return versions[0] || {
    major: 0,
    minor: 0,
    patch: 0
  };
}

// Takes a version json and puts it into a pretty string
// e.g. { major: 1, minor: 1, patch: 1 } -> 'v1.1.1'
function formatVersion(versionJson) {
  return 'v' + [
    versionJson.major,
    versionJson.minor,
    versionJson.patch
  ].join('.');
}

// Takes a version string and puts it into a pretty json object
// e.g. 'v1.1.1' -> { major: 1, minor: 1, patch: 1 }
function deformatVersion(versionString) {
  var versionMatches = versionString.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  // If the version string doesn't have the right format, abort
  if (!versionMatches) return;

  // Ignore the 'whole' match
  var versionSlices = versionMatches.slice(1);

  return {
    major: Number(versionSlices[0]),
    minor: Number(versionSlices[1]),
    patch: Number(versionSlices[2])
  };
}


module.exports = {
  bumb: bumbVersion,
  current: getCurrentVersion,
  format: formatVersion,
  deformat: deformatVersion
};