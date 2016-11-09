var Fs = require('fs-extra');
var Path = require('path');
var Paths = require('../paths');
var MDComponent = require('../md-parser/md-component');

/*
  A very simple renderer which shares the same syntax as handlebar's when it comes to
  models, partials and helpers. Templates which are rendered using md-renderer will be
  parsable by md-parser.
 */

var helpers = {};
var partials = {};


// Read the provided file, render it, and overwrite it. Use with caution!
function overwriteTemplateFile(templatePath, scope) {
  templatePath = Path.resolve(Paths.tortilla.templates, templatePath);
  var view = renderTemplateFile(templatePath, scope);

  return Fs.writeFileSync(templatePath, view);
}

// Read provided file and render its template. Note that the default path would
// be tortilla's template dir, so specifying a file name would be ok as well
function renderTemplateFile(templatePath, scope) {
  templatePath = Path.resolve(Paths.tortilla.templates, templatePath);
  var template = Fs.readFileSync(templatePath, 'utf8');

  return renderTemplate(template, scope);
}

// Render provided template
function renderTemplate(template, scope) {
  scope = scope || {};

  // Replace notations with values. ORDER IS CRITIC!
  return template.replace(/\\?\{\{([^\}]+)\}\}\}?/g, function (match, content) {
    // Escape backslashes
    if (match[0] == '\\') return match.substr(1);

    // Helper
    if (content[0] == '{' && match[match.length - 1] == '}') {
      var params = content.substr(1).split(' ');
      var name = params.shift();
      return helpers[name].apply(scope, params);
    }
    // Partial
    if (content[0] == '>') {
      var name = content.substr(1);
      return renderTemplate(partials[name], scope);
    }

    // Model
    return scope[content] || '';
  });
}

// Register a new helper. Registered helpers will be wrapped with a
// [{]: <helper> (name ...params) [}]: #
function registerHelper(name, helper) {
  helpers[name] = function() {
    var out = helper.apply(this, arguments);

    if (typeof out != 'string') throw Error([
      'Template helper', name, 'must return a string!',
      'Instead it returned', out
    ].join(' '));

    var params = [].slice.call(arguments);
    return MDComponent.wrap('helper', name, params, out);
  }

  // Chainable
  return module.exports;
}

// Register a new partial. Registered partials will be wrapped with a
// [{]: <partial> (name) [}]: #
function registerPartial(name, partial) {
  partials[name] = MDComponent.wrap('partial', name, partial);
  // Chainable
  return module.exports;
}


module.exports = {
  overwriteTemplateFile: overwriteTemplateFile,
  renderTemplateFile: renderTemplateFile,
  renderTemplate: renderTemplate,
  registerHelper: registerHelper,
  registerPartial: registerPartial
};

// Built-in helpers and partials
require('./diff-step-helper');
require('./nav-step-helper');
