var MDBlock = require('./md-block');
var Utils = require('../utils');

/*
  Represents a text block in a markdown file aka a plain block with no open and start.
 */

function MDTextBlock(props, md) {
  props = Utils.extend({}, {
    type: '',
    name: '',
    params: []
  }, props);

  // A text block can't be recursive
  MDBlock.call(this, props, md);
}

MDTextBlock.prototype = Object.create(MDBlock.prototype, {
  // A text block is exceptional and can't be wrapped
  wrapped: {
    get: function () {
      return this.content;
    }
  },
  // Since it isn't wrapped it doesn't have an openning
  open: {
    get: function () {
      return '';
    }
  },
  // Since it isn't wrapped it doesn't have a closing
  close: {
    get: function () {
      return '';
    }
  },
  // A text block doesn't contain any blocks at all
  toTemplate: {
    value: function () {
      return this.toString();
    }
  }
});


module.exports = MDTextBlock;