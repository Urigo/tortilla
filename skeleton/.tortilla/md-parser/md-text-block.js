var MDBlock = require('./md-block');
var Utils = require('../utils');

/*
  Represents a text block in a markdown file aka a plain block with no open and start.
 */

function MDTextBlock(md) {
  // A text block can't be recursive
  MDBlock.call(this, md);
}

MDTextBlock.prototype = Object.create(MDBlock.prototype, {
  // A text block doesn't contain any blocks at all
  toTemplate: {
    value: function () {
      return this.content;
    }
  },
  // Text blocks are not wrapped
  toString: {
    get: function () {
      return this.content;
    }
  },
  // Text blocks are not wrapped
  valueOf: {
    get: function () {
      return this.content;
    }
  }
});


module.exports = MDTextBlock;