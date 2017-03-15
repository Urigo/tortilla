var i18n = require('i18next');
var Path = require('path');
var Paths = require('../paths');
var Utils = require('../utils');
var Translation = require('./translation');


var superTranslate = i18n.t.bind(i18n);


(function () {
  i18n.init({
    lng: 'en',
    initImmediate: true,
    resources: {
      en: { translation: getTranslationResource('en') },
      he: { translation: getTranslationResource('he') }
    }
  });
})();

// Gets a locale and returns the full resource object
function getTranslationResource(locale) {
  var paths = [
    // Static locales
    Path.resolve(Paths.tortilla.translator.locales, locale + '.json'),
    // User defined locales
    Path.resolve(Paths.locales, locale + '.json')
  ];

  // Unite all resources and return a single one
  return paths.reduce(function (resource, path) {
    // Will throw an error in case path doesn't exist
    try {
      var extension = require(path);
      Utils.extend(resource, extension);
    }
    catch (err) {
      // Ignore expected error
    }

    return resource
  }, {});
}

// Returns i18n translation wrapped with some extra functionality
function translate() {
  var result = superTranslate.apply(null, arguments);

  return new Translation(result);
}


// Shallow cloning i18n so it won't be changed
module.exports = Utils.extend({}, i18n, {
  translate: translate
});
