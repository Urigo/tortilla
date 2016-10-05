/*
  A collection of block models.
 */

function MDBlocksCollection() {
  Array.apply(this, arguments);
}

// There shouldn't be any major issues when inheriting from an array on NodeJS platform
MDBlocksCollection.prototype = Object.create(Array.prototype, {
  // Convert blocks to template string which can be handled by md-renderer
  toTemplate: {
    value: function() {
      return this.map(function (block) {
        return block.toTemplate();
      }).join('\n');
    }
  },
  // Join all md-block strings
  toString: {
    configurable: true,
    writable: true,
    value: function () {
      return this.map(function (block) {
        return block.toString();
      }).join('\n');
    }
  },
  // Join all md-block values
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