var Handlebars = require('handlebars');

/*
  Exports Handlebars with custom extensions. In addition, all the necessary helpers and
  partials will be loaded as well once this module is being imported.
 */

// Helpers registered using this function will be wrapped by
// [{]: <helper> (name ...params) ... [}]: #
Handlebars.registerMDHelper = function (name, helper) {
  var wrappedHelper = function() {
    // Invoke original helper
    var out = helper.apply(null, arguments);
    // If a string was not return let hadnlebars handle the error
    if (typeof out != 'string') return out;

    // Building parameters string including name e.g. 'diff_step 1.1'
    var params = [].slice.call(arguments, 0, arguments.length - 1);
    params.unshift(name);
    params = params.join(' ');

    return [
      '[{}]: <helper> (' + params + ')', out, '[}]: #'
    ].join('\n');
  }

  return Handlebars.registerHelper(name, wrappedHelper);
}

// Partials registered using this function will be wrapped by
// [{]: <helper> (name ...params) ... [}]: #
Handlebars.registerMDPartial = function (name, partial) {
  var wrappedPartial = [
    '[{}]: <partial> (' + name + ')', partial, '[}]: #'
  ].join('\n');

  return Handlebars.registerPartial(name, wrappedPartial);
}


module.exports = Handlebars;

// Custom helpers and partials
require('./diff-step-helper');
