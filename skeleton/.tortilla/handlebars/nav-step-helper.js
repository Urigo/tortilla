var Handlebars = require('handlebars');
var Git = require('../git');
var Step = require('../step');


Handlebars.registerMDHelper('nav_step', function() {
  var stepCommitMessage = Step.recentCommit('%s');

  // Editing root
  if (!stepCommitMessage) return Handlebars.render('next-button', {
    text: 'Begin Tutorial',
    ref: 'steps/step1.md'
  });

  var stepDescriptor = Step.superDescriptor(stepCommitMessage);
  // Only super steps are relevant
  if (!stepDescriptor) return '';

  var stepTags = Git(['tag', '-l', 'step*'])
    .split('\n')
    .filter(Boolean);

  // If this is the only step or there are no steps at all
  if ((stepTags.length - 2) < 0) return;

  var currentTag = 'step' + stepDescriptor.number;

  // If this is the first step
  if (currentTag == 'step1') return Handlebars.render('next-button', {
    text: 'Next Step',
    ref: 'steps/step2.md'
  });

  var recentTag = stepTags[stepTags.length - 1];

  // If this is the last step
  if (currentTag == recentTag) return Handlebars.render('prev-button', {
    text: 'Previous Step',
    ref: 'steps/step' + (stepDescriptor.number - 1) + '.md'
  });

  // Any other case
  return Handlebars.render('nav-buttons', {
    next: {
      text: 'Next Step',
      ref: 'steps/step' + (stepDescriptor.number + 1) + '.md'
    },
    prev: {
      text: 'Previous Step',
      ref: 'steps/step' + (stepDescriptor.number - 1) + '.md'
    }
  });
});