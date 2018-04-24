import * as Handlebars from 'handlebars';
import { Paths } from './paths';
import { Renderer } from './renderer';
import { Utils } from './utils';

export interface TortillaConfig {
  render?: {
    transformations: any[];
    blacklist: any[];
  };
}

let config: TortillaConfig = {};

if (Utils.exists(Paths.config)) {
  /* tslint:disable-next-line */
  config = require(Paths.config) as TortillaConfig;
}

export function registerCustomTransformations() {
  if (config.render && config.render.transformations) {
    Object.keys(config.render.transformations).forEach((t) => {
      Renderer.registerTransformation(t, 'diffStep', config.render.transformations[t].bind(this, Handlebars));
    });
  }
}

export function getBlacklist() {
  if (config.render && config.render.blacklist) {
    return config.render.blacklist;
  }

  return null;
}

export const Config = config;
