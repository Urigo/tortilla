var LocalStorage = require('node-localstorage').LocalStorage;
var Path = require('path');


var gitDirPath = Path.resolve('../.git');


module.exports = new LocalStorage(gitDirPath);