const Renderer = require('..');
const Step = require('../../step');
const Translator = require('../../translator');
const Utils = require('../../utils');

/**
  Renders a step's commit message including its translation
 */

const t = Translator.translate.bind(Translator);


Renderer.registerHelper('stepMessage', function (options) {
  const params = Utils.extend({}, this, options.hash);
  const commitMessage = params.commitMessage;

  const stepDescriptor = Step.descriptor(commitMessage) || {};
  const stepNumber = stepDescriptor.number || 'root';
  stepDescriptor.message = t(`step:${stepNumber}`, {
    defaultValue: stepDescriptor.message || commitMessage,
    keySeparator: ':',
  });

  return Renderer.renderTemplateFile('step-message', stepDescriptor);
});
