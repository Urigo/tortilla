const Renderer = require('..');
const Git = require('../../git');
const Step = require('../../step');
const Translator = require('../../translator');

/**
  Provides a navigation bar between steps. The navigation bar should be rendered
  dynamically based on the current step we're currently in.
 */

const t = Translator.translate.bind(Translator);


Renderer.registerHelper('navStep', function (options) {
  var step = options.hash.step || this.step || Step.currentSuper();
  // If there is no belonging step, don't render anything
  if (!step) return '';

  // Editing root
  if (step == 'root') {
    const anySuperStep = !!Git(['log', 'ORIG_HEAD', '-1', '--grep', '^Step [0-9]\\+:']);
    // If there are no any steps yet, don't show nav bar
    if (!anySuperStep) return '';

    return Renderer.renderTemplateFile('nav-step', {
      nextOnly: true,
      text: t('nav.begin'),
      ref: options.hash.ref || Renderer.resolve('.tortilla/manuals/views/step1.md'),
    });
  }

  // Convert to number just in case, so we can run arbitrary operations
  var step = Number(step);

  // Get an array of all super steps in the current tutorial
  const superSteps = Git([
    'log', 'ORIG_HEAD',
    '--grep', '^Step [0-9]\\+:',
    '--format=%s',
  ]).split('\n')
    .filter(Boolean)
    .map(commitMessage => commitMessage.match(/^Step (\d+)/)[1])
    .map(Number);

  // If there are no super steps at all
  if (superSteps.length == 0) return '';

  // The order is the other way around, this way we save ourselves the sorting
  const recentSuperStep = superSteps[0];

  // If this is the last step
  if (step == recentSuperStep) {
    return Renderer.renderTemplateFile('nav-step', {
      prevOnly: true,
      text: t('nav.prev'),
      ref: options.hash.ref || Renderer.resolve(`step${step - 1}.md`),
    });
  }

  // If this is the first super step
  if (step == 1) {
    return Renderer.renderTemplateFile('nav-step', {
      bidirectional: true,
      nextText: t('nav.next'),
      nextRef: options.hash.nextRef || Renderer.resolve('step2.md'),
      prevText: t('nav.intro'),
      prevRef: options.hash.prevRef || Renderer.resolve('../../../README.md'),
    });
  }

  // Any other case
  return Renderer.renderTemplateFile('nav-step', {
    bidirectional: true,
    nextText: t('nav.next'),
    nextRef: options.hash.nextRef || Renderer.resolve(`step${step + 1}.md`),
    prevText: t('nav.prev'),
    prevRef: options.hash.prevRef || Renderer.resolve(`step${step - 1}.md`),
  });
}, {
  mdWrap: true,
});

Renderer.registerTransformation('medium', 'navStep', (view) => {
  const isPrev = !!view.match('\\|:-');
  const isNext = !!view.match('-:\\|');

  // ⟸ PREVIOUS STEP ║ NEXT STEP ⟹
  if (isPrev && isNext) {
    const prevMatches = view.match(/\[< ([^\]]+)\]\(([^\)]+)\)/);
    const prevText = prevMatches[1];
    const prevRef = prevMatches[2];

    const nextMatches = view.match(/\[([^\]]+) >\]\(([^\)]+)\)/);
    const nextText = nextMatches[1];
    const nextRef = nextMatches[2];

    const prevButton = `⟸ <a href="${prevRef}">${prevText.toUpperCase()}</a>`;
    const nextButton = `<a href="${nextRef}">${nextText.toUpperCase()}</a> ⟹`;

    return `${prevButton} <b>║</b> ${nextButton}`;
  }

  // ⟸ PREVIOUS STEP ║
  if (isPrev) {
    var matches = view.match(/\[< ([^\]]+)\]\(([^\)]+)\)/);
    var text = matches[1];
    var ref = matches[2];

    return `⟸ <a href="${ref}">${text.toUpperCase()}</a> <b>║</b>`;
  }

  // ║ NEXT STEP ⟹
  if (isNext) {
    var matches = view.match(/\[([^\]]+) >\]\(([^\)]+)\)/);
    var text = matches[1];
    var ref = matches[2];

    return `<b>║</b> <a href="${ref}">${text.toUpperCase()}</a> ⟹`;
  }

  return view;
});
