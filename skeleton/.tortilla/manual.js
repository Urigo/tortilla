var Fs = require('fs');
var Minimist = require('minimist');
var Path = require('path');
var Git = require('./git');
var Paths = require('./paths');
var MDParser = require('./md-parser');
var MDComponent = require('./md-parser/md-component');
var MDRenderer = require('./md-renderer');

/*
  Contains manual related utilities.
 */

function main() {
  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'path', 'p'],
  });

  var method = argv._[0];
  var format = argv._[1];
  var path = argv.path || argv.p;

  // Automatically invoke a method by the provided arguments
  switch (method) {
    case 'format': return formatManual(format, path);
  }
}

// Rewrites manual into the specified format. If manual path is not provided then all
// available manuals will be rewritten into the specified format
function formatManual(format, path) {
  if (format == null)
    throw Error('A format must be provided');

  // If no path specified then all the manual files created so far are gonna be
  // reformatted into the specified format
  if (!path) return Git(['rebase', '-i', '--root', '--keep-empty'], {
    GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' format-manuals -m ' + mode
  });

  // Fetch the current manual
  var manual = Fs.readFileSync(path, 'utf8');
  var newManual;

  // Get new manual
  switch (mode) {
    case 'prod': newManual = formatProductionManual(manual); break;
    case 'dev': newManual = formatDevelopmentManual(manual); break;
  }

  // If no changes made, abort
  if (newManual == null) return;

  // Rewrite manual
  Fs.writeFileSync(path, newManual);
}

// Converts manual content to production format
function formatProductionManual(manual) {
  var header = MDRenderer.renderTemplateFile('header.md')
  var body = MDRenderer.renderTemplate(manual);
  var footer = MDRenderer.renderTemplateFile('footer.md');

  header = MDComponent.wrap('region', 'header', header);
  body = MDComponent.wrap('region', 'body', body);
  footer = MDComponent.wrap('region', 'footer', footer);

  return [header, body, footer].join('\n');
}

// Converts manual content to development format
function formatDevelopmentManual(manual) {
  var chunks = MDParser.parse(manual, 1);
  var body = chunks[1].chunks;

  return body.toTemplate();
}


module.exports = {
  format: formatManual
};

if (require.main === module) main();