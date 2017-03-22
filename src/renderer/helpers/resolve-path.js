var Renderer = require('..');

/**
  A template helper which invokes Renderer.resolve(). This is currently being used
  for testing purposes only.
 */

Renderer.registerHelper('resolvePath', function () {
  var paths = [].filter.call(arguments, function (arg) {
    return typeof arg == 'string';
  });

  return Renderer.resolve.apply(Renderer, paths);
});
