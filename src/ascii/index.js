const Fs = require('fs-extra');
const Path = require('path');
const Paths = require('../paths');

/**
  Responsible for printing ascii art files
 */

// Get string for provided ascii art name
function getAsciiArt(artName) {
  const artFile = `${artName}.txt`;
  const artPath = Path.resolve(Paths.tortilla.ascii.views, artFile);
  return Fs.readFileSync(artPath).toString();
}

// Print for provided ascii art
function printAsciiArt(artName) {
  console.log(getAsciiArt(artName));
}


module.exports = {
  get: getAsciiArt,
  print: printAsciiArt,
};
