const Renderer = require('..');
const Translator = require('../../translator');
const Utils = require('../../utils');

/**
  A translation helper function which can be used inside handle bars templates
 */

const t = Translator.translate.bind(Translator);


Renderer.registerHelper('t', function (path, options) {
  var options = Utils.extend({}, this, options.hash);

  let translation = t(path, options);

  if (options.postT) {
    translation = translation[options.postT]();
  }

  return translation;
});
