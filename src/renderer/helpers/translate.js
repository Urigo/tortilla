var Renderer = require('..');
var Translator = require('../../translator');
var Utils = require('../../utils');


var t = Translator.translate.bind(Translator);


Renderer.registerHelper('t', function (path, options) {
  var options = Utils.extend({}, this, options.hash);

  return t(path, options);
});
