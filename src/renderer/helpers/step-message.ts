import { Step} from "../../step";
import { Translator} from "../../translator";
import { Utils} from "../../utils";
import { Renderer} from "../index";

/**
  Renders a step's commit message including its translation
 */

const t = Translator.translate.bind(Translator);

Renderer.registerHelper("stepMessage", function(options) {
  const params = Utils.extend({}, this, options.hash);
  const commitMessage = params.commitMessage;

  const stepDescriptor: any = Step.descriptor(commitMessage) || {};
  const stepNumber = stepDescriptor.number || "root";
  stepDescriptor.message = t(`step:${stepNumber}`, {
    defaultValue: stepDescriptor.message || commitMessage,
    keySeparator: ":",
  });

  return Renderer.renderTemplateFile("step-message", stepDescriptor);
});
