var LocalStorage = require('node-localstorage').LocalStorage;
var Paths = require('./paths');


module.exports = new LocalStorage(Paths.git);