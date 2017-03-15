var i18n = require('i18next');
var Utils = require('../utils');
var Translation = require('./translation');


var superTranslate = i18n.t.bind(i18n);


(function () {
  i18n.init({
    lng: 'en',
    initImmediate: true,
    resources: {
      en: { translation: require('./locales/en.json') },
      he: { translation: require('./locales/he.json') }
    }
  });
})();

function translate() {
  var result = superTranslate.apply(null, arguments);

  return new Translation(result);
}


module.exports = Utils.extend({}, i18n, {
  t: translate
});
