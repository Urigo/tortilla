var Utils = require('../utils');

/**
  The Translation class delegates the String with additional methods:
  toKebabCase, toStartCase, lowerFirst, upperFirst
 */

function Translation(value) {
  if (typeof value != 'string') {
    throw TypeError('argument 1 must be a string');
  }

  Utils.delegateProperties(this, value, {
    value: function (handler, methodName, args) {
      return handler.apply(value, args);
    },

    get: function (handler, propertyName) {
      return handler.call(value);
    },

    set: function (handler, propertyName, newValue) {
      return handler.call(value, newValue);
    }
  });

  this._value = value;
}

Utils.delegateProperties(Translation.prototype, String.prototype, {
  value: function (handler, methodName, args) {
    return handler.apply(this._value, args);
  },

  get: function (handler, propertyName) {
    return handler.call(this._value);
  },

  set: function (handler, propertyName, value) {
    return handler.call(this._value, value);
  }
});

Object.defineProperty(Translation.prototype, 'constructor', {
  writable: true,
  configurable: true,
  value: Translation
});

[
  'toKebabCase',
  'toStartCase',
  'lowerFirst',
  'upperFirst'
]
.forEach(function (methodName) {
  var methodHandler = Utils[methodName];

  Object.defineProperty(Translation.prototype, methodName, {
    writable: true,
    configurable: true,
    value: function () {
      return methodHandler.call(Utils, this._value);
    }
  });
});


module.exports = Translation;
