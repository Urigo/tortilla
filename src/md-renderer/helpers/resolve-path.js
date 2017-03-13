var MDRenderer = require('..');

/**
  A template helper which invokes MDRenderer.resolve(). This is currently being used
  for testing purposes only.
 */

MDRenderer.registerHelper('_resolve_path', function () {
  var paths = [].filter.call(arguments, function (arg) {
    return typeof arg == 'string';
  });

  return MDRenderer.resolve.apply(MDRenderer, paths);
});
