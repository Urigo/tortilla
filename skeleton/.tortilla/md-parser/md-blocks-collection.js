var Collection = require('../collection');

/*
  A collection of block models.
 */

function MDBlocksCollection() {
  Collection.apply(this, arguments);
}

MDBlocksCollection.prototype = Object.create(Collection.prototype, {
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