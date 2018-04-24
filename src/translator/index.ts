import * as i18n from 'i18next';
import * as Path from 'path';
import { Paths } from '../paths';
import { Utils } from '../utils';
import { Translation } from './translation';

const superTranslate = i18n.t.bind(i18n);

i18n.init({
  lng: 'en',
  initImmediate: true,
  resources: {
    en: { translation: getTranslationResource('en') },
    he: { translation: getTranslationResource('he') },
  },
});

// Gets a locale and returns the full resource object
function getTranslationResource(locale) {
  let paths: any = Paths;

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
      // nothing to do here...
    }

    return resource;
  }, {});
}

// Returns i18n translation wrapped with some extra functionality
function translate(...args) {
  const result = superTranslate(...args);

  return result && new Translation(result);
}

// Any translation would be done using the provided locale
function scopeLanguage(language, fn) {
  if (!language) {
    return fn();
  }

  const oldLanguage = (i18n as any).translator.language;

  try {
    (i18n as any).translator.changeLanguage(language);
    fn();
  } finally {
    (i18n as any).translator.changeLanguage(oldLanguage);
  }
}

// Shallow cloning i18n so it won't be changed
export const Translator = Utils.extend(i18n, {
  translate,
  scopeLanguage,
});
