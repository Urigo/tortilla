/*
  The block model represents a single 'block' in a markdown file generated automatically
  by tortilla right after using Handlebars helpers. Example:

  [{]: <partial> (print 1 2 3)
  1, 2, 3
  [}]: #

  Would be presented like the following in a block:

  {
    type: 'partial',
    name: 'print',
    params: [1, 2, 3],
    content: '1, 2, 3'
  }
 */

// These will be loaded at the first instance initialization
var MDBlocksCollection;
var MDParser;


function MDBlock(md, recursive) {
  // Note that if they were'nt loaded here then we would have had a circular dependency
  MDBlocksCollection = MDBlocksCollection || require('./md-blocks-collection');
  MDParser = MDParser || require('.');

  // e.g. [{]: <match1> (match2)
  var match = md.match(/\[\{\]: <([^>]*)> \(([^\)]*)\)/);

  if (!match) {
    this.type = '';
    this.name = '';
    this.params = [];
    this.content = md;
    this.blocks = new MDBlocksCollection();

    return this;
  };

  this.type = match[1];
  this.params = match[2].split(' ');
  this.name = this.params.shift();
  this._start = match.index;
  this._end = match.index + match[0].length;

  // e.g. [{] or [}]
  var pattern = /\[(\{|\})\]: .+/;
  var nested = 1;

  // Handle opening and closing and try to find the matching closing
  while (nested) {
    match = md.substr(this._end).match(pattern);
    // If no match found and we kept going on in this loop it means that there is
    // no closing to the detected block start
    if (!match) throw Error(this.type + ' \'' + this.name + '\' close not found');

    // Calculate with offset
    this._end += match.index + match[0].length;

    // Update the number of blocks open we had so far
    switch (match[1]) {
      case '{': ++nested; break;
      case '}': --nested; break;
    }
  }

  this.content = md
    .slice(this._start, this._end)
    .split('\n')
    .slice(1)
    .slice(0, -1)
    .join('\n');

  if (recursive === true) recursive = Infinity;

  this.blocks = recursive > 0
    ? MDParser.parse(this.content, --recursive)
    : new MDBlocksCollection();
}

MDBlock.prototype = Object.create(Object.prototype, {
  // Convert to template string which can be handled by md-renderer
  toTemplate: {
    value: function () {
      // Convert recursively. Note that if this collection
      // was not created in a recursive operation then the recursive conversion
      // will seem like it doesn't take any affect
      return MDParser.wrap(this.type, this.name, this.params, this.blocks.toTemplate());
    }
  },
  // Wrap content with open and close notations
  toString: {
    configurable: true,
    writable: true,
    value: function () {
      return MDParser.wrap(this.type, this.name, this.params, this.content);
    }
  },
  // Wrap content with open and close notations
  valueOf: {
    configurable: true,
    writable: true,
    value: function () {
      return MDParser.wrap(this.type, this.name, this.params, this.content);
    }
  }
});


module.exports = MDBlock;