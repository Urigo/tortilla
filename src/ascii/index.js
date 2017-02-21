var Fs = require('fs-extra');
var Path = require('path');
var Paths = require('../paths');

/*
  Responsible for printing ascii art files
 */

// Get string for provided ascii art name
function getAsciiArt(artName) {
  var artFile = artName + '.txt';
  var artPath = Path.resolve(Paths.tortilla.ascii, artFile);
  return Fs.readFileSync(artPath).toString();
}

// Print for provided ascii art
function printAsciiArt(artName) {
  console.log(getAsciiArt(artName));
}


module.exports = {
  get: getAsciiArt,
  print: printAsciiArt
};