var Fs = require('fs-extra');
var Handlebars = require('handlebars');
var Path = require('path');
var Git = require('../git');
var Paths = require('../paths');
var Release = require('../release');
var Utils = require('../utils');

/**
  A wrapper for Handlebars with several additions which are essential for Tortilla
 */

// Creating a new instance of handlebars which will then be merged with the module
var handlebars = Handlebars.create();
// Keep original handlers since these methods are gonna be overriden
var superRegisterHelper = handlebars.registerHelper.bind(handlebars);
var superRegisterPartial = handlebars.registerPartial.bind(handlebars);
// Used to store registered transformations
var transformations = {};
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

  if (process.env.TORTILLA_CACHE_DISABLED || !cache[templatePath]) {
    var templateContent = Fs.readFileSync(templatePath, 'utf8');
    cache[templatePath] = handlebars.compile(templateContent);
  }

  var template = cache[templatePath];
  return renderTemplate(template, scope);
}

// Render provided template
function renderTemplate(template, scope) {
  // Template can either be a string or a compiled template object
  if (typeof template == 'string') template = handlebars.compile(template);
  scope = scope || {};

  if (scope.viewPath) {
    // Relative path of view dir
    // e.g. manuals/views
    var viewDir = Path.relative(Paths.resolve(), Path.dirname(scope.viewPath));
  }

  try {
    // Set the view file for the resolve utility. If no view path was provided, the
    // resolve function below still won't work
    handlebars.resolve = resolvePath.bind(null, viewDir);
    return template(scope);
  }
  finally {
    // Either if an error was thrown or not, unbind it
    handlebars.resolve = resolvePath.bind(null, null);
  }
}

// Returns a template path relative to tortilla with an '.tmpl' extension
function resolveTemplatePath(templatePath) {
  if (templatePath.indexOf('.tmpl') == -1) {
    templatePath += '.tmpl';
  }

  // User defined templates
  var relativeTemplatePath = Path.resolve(Paths.manuals.templates, templatePath);
  if (Utils.exists(relativeTemplatePath)) return relativeTemplatePath;

  // Tortilla defined templates
  return Path.resolve(Paths.tortilla.renderer.templates, templatePath);
}

// Register a new helper. Registered helpers will be wrapped with a
// [{]: <helper> (name ...args) [}]: #
function registerHelper(name, helper, options) {
  options = options || {};

  var wrappedHelper = function () {
    var out = helper.apply(this, arguments);

    if (typeof out != 'string') throw Error([
      'Template helper', name, 'must return a string!',
      'Instead it returned', out
    ].join(' '));

    var target = process.env.TORTILLA_RENDER_TARGET;
    var args = [].slice.call(arguments);

    // Transform helper output
    var transformation = transformations[target] && transformations[target][name];
    if (transformation) {
      out = transformation.apply(null, [out].concat(args));
    }

    // Wrap helper output
    if (options.mdWrap) {
      out = mdWrapComponent('helper', name, args, out);
    }

    return out;
  }

  superRegisterHelper(name, wrappedHelper);
}

// Register a new partial. Registered partials will be wrapped with a
// [{]: <partial> (name) [}]: #
function registerPartial(name, partial, options) {
  options = options || {};

  // Wrap partial template
  if (options.mdWrap) {
    partial = mdWrapComponent('partial', name, partial);
  }

  return superRegisterPartial(name, partial);
}

// Register a new transformation which will take effect on rendered helpers. This is
// useful when setting the TORTILLA_RENDER_TARGET variable, so we can make additional
// adjustments for custom targets. For now this is NOT part of the official API and
// is used only for development purposes
function registerTransformation(targetName, helperName, transformation) {
  if (!transformations[targetName]) transformations[targetName] = {};
  transformations[targetName][helperName] = transformation;
}

// Returns content wrapped by component notations. Mostly useful if we want to detect
// components in the view later on using external softwares later on.
// e.g. https://github.com/Urigo/angular-meteor-docs/blob/master/src/app/tutorials/
// improve-code-resolver.ts#L24
function mdWrapComponent(type, name, args, content) {
  var hash = {};

  if (typeof content != 'string') {
    content = args;
    args = [];
  }

  if (args[args.length - 1] instanceof Object) {
    hash = args.pop().hash;
  }

  // Stringify arguments
  var params = args.map(function (param) {
    return typeof param == 'string' ? '"' + param + '"' : param;
  }).join(' ');

  hash = stringifyHash(hash);

  // Concat all stringified arguments
  args = [name, params, hash]
    // Get rid of empty strings
    .filter(Boolean)
    .join(' ');

  return [
    '[{]: <' + type + '> (' + args + ')', content, '[}]: #'
  ].join('\n');
}

// Takes a helper hash and stringifying it
// e.g. { foo: '1', bar: 2 } -> foo="1" bar=2
function stringifyHash(hash) {
  return Object.keys(hash).map(function (key) {
    var value = hash[key];
    if (typeof value == 'string') value = '"' + value +'"';
    return key + '=' + value;
  }).join(' ');
}

// Takes a bunch of paths and resolved them relatively to the current rendered view
function resolvePath(/* reserved path, user defined path */) {
  var paths = [].slice.call(arguments);

  // A default path that the host's markdown renderer will know how to resolve by its own
  var defaultPath = paths.slice(1).join('/');

  // If function is unbound, return default path
  if (typeof paths[0] != 'string') return defaultPath;

  var repository = require(Paths.npm.package).repository;

  // If no repository was defined, or
  // repository type is not git, or
  // no repository url is defined, return default path
  if (repository == null ||
      repository.type != 'git' ||
      repository.url == null) {
    return defaultPath;
  }

  // Compose branch path for current release tree
  // e.g. github.com/Urigo/Ionic2CLI-Meteor-Whatsapp/tree/master@0.0.1
  var releaseTag = Git.activeBranchName() + '@' + Release.format(Release.current());
  var repositoryUrl = repository.url.replace('.git', '');
  var branchUrl = [repositoryUrl, 'tree', releaseTag].join('\/');
  var protocol = (branchUrl.match(/^.+\:\/\//) || [''])[0];
  var branchPath = '/' + branchUrl.substr(protocol.length);

  // Resolve full path
  // e.g. github.com/Urigo/Ionic2CLI-Meteor-Whatsapp/tree/master@0.0.1
  // /manuals/views/step1.md
  paths.unshift(branchPath);
  return protocol + Path.resolve.apply(Path, paths).substr(1);
}


module.exports = Utils.extend(handlebars, {
  overwriteTemplateFile: overwriteTemplateFile,
  renderTemplateFile: renderTemplateFile,
  renderTemplate: renderTemplate,
  registerHelper: registerHelper,
  registerPartial: registerPartial,
  registerTransformation: registerTransformation,
  // Should be bound by the `renderTemplate` method
  resolve: resolvePath.bind(null, null)
});

// Built-in helpers and partials
require('./helpers/diff-step');
require('./helpers/nav-step');
require('./helpers/resolve-path');
require('./helpers/step-message');
require('./helpers/translate');
