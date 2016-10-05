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
  // If block is not defined it means we finished a recursive operation
  if (!block) return blocks;

  if (block.start != 0) {
    var text = new MDTextBlock({
      start: 0,
      end: block.start - 1
    }, md, recursive);

    blocks.push(text);
  }

  // As long as there is a block join them with a text block whos type and name are non
  while (block) {
    // Check the block is the first chunk in the recent markdown
    if (offset) {
      // If so, update the indices with the stored offset
      block.start += offset;
      block.end += offset;

      // Generate a text block with the leftover
      if (offset != block.start) {
        var text = new MDTextBlock({
          start: offset,
          end: block.start - 1 // Remove line skip
        }, md, recursive);

        blocks.push(text);
      }
    }

    blocks.push(block);

    // Add line skip
    offset = block.end + 1;
    // Generate next blocks from the current block's end index
    block = parseFirstBlock(md.substr(offset), recursive);
  }

  // Checks if there are leftovers and if so put it in a text block
  if (offset <= md.length) {
    var text = new MDTextBlock({
      start: offset,
      end: md.length
    }, md, recursive);

    blocks.push(text);
  }

  return blocks;
}

// Parses the first block detected in a given markdown string
function parseFirstBlock(md, recursive) {
  // e.g. [}]: <match1> (match2)
  var match = md.match(/\[\{\]: <([^>]*)> \(([^\)]*)\)/);
  if (!match) return;

  // e.g. [name, param1, param2]
  var split = match[2].split(' ');

  var props = {
    type: match[1],
    name: split[0],
    params: split.slice(1),
    start: match.index,
    end: match.index + match[0].length
  };

  // e.g. [{] or [}]
  var pattern = /\[(\{|\})\]: .+/;
  var nested = 1;

  // Handle opening and closing and try to find the matching closing
  while (nested) {
    match = md.substr(props.end).match(pattern);
    // If no match found and we kept going on in this loop it means that there is
    // no closing to the detected block start
    if (!match) throw Error(props.type + ' ' + props.name + ' close not found');

    // Calculate with offset
    props.end += match.index + match[0].length;

    // Update the number of blocks open we had so far
    switch (match[1]) {
      case '{': ++nested; break;
      case '}': --nested; break;
    }
  }

  // Search for the appropriate block model
  var Block = Blocks[props.type] || MDBlock;
  // Initialize a new instance of it
  return new Block(props, md, recursive);
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
  registerBlockType: registerBlockType
};

// Built-in block types
require('./md-helper-block');
require('./md-partial-block');