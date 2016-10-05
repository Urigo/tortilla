var Fs = require('fs');

/*
  Contains general utilities. Note that some of the utilities are the same as tortilla's
  skeleton. That's because tortilla should be seperated into two packages (cli & core)
  and one shall not be dependent on the other.
 */

// foo_barBaz -> foo-bar-baz
function kebabCase(str) {
  return splitWords(str)
    .map(lowerFirst)
    .join('-');
}

// foo_barBaz -> Foo Bar Baz
function startCase(str) {
  return splitWords(str)
    .map(upperFirst)
    .join(' ');
}

// foo_barBaz -> ['foo', 'bar', 'Baz']
function splitWords(str) {
  return str
    .replace(/[A-Z]/, ' $&')
    .split(/[^a-zA-Z0-9]+/);
}

// Lower -> lower
function lowerFirst(str) {
  return str.substr(0, 1).toLowerCase() + str.substr(1);
}

// upper -> Upper
function upperFirst(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1);
}

// Read the provided file, render it, and overwrite it. Use with caution!
function overwriteTemplateFile(templatePath, scope) {
  var view = renderTemplateFile(templatePath, scope);
  return Fs.writeFileSync(templatePath, view);
}

// Read provided file and render its template
function renderTemplateFile(templatePath, scope) {
  var template = Fs.readFileSync(templatePath, 'utf8');
  return renderTemplate(template, scope);
}

// Render provided tempalte
function renderTemplate(template, scope) {
  scope = scope || {};

  return template.replace(/\{\{(.*)\}\}/g, function (match, modelName) {
    return scope[modelName];
  });
}

// Tells if entity exists or not by an optional document type
function exists(path, type) {
  try {
    var stats = Fs.lstatSync(path);

    switch (type) {
      case 'dir': return stats.isDirectory();
      case 'file': return stats.isFile();
      default: return true;
    }
  }
  catch (err) {
    return false;
  }
}


module.exports = {
  kebabCase: kebabCase,
  startCase: startCase,
  splitWords: splitWords,
  lowerFirst: lowerFirst,
  upperFirst: upperFirst,
  overwriteTemplateFile: overwriteTemplateFile,
  renderTemplateFile: renderTemplateFile,
  renderTemplate: renderTemplate,
  exists: exists
};