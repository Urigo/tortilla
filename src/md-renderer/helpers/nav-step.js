var MDRenderer = require('..');
var Git = require('../../git');
var Step = require('../../step');
var Translator = require('../../translator');

/**
  Provides a navigation bar between steps. The navigation bar should be rendered
  dynamically based on the current step we're currently in.
 */

var t = Translator.translate.bind(Translator);


MDRenderer.registerHelper('nav_step', function(options) {
  var step = options.hash.step || this.step || Step.currentSuper();
  // If there is no belonging step, don't render anything
  if (!step) return '';

  // Editing root
  if (step == 'root') {
    var anySuperStep = !!Git(['log', 'ORIG_HEAD', '-1', '--grep', '^Step [0-9]\\+:']);
    // If there are no any steps yet, don't show nav bar
    if (!anySuperStep) return '';

    return MDRenderer.renderTemplateFile('next-button', {
      text: t('tutorial.nav.begin'),
      ref: options.hash.ref || MDRenderer.resolve('manuals/views/step1.md')
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
    return MDRenderer.renderTemplateFile('prev-button', {
      text: t('step.nav.prev'),
      ref: options.hash.ref || MDRenderer.resolve('step' + (step - 1) + '.md')
    });

  // If this is the first super step
  if (step == 1)
    return MDRenderer.renderTemplateFile('nav-buttons', {
      next_text: t('step.nav.next'),
      next_ref: options.hash.next_ref || MDRenderer.resolve('step2.md'),
      prev_text: t('tutorial.nav.intro'),
      prev_ref: options.hash.prev_ref || MDRenderer.resolve('../../README.md')
    });

  // Any other case
  return MDRenderer.renderTemplateFile('nav-buttons', {
    next_text: t('step.nav.next'),
    next_ref: options.hash.next_ref || MDRenderer.resolve('step' + (step + 1) + '.md'),
    prev_text: t('step.nav.prev'),
    prev_ref: options.hash.prev_ref || MDRenderer.resolve('step' + (step - 1) + '.md')
  });
});

MDRenderer.registerTransformation('medium', 'nav_step', function (view) {
  var isPrev = !!view.match('\\|:-');
  var isNext = !!view.match('-:\\|');

  // ⟸ PREVIOUS STEP ║ NEXT STEP ⟹
  if (isPrev && isNext) {
    var prevMatches = view.match(/\[< ([^\]]+)\]\(([^\)]+)\)/);
    var prevText = prevMatches[1];
    var prevRef = prevMatches[2];

    var nextMatches = view.match(/\[([^\]]+) >\]\(([^\)]+)\)/);
    var nextText = nextMatches[1];
    var nextRef = nextMatches[2];

    var prevButton = '⟸ <a href="' + prevRef + '">' + prevText.toUpperCase() + '</a>';
    var nextButton = '<a href="' + nextRef + '">' + nextText.toUpperCase() + '</a> ⟹';

    return prevButton + ' <b>║</b> ' + nextButton;
  }

  // ⟸ PREVIOUS STEP ║
  if (isPrev) {
    var matches = view.match(/\[< ([^\]]+)\]\(([^\)]+)\)/);
    var text = matches[1];
    var ref = matches[2];

    return '⟸ <a href="' + ref + '">' + text.toUpperCase() + '</a> <b>║</b>';
  }

  // ║ NEXT STEP ⟹
  if (isNext) {
    var matches = view.match(/\[([^\]]+) >\]\(([^\)]+)\)/);
    var text = matches[1];
    var ref = matches[2];

    return '<b>║</b> <a href="' + ref + '">' + text.toUpperCase() + '</a> ⟹';
  }

  return view;
});
