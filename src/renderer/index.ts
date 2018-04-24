import * as Fs from 'fs-extra';
import * as Handlebars from 'handlebars';
import * as Path from 'path';
import { Git} from '../git';
import { Paths} from '../paths';
import { Release} from '../release';
import { Utils} from '../utils';

/**
  A wrapper for Handlebars with several additions which are essential for Tortilla
 */

// Creating a new instance of handlebars which will then be merged with the module
const handlebars = Handlebars.create();
// Keep original handlers since these methods are gonna be overriden
const superRegisterHelper = handlebars.registerHelper.bind(handlebars);
const superRegisterPartial = handlebars.registerPartial.bind(handlebars);
// Used to store registered transformations
const transformations = {};
// Cache for templates which were already compiled
const cache = {};


// Read the provided file, render it, and overwrite it. Use with caution!
function overwriteTemplateFile(templatePath, scope) {
  templatePath = resolveTemplatePath(templatePath);
  const view = renderTemplateFile(templatePath, scope);

  return Fs.writeFileSync(templatePath, view);
}

// Read provided file and render its template. Note that the default path would
// be tortilla's template dir, so specifying a file name would be ok as well
function renderTemplateFile(templatePath, scope) {
  templatePath = resolveTemplatePath(templatePath);

  if (process.env.TORTILLA_CACHE_DISABLED || !cache[templatePath]) {
    const templateContent = Fs.readFileSync(templatePath, 'utf8');
    cache[templatePath] = handlebars.compile(templateContent);
  }

  const template = cache[templatePath];
  return renderTemplate(template, scope);
}

// Render provided template
function renderTemplate(template, scope) {
  // Template can either be a string or a compiled template object
  if (typeof template === 'string') {
    template = handlebars.compile(template);
  }
  scope = scope || {};

  if (scope.viewPath) {
    // Relative path of view dir
    // e.g. manuals/views
    var viewDir = Path.dirname(scope.viewPath);
  }

  const oldResolve = (handlebars as any).resolve;

  try {
    // Set the view file for the resolve utility. If no view path was provided, the
    // resolve function below still won't work
    (handlebars as any).resolve = resolvePath.bind(null, viewDir);
    return template(scope);
  }
  finally {
    // Either if an error was thrown or not, unbind it
    (handlebars as any).resolve = oldResolve;
  }
}

// Returns a template path relative to tortilla with an '.tmpl' extension
function resolveTemplatePath(templatePath) {
  if (templatePath.indexOf('.tmpl') == -1) {
    templatePath += '.tmpl';
  }

  // User defined templates
  const relativeTemplatePath = Path.resolve(Paths.manuals.templates, templatePath);
  if (Utils.exists(relativeTemplatePath)) {
    return relativeTemplatePath;
  }

  // Tortilla defined templates
  return Path.resolve(Paths.tortilla.renderer.templates, templatePath);
}

// Register a new helper. Registered helpers will be wrapped with a
// [{]: <helper> (name ...args) [}]: #
function registerHelper(name, helper, options) {
  options = options || {};

  const wrappedHelper = function () {
    const oldCall = (handlebars as any).call;

    try {
      // Bind the call method to the current context
      (handlebars as any).call = callHelper.bind(this);
      var out = helper.apply(this, arguments);
    } finally { // Fallback
      // Restore method to its original
      (handlebars as any).call = oldCall;
    }

    if (typeof out !== 'string' &&
        !(out instanceof String)) {
      throw Error([
        'Template helper', name, 'must return a string!',
        'Instead it returned', out,
      ].join(' '));
    }

    const target = process.env.TORTILLA_RENDER_TARGET;
    const args = [].slice.call(arguments);

    // Transform helper output
    const transformation = transformations[target] && transformations[target][name];
    if (transformation) {
      out = transformation(...[out].concat(args));
    }

    // Wrap helper output
    if (options.mdWrap) {
      out = mdWrapComponent('helper', name, args, out);
    }

    return out;
  };

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
  if (!transformations[targetName]) {
    transformations[targetName] = {};
  }
  transformations[targetName][helperName] = transformation;
}

// Returns content wrapped by component notations. Mostly useful if we want to detect
// components in the view later on using external softwares later on.
// e.g. https://github.com/Urigo/angular-meteor-docs/blob/master/src/app/tutorials/
// improve-code-resolver.ts#L24
function mdWrapComponent(type, name, args, content?) {
  let hash = {};

  if (typeof content !== 'string') {
    content = args;
    args = [];
  }

  if (args[args.length - 1] instanceof Object) {
    hash = args.pop().hash;
  }

  // Stringify arguments
  const params = args.map(param => typeof param === 'string' ? `"${param}"` : param).join(' ');

  hash = stringifyHash(hash);

  // Concat all stringified arguments
  args = [name, params, hash]
    // Get rid of empty strings
    .filter(Boolean)
    .join(' ');

  return `[{]: <${type}> (${Utils.escapeBrackets(args)})\n\n${content}\n\n[}]: #`;
}

// Takes a helper hash and stringifying it
// e.g. { foo: '1', bar: 2 } -> foo="1" bar=2
function stringifyHash(hash) {
  return Object.keys(hash).map((key) => {
    let value = hash[key];
    if (typeof value === 'string') {
      value = `"${value}"`;
    }
    return `${key}=${value}`;
  }).join(' ');
}

// Calls a template helper with the provided context and arguments
function callHelper(methodName) {
  const args = [].slice.call(arguments, 1);
  let options = args.pop();

  // Simulate call from template
  if (options instanceof Object) {
    options = { hash: options };
  }

  args.push(options);

  return handlebars.helpers[methodName].apply(this, args);
}

// Takes a bunch of paths and resolved them relatively to the current rendered view
function resolvePath(/* reserved path, user defined path */) {
  let paths = [].slice.call(arguments);

  // A default path that the host's markdown renderer will know how to resolve by its own
  let defaultPath = paths.slice(1).join('/');
  defaultPath = new String(defaultPath);
  // The 'isRelative' flag can be used later on to determine if this is an absolute path
  // or a relative path
  defaultPath.isRelative = true;

  const cwd = paths.shift()

  // If function is unbound, return default path
  if (typeof cwd != 'string') {
    return defaultPath;
  }

  const repository = Fs.readJsonSync(Paths.npm.package).repository;

  // If no repository was defined, or
  // repository type is not git, or
  // no repository url is defined, return default path
  if (repository == null ||
      repository.type != 'git' ||
      repository.url == null) {
    return defaultPath;
  }

  const currentRelease = Release.format(Release.current());

  // Any release is yet to exist
  if (currentRelease == '0.0.0') {
    return defaultPath;
  }

  // Compose branch path for current release tree
  // e.g. github.com/Urigo/Ionic2CLI-Meteor-Whatsapp/tree/master@0.0.1
  const releaseTag = `${Git.activeBranchName()}@${currentRelease}`;
  const repositoryUrl = repository.url.replace('.git', '');
  const branchUrl = [repositoryUrl, 'tree', releaseTag].join('\/');
  const protocol = (branchUrl.match(/^.+\:\/\//) || [''])[0];
  const branchPath = `/${branchUrl.substr(protocol.length)}`;

  // If we use tilde (~) at the beginning of the path, we will be referenced to the
  // repo's root URL. This is useful when we want to compose links which are
  // completely disconnected from the current state, like commits, issues and PRs
  paths = paths
    .map(path => path.replace(/~/g, Path.resolve(branchPath, '../..')))
    .map(path => Path.isAbsolute(path) ? Path.relative(cwd, path) : Path.resolve(branchPath, Path.join(cwd, path)));

  // Resolve full path
  // e.g. github.com/Urigo/Ionic2CLI-Meteor-Whatsapp/tree/master@0.0.1
  // /manuals/views/step1.md
  paths.unshift(branchPath);
  return protocol + Path.resolve(...paths).substr(1);
}

export const Renderer = Utils.extend(handlebars, {
  overwriteTemplateFile,
  renderTemplateFile,
  renderTemplate,
  registerHelper,
  registerPartial,
  registerTransformation,
  // This should be set whenever we're in a helper scope
  call: callHelper,
  // Should be bound by the `renderTemplate` method
  resolve: resolvePath.bind(null, null),
});

// Built-in helpers and partials
import './helpers/diff-step';
import './helpers/nav-step';
import './helpers/resolve-path';
import './helpers/step-message';
import './helpers/translate';
