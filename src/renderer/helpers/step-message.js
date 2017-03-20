var Renderer = require('..');
var Step = require('../../step');
var Translator = require('../../translator');


var t = Translator.translate.bind(Translator);


Renderer.registerHelper('stepMessage', function () {
  var stepDescriptor = Step.descriptor(this.commitMessage) || {};
  var stepNumber = stepDescriptor.number || 'root';
  stepDescriptor.message = t('step:' + stepNumber, {
    defaultValue: stepDescriptor.message || this.commitMessage,
    keySeparator: ':'
  });

  return Renderer.renderTemplateFile('step-message', stepDescriptor);
});
