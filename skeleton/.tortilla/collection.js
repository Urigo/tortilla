var Utils = require('./utils');

/*
  Base collection class. Shares the same properties as a native Array.
 */

function Collection(models) {
  // Either add an array of models or each model individually
  if (!(models instanceof Array)) {
    models = [].slice.call(arguments);
  }

  // The length property is necessary for the collection to function well
  Utils.delegateDescriptor(this, [], 'length');
  // Add all models if provided
  this.push.apply(this, models);
}

// Note that in lots of javascript platforms the Array can't be extended otherwise we
// will have an unexpected behaviour, so instead we re-define the descriptors
Utils.delegateDescriptors(Collection.prototype, Array.prototype);


module.exports = Collection;