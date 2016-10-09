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
    string: ['_', 'format', 'f'],
  });

  var method = argv._[0];
  var manualPath = argv._[1];
  var format = argv.format || argv.f;

  // Automatically invoke a method by the provided arguments
  switch (method) {
    case 'convert': return convertManual(format, manualPath);
  }
}

// Converts manual into the specified format. If manual path is not provided then all
// manuals since the beginning of history will be converted
function convertManual(format, manualPath) {
  if (format == null)
    throw Error('A format must be provided');

  // Convert all manuals since the beginning of history
  if (!manualPath) return Git(['rebase', '-i', '--root', '--keep-empty'], {
    GIT_SEQUENCE_EDITOR: 'node ' + Paths.tortilla.editor + ' convert -f ' + format
  });

  // Fetch the current manual
  manualPath = Path.resolve(Paths._, manualPath);
  var manual = Fs.readFileSync(manualPath, 'utf8');
  var newManual;

  // Get new manual
  switch (format) {
    case 'prod': newManual = convertProductionManual(manual); break;
    case 'dev': newManual = convertDevelopmentManual(manual); break;
  }

  // If no changes made, abort
  if (newManual == null) return;

  // Rewrite manual
  Fs.writeFileSync(manualPath, newManual);
}

// Converts manual content to production format
function convertProductionManual(manual) {
  var header = MDRenderer.renderTemplateFile('header.md')
  var body = MDRenderer.renderTemplate(manual);
  var footer = MDRenderer.renderTemplateFile('footer.md');

  header = MDComponent.wrap('region', 'header', header);
  body = MDComponent.wrap('region', 'body', body);
  footer = MDComponent.wrap('region', 'footer', footer);

  return [header, body, footer].join('\n');
}

// Converts manual content to development format
function convertDevelopmentManual(manual) {
  var chunks = MDParser.parse(manual, 1);
  var body = chunks[1].chunks;

  return body.toTemplate();
}


module.exports = {
  convert: convertManual
};

if (require.main === module) main();