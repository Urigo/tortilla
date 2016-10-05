var MDParser = require('.');

/*
  Represents a helper block in a markdown file.
 */

MDParser.registerBlockType('helper', {
  // {{{helper ...params}}}
  toTemplate: {
    value: function () {
      // Full params string including name
      var params = [this.name].concat(this.params).join(' ');
      return '{{{' + params + '}}}';
    }
  }
});