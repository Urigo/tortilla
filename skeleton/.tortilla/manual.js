var Fs = require('fs');
var Minimist = require('minimist');
var Path = require('path');
var Paths = require('./paths');
var Utils = require('./utils');
var MDParser = require('./md-parser');
var MDComponent = require('./md-parser/md-component');
var MDRenderer = require('./md-renderer');

/*
  Contains manual related utilities.
 */

function main() {
  var argv = Minimist(process.argv.slice(2), {
    string: ['_', 'path', 'p', 'mode', 'm']
  });

  var method = argv._[0];
  var path = argv.path || argv.p;
  var mode = argv.mode || argv.m;

  // Automatically invoke a method by the provided arguments
  switch (method) {
    case 'format': return formatManual(path, mode);
  }
}

function formatManual(manualPath, mode) {
  if (mode == null)
    throw Error('Format mode must be provided');
  if (manualPath == null)
    throw Error('Manual path must be provided');

  var manual = Fs.readFileSync(manualPath, 'utf8');
  var newManual;

  switch (mode) {
    case 'prod': newManual = formatProductionManual(manual); break;
    case 'dev': newManual = formatDevelopmentManual(manual); break;
  }

  if (newManual == null) newManual = manual;

  Fs.writeFileSync(manualPath, newManual);
}

function formatProductionManual(manual) {
  var header = MDRenderer.renderTemplateFile('header.md')
  var body = MDRenderer.renderTemplate(manual);
  var footer = MDRenderer.renderTemplateFile('footer.md');

  header = MDComponent.wrap('region', 'header', header);
  body = MDComponent.wrap('region', 'body', body);
  footer = MDComponent.wrap('region', 'footer', footer);

  return [header, body, footer].join('\n');
}

function formatDevelopmentManual(manual) {
  var chunks = MDParser.parse(manual, 1);
  var body = chunks[1].chunks;

  return body.toTemplate();
}


module.exports = {
  format: formatManual
};

if (require.main === module) main();