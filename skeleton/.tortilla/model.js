var Utils = require('./utils');

/*
  Base model class.
 */

function Model(props) {
  Utils.extend(this, props);
}


module.exports = Model;