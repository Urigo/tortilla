var Fs = require('fs');
var Path = require('path');
var Handlebars = require('handlebars');
var Paths = require('../paths');

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
    // If a string was not return let hadnlebars handle it
    if (typeof out != 'string') return out;

    // Building parameters string including name e.g. 'diff_step 1.1'
    var params = [].slice.call(arguments, 0, arguments.length - 1);
    params.unshift(name);
    params = params.join(' ');

    return [
      '[{]: <helper> (' + params + ')', out, '[}]: #'
    ].join('\n');
  }

  return Handlebars.registerHelper(name, wrappedHelper);
}

// Partials registered using this function will be wrapped by
// [{]: <helper> (name ...params) ... [}]: #
Handlebars.registerMDPartial = function (name, partial) {
  var wrappedPartial = [
    '[{]: <partial> (' + name + ')', partial, '[}]: #'
  ].join('\n');

  return Handlebars.registerPartial(name, wrappedPartial);
}

// Renders a given template with the given model. Usually it is better to read all
// the templates once and hold it in memory, but since the process relaunches itself
// and we end up reading only one template, it would be unnecessary to load the rest
// of the templates, hence this method was created
Handlebars.render = function(templateName, model) {
  templateName = templateName + '-template.md'
  model = model || {};

  var templatePath = Path.resolve(Paths.tortilla.templates, templateName);
  var template = Fs.readFileSync(templatePath, 'utf8');

  return Handlebars.compile(template)(model);
}


module.exports = Handlebars;

// Custom helpers and partials
require('./diff-step-helper');
require('./nav-step-helper');
