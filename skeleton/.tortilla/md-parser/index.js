var MDBlocksCollection = require('./md-blocks-collection');
var MDBlock = require('./md-block');
var MDTextBlock = require('./md-text-block');

/*
  Markdown parser will parse a given markdown into a collection of blocks.
 */

 var Blocks = {};


// Returns a blocks collection of the provided markdown string
function parseAllBlocks(md, recursive) {
  var blocks = new MDBlocksCollection();
  if (!md) return blocks;

  var offset = 0;
  var block = parseFirstBlock(md, recursive);

  // If block not found it means we finished a recursive operation
  if (!block) {
    var text = new MDTextBlock(md);
    blocks.push(text);
    return blocks;
  }

  if (block._start != 0) {
    var text = new MDTextBlock(md.slice(0, block._start - 1));
    blocks.push(text);
  }

  // As long as there is a block join them with a text block whos type and name are non
  while (block) {
    // Check the block is the first chunk in the recent markdown
    if (offset) {
      // If so, update the indices with the stored offset
      block._start += offset;
      block._end += offset;

      // Generate a text block with the leftover
      if (offset != block._start) {
        var text = new MDTextBlock(md.slice(offset, block._start - 1));
        blocks.push(text);
      }
    }

    blocks.push(block);

    // Add line skip
    offset = block._end + 1;
    // Generate next blocks from the current block's end index
    block = parseFirstBlock(md.substr(offset), recursive);
  }

  // Checks if there are leftovers and if so put it in a text block
  if (offset <= md.length) {
    var text = new MDTextBlock(md.slice(offset, md.length));
    blocks.push(text);
  }

  return blocks;
}

function parseFirstBlock(md, recursive) {
  var match = md.match(/\[\{\]: <([^>]*)> \([^\)]*\)/);
  if (!match) return;

  var type = match[1];
  var Block = Blocks[type] || MDBlock;
  return new Block(md, recursive);
}

// Returns content wrapped by block open and close
function wrapBlockContent(type, name, params, content) {
  if (!content) {
    content = params;
    params = [];
  }

  // Building parameters string including name e.g. 'diff_step 1.1'
  params = [name].concat(params).join(' ');

  return [
    '[{]: <' + type + '> (' + params + ')', content, '[}]: #'
  ].join('\n');
}

// Let's you define a custom block type which will be used in the parsing process
function registerBlockType(type, descriptors) {
  // Create inheriting class dynamically
  var Block = function () {
    return MDBlock.apply(this, arguments);
  }

  Block.prototype = Object.create(MDBlock.prototype, descriptors);

  // If everything went well, stash it
  Blocks[type] = Block;
  // Chainable
  return module.exports;
}


module.exports = {
  parse: parseAllBlocks,
  wrap: wrapBlockContent,
  registerBlockType: registerBlockType
};

// Built-in block types
require('./md-helper-block');
require('./md-partial-block');