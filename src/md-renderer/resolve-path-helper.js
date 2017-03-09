var MDRenderer = require('.');

/*
  A template helper which invokes MDRenderer.resolve()
 */

MDRenderer.registerHelper('resolve_path', function () {
  var paths = [].filter.call(arguments, function (arg) {
    return typeof arg == 'string';
  });

  return MDRenderer.resolve.apply(MDRenderer, paths);
});
