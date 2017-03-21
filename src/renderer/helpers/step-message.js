var Renderer = require('..');
var Step = require('../../step');
var Translator = require('../../translator');
var Utils = require('../../utils');

/**
  Renders a step's commit message including its translation
 */

var t = Translator.translate.bind(Translator);


Renderer.registerHelper('stepMessage', function (options) {
  var params = Utils.extend({}, this, options.hash);
  var commitMessage = params.commitMessage;

  var stepDescriptor = Step.descriptor(commitMessage) || {};
  var stepNumber = stepDescriptor.number || 'root';
  stepDescriptor.message = t('step:' + stepNumber, {
    defaultValue: stepDescriptor.message || commitMessage,
    keySeparator: ':'
  });

  return Renderer.renderTemplateFile('step-message', stepDescriptor);
});
