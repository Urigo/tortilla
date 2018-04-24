import { Utils} from "../utils";

/**
  The Translation class delegates the String with additional methods:
  toKebabCase, toStartCase, lowerFirst, upperFirst
 */

export function Translation(value) {
  if (typeof value !== "string") {
    throw TypeError("argument 1 must be a string");
  }

  Utils.delegateProperties(this, value, {
    value(handler, methodName, args) {
      return handler.apply(value, args);
    },

    get(handler, propertyName) {
      return handler.call(value);
    },

    set(handler, propertyName, newValue) {
      return handler.call(value, newValue);
    },
  });

  this._value = value;
}

Utils.delegateProperties(Translation.prototype, String.prototype, {
  value(handler, methodName, args) {
    return handler.apply(this._value, args);
  },

  get(handler, propertyName) {
    return handler.call(this._value);
  },

  set(handler, propertyName, value) {
    return handler.call(this._value, value);
  },
});

Object.defineProperty(Translation.prototype, "constructor", {
  writable: true,
  configurable: true,
  value: Translation,
});

[
  "toKebabCase",
  "toStartCase",
  "lowerFirst",
  "upperFirst",
]
.forEach((methodName) => {
  const methodHandler = Utils[methodName];

  Object.defineProperty(Translation.prototype, methodName, {
    writable: true,
    configurable: true,
    value() {
      return methodHandler.call(Utils, this._value);
    },
  });
});
