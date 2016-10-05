var Model = require('../model');

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
    start: 0, // substr start-index
    end: 15, // substr end-index
    content: '  1, 2, 3'
  }
 */

// These will be loaded at the first instance initialization
var MDBlocksCollection;
var MD;


function MDBlock(props, md, recursive) {
  // Note that if they were'nt loaded here then we would have had a circular dependency
  MDBlocksCollection = MDBlocksCollection || require('./md-blocks-collection');
  MD = MD || require('.');

  Model.call(this, props);
  this.blocks = new MDBlocksCollection();

  // The margin represents a line skip, for plain text there is no line skip
  var margin = +!!this.type;

  this.content = md.slice(
    this.start + this.open.length + margin,
    this.end - this.close.length - margin
  );

  // We can specfy recursive level, if recursive is true then it will be converted
  // to Infinity, if it's false then it wil be converted to 0
  if (typeof recursive == 'boolean') recursive = Infinity * +recursive;
  // If this is a plain text it should have no children
  if (this.type && recursive > 0) this.blocks = MD.parse(this.content, --recursive);
}

MDBlock.prototype = Object.create(Model.prototype, {
  // The content wrapped with open and close e.g. [{] & [}]
  wrapped: {
    get: function () {
      // For plain text there is no close and open
      if (!this.type) return this.content;
      return [this.open, this.content, this.close].join('\n');
    }
  },
  // e.g. [}]: <type> (name ...params)
  open: {
    get: function () {
      // For plain text there is no open
      if (!this.type) return '';

      var params = []
        .concat(this.name)
        .concat(this.params)
        .join(' ');

      return '[{]: <' + this.type + '> (' + params + ')';
    }
  },
  // e.g. [}]: #
  close: {
    get: function () {
      // For plain text there is no get
      if (!this.type) return '';
      return '[}]: #';
    }
  },
  toString: {
    configurable: true,
    writable: true,
    value: function () {
      return this.wrapped;
    }
  },
  valueOf: {
    configurable: true,
    writable: true,
    value: function () {
      return this.wrapped;
    }
  }
});


module.exports = MDBlock;