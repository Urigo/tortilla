var MDParser = require('.');

/*
  Represents a partial block in a markdown file.
 */

MDParser.registerBlockType('partial', {
  // {{>partial}}
  toTemplate: {
    value: function () {
      return '{{>' + this.name + '}}';
    }
  }
});