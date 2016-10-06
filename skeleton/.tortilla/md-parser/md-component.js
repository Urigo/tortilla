var MDChunk = require('./md-chunk');
var MDParser;

/*
  Here is a sample of a component in a markdown file:

  [{]: <type> (name ...params)
  content
  [}]: #

  Here is the schema of the sample component:

  {
    type: String,
    name: String,
    params: [String],
    content: String
  }
 */

function MDComponent(md, recursive) {
  // Prevent potential circular dependency
  MDParser = require('.');

  // Find open notation
  var match = md.match(/\[\{\]: <([^>]*)> \(([^\)]*)\)/);
  if (!match) throw Error('Markdown doesn\'t contain any components');

  MDChunk.call(this, md);

  this.type = match[1];
  this.params = match[2].split(' ');
  this.name = this.params.shift();
  this._start = match.index;
  this._end = match.index + match[0].length;

  // Pattern to find open or close notations
  var pattern = /\[(\{|\})\]: .+/;
  // Number of components whos closure not found yet
  var openComponents = 1;

  // Try to find the matching closure of the current component
  while (openComponents) {
    match = md.substr(this._end).match(pattern);
    if (!match) throw Error('Markdown doesn\'t contain any closure');

    // Calculate with offset
    this._end += match.index + match[0].length;

    // Update the number of open components based on the pattern's result
    switch (match[1]) {
      case '{': ++openComponents; break;
      case '}': --openComponents; break;
    }
  }

  // Get the inner content without the notations
  this.content = md
    .slice(this._start, this._end)
    .split('\n')
    .slice(1)
    .slice(0, -1)
    .join('\n');

  // If true recursion will continue forever
  if (recursive === true) recursive = Infinity;
  if (recursive > 0) this.chunks = MDParser.parse(this.content, --recursive);
}

MDComponent.prototype = Object.create(MDChunk.prototype, {
  // Convert to template string which can be handled by md-renderer
  toTemplate: {
    value: function () {
      // Convert recursively. Note that if this collection was not created in a recursive
      // operation then the recursive conversion will seem like it doesn't take any
      // affect
      return MDParser.wrap(this.type, this.name, this.params, this.chunks.toTemplate());
    }
  },
  // Wrap content with component notations
  toString: {
    configurable: true,
    writable: true,
    value: function () {
      return MDParser.wrap(this.type, this.name, this.params, this.content);
    }
  },
  // Wrap content with component notations
  valueOf: {
    configurable: true,
    writable: true,
    value: function () {
      return MDParser.wrap(this.type, this.name, this.params, this.content);
    }
  }
});


module.exports = MDComponent;