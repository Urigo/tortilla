import { Renderer } from '../index';
import { Translator} from '../../translator';
import {Utils} from '../../utils';

/**
  A translation helper function which can be used inside handle bars templates
 */

const t = Translator.translate.bind(Translator);

Renderer.registerHelper('t', function (path, options) {
  options = Utils.extend({}, this, options.hash);

  let translation = t(path, options);

  if (options.postT) {
    translation = translation[options.postT]();
  }

  return translation;
});
