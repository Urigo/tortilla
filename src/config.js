const Handlebars = require('handlebars');
const Paths = require('./paths');
const Renderer = require('./renderer');
const Utils = require('./utils');

let config = {};

if (Utils.exists(Paths.config)) {
  config = require(Paths.config);
}

module.exports = {
  registerCustomTransformations() {
    if (config.render && config.render.transformations) {
      Object.keys(config.render.transformations).forEach((t) => {
        Renderer.registerTransformation(t, 'diffStep', config.render.transformations[t].bind(this, Handlebars));
      });
    }
  },
  getBlacklist() {
    if (config.render && config.render.blacklist) {
      return config.render.blacklist;
    }

    return null;
  },
};
