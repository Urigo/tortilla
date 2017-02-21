var Fs = require('fs-extra');
var Handlebars = require('handlebars');
var Path = require('path');
var Paths = require('../paths');
var Utils = require('../utils');

/*
  A wrapper for Handlebars
 */

// Creating a new instance of handlebars which will then be merged with the module
var handlebars = Handlebars.create();
// Cache for templates which were already compiled
var cache = {};


// Read the provided file, render it, and overwrite it. Use with caution!
function overwriteTemplateFile(templatePath, scope) {
  templatePath = resolveTemplatePath(templatePath);
  var view = renderTemplateFile(templatePath, scope);

  return Fs.writeFileSync(templatePath, view);
}

// Read provided file and render its template. Note that the default path would
// be tortilla's template dir, so specifying a file name would be ok as well
function renderTemplateFile(templatePath, scope) {
  templatePath = resolveTemplatePath(templatePath);

  if (!cache[templatePath]) {
    var templateContent = Fs.readFileSync(templatePath, 'utf8');
    cache[templatePath] = handlebars.compile(templateContent);
  }

  var template = cache[templatePath];
  return template(scope);
}

// Render provided template
function renderTemplate(template, scope) {
  return handlebars.compile(template)(scope);
}

// Returns a template path relative to tortilla with an '.md.tmpl' extension
function resolveTemplatePath(templatePath) {
  if (templatePath.indexOf('.md.tmpl') == -1) {
    templatePath += '.md.tmpl';
  }

  return Path.resolve(Paths.tortilla.templates, templatePath);
}


module.exports = Utils.extend(handlebars, {
  overwriteTemplateFile: overwriteTemplateFile,
  renderTemplateFile: renderTemplateFile,
  renderTemplate: renderTemplate
});

// Built-in helpers and partials
require('./diff-step-helper');
require('./nav-step-helper');
