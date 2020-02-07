import i18next from 'i18next';
import * as Path from 'path';
import { Paths } from '../paths';
import { Utils } from '../utils';
import { Translation } from './translation';

// TODO: Convert to async functions/promises.

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
    Path.resolve(paths.locales, `${locale}.json`)
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

const superTranslate = i18next.t.bind(i18next);

// Returns i18n translation wrapped with some extra functionality
function translate(...args) {
  const result = superTranslate(...args);

  return result && new Translation(result);
}

// Any translation would be done using the provided locale
async function scopeLanguage(language, fn) {
  if (!language) {
    return fn();
  }

  const oldLanguage = i18next.language;

  try {
    await i18next.changeLanguage(language);
    fn();
  } finally {
    await i18next.changeLanguage(oldLanguage);
  }
}

export const Translator = Utils.extend(i18next, {
  translate,
  scopeLanguage
});

/**
 * Gets a cloned instance of the translator asynchronously.
 */

let translator = null;

export async function getTranslator() {
  i18next.isInitialized ||
    (await i18next.init({
      lng: 'en',
      initImmediate: false,
      resources: {
        en: { translation: getTranslationResource('en') },
        he: { translation: getTranslationResource('he') }
      }
    }));

  if (!translator) {
    translator = Utils.extend(i18next, { translate, scopeLanguage });
  }

  return translator;
}
