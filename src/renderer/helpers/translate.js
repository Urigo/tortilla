var Renderer = require('..');
var Translator = require('../../translator');
var Utils = require('../../utils');

/**
  A translation helper function which can be used inside handle bars templates
 */

var t = Translator.translate.bind(Translator);


Renderer.registerHelper('t', function (path, options) {
  var options = Utils.extend({}, this, options.hash);

  var translation =  t(path, options);

  if (options.postT) {
    translation = translation[options.postT]();
  }

  return translation;
});
