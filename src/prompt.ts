import { prompt as originalPrompt } from 'inquirer';

function pullAnswerFromEnv() {
  const answers = (process.env.TORTILLA_PROMPT_ANSWERS || '').split(',');
  const result = answers.shift();
  process.env.TORTILLA_PROMPT_ANSWERS = answers.join(',');

  return result;
}

export async function prompt(options) {
  if (process.env.TORTILLA_DURING_TESTS) {
    return pullAnswerFromEnv();
  }

  const answers = await originalPrompt(options);

  return answers[options[0].name];
}
