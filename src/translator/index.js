const i18n = require('i18next');
const Path = require('path');
const Paths = require('../paths');
const Utils = require('../utils');
const Translation = require('./translation');


const superTranslate = i18n.t.bind(i18n);


(function () {
  i18n.init({
    lng: 'en',
    initImmediate: true,
    resources: {
      en: { translation: getTranslationResource('en') },
      he: { translation: getTranslationResource('he') },
    },
  });
}());

// Gets a locale and returns the full resource object
function getTranslationResource(locale) {
  paths = Paths;

  if (process.env.TORTILLA_CWD) {
    paths = Paths.resolveProject(process.env.TORTILLA_CWD);
  }

  paths = [
    // Static locales
    Path.resolve(paths.tortilla.translator.locales, `${locale}.json`),
    // User defined locales
    Path.resolve(paths.locales, `${locale}.json`),
  ];

  // Unite all resources and return a single one
  return paths.reduce((resource, path) => {
    // Clear cache so files can be properly reloaded
    try {
      delete require.cache[require.resolve(path)];
      const extension = require(path);
      Utils.merge(resource, extension);
    } catch (err) {
    }

    return resource;
  }, {});
}

// Returns i18n translation wrapped with some extra functionality
function translate() {
  const result = superTranslate(...arguments);

  return result && new Translation(result);
}

// Any translation would be done using the provided locale
function scopeLanguage(language, fn) {
  if (!language) return fn();

  const oldLanguage = i18n.translator.language;

  try {
    i18n.translator.changeLanguage(language);
    fn();
  } finally {
    i18n.translator.changeLanguage(oldLanguage);
  }
}


// Shallow cloning i18n so it won't be changed
module.exports = Utils.extend(i18n, {
  translate,
  scopeLanguage,
});
