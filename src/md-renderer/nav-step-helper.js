var MDRenderer = require('.');
var Git = require('../git');
var Step = require('../step');

/*
  Provides a navigation bar between steps. The navigation bar should be rendered
  dynamically based on the current step we're currently in.
 */

MDRenderer.registerHelper('nav_step', function(options) {
  var step = options.hash.step || this.step || Step.currentSuper();
  // If there is no belonging step, don't render anything
  if (!step) return '';

  // Editing root
  if (step == 'root') {
    var anySuperStep = !!Git(['log', 'ORIG_HEAD', '-1', '--grep', '^Step [0-9]\\+:']);
    // If there are no any steps yet, don't show nav bar
    if (!anySuperStep) return '';

    return renderNextButton({
      text: 'Begin Tutorial',
      ref: options.hash.ref || 'manuals/views/step1.md'
    });
  }

  // Convert to number just in case, so we can run arbitrary operations
  var step = Number(step);

  // Get an array of all super steps in the current tutorial
  var superSteps = Git([
    'log', 'ORIG_HEAD',
    '--grep', '^Step [0-9]\\+:',
    '--format=%s'
  ]).split('\n')
    .filter(Boolean)
    .map(function (commitMessage) { return commitMessage.match(/^Step (\d+)/)[1] })
    .map(Number);

  // If there are no super steps at all
  if (superSteps.length == 0) return '';

  // The order is the other way around, this way we save ourselves the sorting
  var recentSuperStep = superSteps[0];

  // If this is the last step
  if (step == recentSuperStep)
    return renderPrevButton({
      text: 'Previous Step',
      ref: options.hash.ref || 'step' + (step - 1) + '.md'
    });

  // If this is the first super step
  if (step == 1)
    return renderNavButtons({
      next_text: 'Next Step',
      next_ref: options.hash.next_ref || 'step2.md',
      prev_text: 'Intro',
      prev_ref: options.hash.prev_ref || '../../README.md'
    });

  // Any other case
  return renderNavButtons({
    next_text: 'Next Step',
    next_ref: options.hash.next_ref || 'step' + (step + 1) + '.md',
    prev_text: 'Previous Step',
    prev_ref: options.hash.prev_ref || 'step' + (step - 1) + '.md'
  });
});

// Render 'next button' template
function renderNextButton(scope) {
  // ║ NEXT STEP ⟹
  if (process.env.TORTILLA_RENDER_TARGET == 'medium') {
    return '<b>║</b> <a href="' + scope.ref +
      '">' + scope.text.toUpperCase() + '</a> ⟹';
  }

  return MDRenderer.renderTemplateFile('next-button',scope);
}

// Render 'previous button' template
function renderPrevButton(scope) {
  // ⟸ PREVIOUS STEP ║
  if (process.env.TORTILLA_RENDER_TARGET == 'medium') {
    return '⟸ <a href="' + scope.ref + '">' +
      scope.text.toUpperCase() + '</a> <b>║</b>';
  }

  return MDRenderer.renderTemplateFile('prev-button', scope);
}

// Render 'navigation buttons' template
function renderNavButtons(scope) {
  // ⟸ PREVIOUS STEP ║ NEXT STEP ⟹
  if (process.env.TORTILLA_RENDER_TARGET == 'medium') {
    var prevButton = '⟸ <a href="' + scope.prev_ref + '">' +
      scope.prev_text.toUpperCase() + '</a>';
    var nextButton = '<a href="' + scope.next_ref + '">' +
      scope.next_text.toUpperCase() + '</a> ⟹';

    return prevButton + ' <b>║</b> ' + nextButton;
  }

  return MDRenderer.renderTemplateFile('nav-buttons', scope);
}
