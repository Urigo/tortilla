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
    start: 0,
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

  // Reset 'end' property to be dynamic to content's length in case it is changed
  Object.defineProperty(this, 'end', {
    configurable: true,
    enumerable: true,
    get: function () {
      return this.start + this.wrapped.length;
    }
  });

  // We can specfy recursive level, if recursive is true then it will be converted
  // to Infinity, if it's false then it wil be converted to 0
  if (typeof recursive == 'boolean') recursive = Infinity * +recursive;
  // If this is a plain text it should have no children
  if (recursive > 0) this.blocks = MD.parse(this.content, --recursive);
}

MDBlock.prototype = Object.create(Model.prototype, {
  // The content wrapped with open and close e.g. [{] & [}]
  wrapped: {
    get: function () {
      return [this.open, this.content, this.close].join('\n');
    }
  },
  // e.g. [}]: <type> (name ...params)
  open: {
    get: function () {
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
      return '[}]: #';
    }
  },
  // Convert to template string which can be handled by md-renderer
  toTemplate: {
    value: function () {
      // Convert recursively. Note that if this collection
      // was not created in a recursive operation then the recursive conversion
      // will seem like it doesn't take any affect
      return [this.open, this.blocks.toTemplate(), this.close].join('\n');
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