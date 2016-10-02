var Fs = require('fs');

/*
  Contains general utilities.
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

// Fillin file template and rewrite it
function fillinTemplateFile(path, replacements) {
  var template = Fs.readFileSync(path, 'utf8');
  var content = fillinTemplate(template, replacements);
  return Fs.writeFileSync(path, content);
}

// Fillin ${strings} with the provided replacements
function fillinTemplate(template, replacements) {
  return Object.keys(replacements).reduce(function (content, key) {
    var value = replacements[key];
    var pattern = new RegExp('\\$\\{' + key + '\\}', 'g');
    return content.replace(pattern, value);
  }, template);
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
  templateFile: fillinTemplateFile,
  template: fillinTemplate,
  exists: exists
};