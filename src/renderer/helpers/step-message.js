var Renderer = require('..');
var Step = require('../../step');

Renderer.registerHelper('stepMessage', function () {
  const stepDescriptor = Step.descriptor(this.commitMessage);

  if (stepDescriptor) {
    return Renderer.renderTemplateFile('step-message', stepDescriptor);
  }

  return Renderer.renderTemplateFile('step-message', {
    message: this.commitMessage
  });
});
