var Collection = require('../collection');

/*
  A collection of block models.
 */

function MDBlocksCollection() {
  Collection.apply(this, arguments);
}

MDBlocksCollection.prototype = Object.create(Collection.prototype, {
  // Convert blocks to template string which can be handled by md-renderer
  toTemplate: {
    value: function() {
      return this.map(function (block) {
        if (!block.type) return block.toString();

        // Full params string including name
        var params = [block.name].concat(block.params).join(' ');

        switch (block.type) {
          case 'helper': return '{{{' + params + '}}}';
          case 'partial': return '{{>' + params + '}}';
        }

        // In any other case convert recursively. Note that if this collection
        // was not created in a recursive operation then the recursive conversion
        // will seem like it doesn't take any affect
        return [block.open, block.blocks.toTemplate(), block.close].join('\n');
      }).join('\n');
    }
  },
  // Print the original markdown string
  toString: {
    configurable: true,
    writable: true,
    value: function () {
      return this.map(function (block) {
        return block.toString();
      }).join('\n');
    }
  },
  // Print the original markdown string
  valueOf: {
    configurable: true,
    writable: true,
    value: function () {
      return this.map(function (block) {
        return block.valueOf();
      }).join('\n');
    }
  }
});


module.exports = MDBlocksCollection;