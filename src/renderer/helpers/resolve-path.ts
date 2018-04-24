import { Renderer} from '../index';

/**
  A template helper which invokes Renderer.resolve(). This is currently being used
  for testing purposes only.
 */

Renderer.registerHelper('resolvePath', function () {
  const paths = [].filter.call(arguments, arg => typeof arg === 'string');

  return Renderer.resolve(...paths);
});
