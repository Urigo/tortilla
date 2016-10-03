var MDBlock = require('./md-block-model');
var Utils = require('../utils');

/*
  Represents a text block in a markdown file aka a plain block with no open and start.
 */

function MDTextBlock(props, md, recursive) {
  props = Utils.extend({}, {
    type: '',
    name: '',
    params: []
  }, props);

  MDBlock.call(this, props, md, recursive);
}

MDTextBlock.prototype = Object.create(MDBlock.prototype);


module.exports = MDTextBlock;