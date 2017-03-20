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
  paths = Paths;

  if (process.env.TORTILLA_CWD) {
    paths = Paths.resolveProject(process.env.TORTILLA_CWD);
  }

  paths = [
    // Static locales
    Path.resolve(paths.tortilla.translator.locales, locale + '.json'),
    // User defined locales
    Path.resolve(paths.locales, locale + '.json')
  ];

  // Unite all resources and return a single one
  return paths.reduce(function (resource, path) {
    // Clear cache so files can be properly reloaded
    try {
      delete require.cache[require.resolve(path)];
      var extension = require(path);
      Utils.merge(resource, extension);
    }
    catch (err) {
    }

    return resource;
  }, {});
}

// Returns i18n translation wrapped with some extra functionality
function translate() {
  var result = superTranslate.apply(null, arguments);

  return result && new Translation(result);
}

// Any translation would be done using the provided locale
function scopeLanguage(language, fn) {
  if (!language) return fn();

  var oldLanguage = i18n.translator.language;

  try {
    i18n.translator.changeLanguage(language);
    fn();
  }
  finally {
    i18n.translator.changeLanguage(oldLanguage);
  }
}


// Shallow cloning i18n so it won't be changed
module.exports = Utils.extend(i18n, {
  translate: translate,
  scopeLanguage: scopeLanguage
});
