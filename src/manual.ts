import * as fs from 'fs-extra';
import * as Minimist from 'minimist';
import * as Path from 'path';

import { Config } from './config';
import { Git } from './git';
import { localStorage as LocalStorage } from './local-storage';
import { Paths } from './paths';
import { Renderer } from './renderer';
import { Step } from './step';
import { getTranslator } from './translator';
import { Utils } from './utils';

Config.registerCustomTransformations();

(async () => {
  if (require.main !== module) {
    return;
  }

  const argv = Minimist(process.argv.slice(2), {
    string: ['_'],
    boolean: ['all', 'root']
  });

  const method = argv._[0];
  let step = argv._[1];
  const all = argv.all;
  const root = argv.root;

  if (!step && all) {
    step = 'all';
  }
  if (!step && root) {
    step = 'root';
  }

  if (method === 'render') {
    await renderManual(step);
  }
})().catch(console.error);

async function renderManual(step?: string | (() => void)) {
  /**
   * Generate Table of Contents here, must not be rebasing.
   */
  if (!Git.rebasing()) {
    const log = [Git(['--no-pager', 'log', '--format=%s'], { cwd: Git.getCWD() })]
      .map(str => str.split('\n'))
      .map(arr => JSON.stringify(arr, null, 4))
      .pop();

    LocalStorage.setItem('TABLE_OF_CONTENTS', log);
  }

  if (typeof step === 'string') {
    const isSuperStep = !step.split('.')[1];

    if (!isSuperStep) {
      throw TypeError('Provided step must be a super step');
    }
  } else {
    const superMessage = Step.recentSuperCommit('%s') || '';
    const stepDescriptor: any = Step.descriptor(superMessage) || {};

    step = stepDescriptor.number || 'root';
  }

  // Convert all manuals since the beginning of history
  if (step === 'all') {
    return Git.print(['rebase', '-i', '--root', '--keep-empty'], {
      env: {
        GIT_SEQUENCE_EDITOR: `node ${Paths.tortilla.editor} render`
      }
    });
  }

  // Indicates whether we should continue rebasing at the end of the invocation.
  // If this script is not run by the git editor we should continue rebasing
  const shouldContinue = !Git.rebasing();

  // Enter rebase, after all this is what rebase-continue is all about
  if (shouldContinue) {
    Utils.scopeEnv(Step.edit.bind(Step, step), {
      TORTILLA_STDIO: 'ignore'
    });
  }

  const localesDir = `${Paths.manuals.templates}/locales`;
  let locales = [''];

  if (Utils.exists(localesDir)) {
    locales = locales.concat(fs.readdirSync(localesDir));
  }

  // Render manual for each locale

  for (let locale of locales) {
    // Fetch the current manual and other useful models
    const manualTemplatePath = getManualTemplatePath(step, locale);
    const manualTemplate = fs.readFileSync(manualTemplatePath, 'utf8');
    const manualViewPath = getManualViewPath(step, locale);
    const commitMessage = getStepCommitMessage(step);

    const manualView = await renderManualView(manualTemplate, {
      step,
      commitMessage,
      templatePath: manualTemplatePath,
      viewPath: manualViewPath,
      language: locale
    });

    // Rewrite manual
    await fs.ensureDir(Paths.manuals.views);

    // In case a custom render target is specified, ensure its dir exists
    const target = process.env.TORTILLA_RENDER_TARGET;

    if (target) {
      const customTargetDir = Path.resolve(Paths.manuals.views, target);
      await fs.ensureDir(customTargetDir);
    }

    await fs.ensureDir(Path.dirname(manualViewPath));
    await fs.writeFile(manualViewPath, manualView);

    // Amend changes
    Git(['add', manualViewPath]);

    // The following code is dedicated for locale-free manuals
    if (locale) {
      return;
    }

    const symlinkPath = Path.resolve(Paths.manuals.views, 'root.md');

    // If this is the root step, create a symlink to README.md if not yet exists
    if (step !== 'root' || Utils.exists(symlinkPath)) {
      return;
    }

    const relativeSymlink = Path.relative(Path.dirname(symlinkPath), manualViewPath);

    await fs.symlink(relativeSymlink, symlinkPath);

    Git(['add', symlinkPath]);
  }

  if (shouldContinue || Git.stagedFiles().length) {
    Git.print(['commit', '--amend'], {
      env: {
        GIT_EDITOR: true
      }
    });
  }

  if (shouldContinue) {
    Git.print(['rebase', '--continue'], {
      env: {
        GIT_EDITOR: true
      }
    });
  }
}

async function renderManualView(manual, scope) {
  let header;
  let body;
  let footer;

  const translator = await getTranslator();

  await translator.scopeLanguage(scope.language, () => {
    header = Renderer.renderTemplateFile('header', scope);
    body = Renderer.renderTemplate(manual, scope);
    footer = Renderer.renderTemplateFile('footer', scope);
  });

  return [header, body, footer].join('\n');
}

function getManualTemplatePath(step, locale) {
  locale = locale ? `locales/${locale}` : '';

  const baseDir = Path.resolve(Paths.manuals.templates, locale);
  const fileName = step === 'root' ? 'root.tmpl' : `step${step}.tmpl`;

  return Path.resolve(baseDir, fileName);
}

function getManualViewPath(step, locale) {
  locale = locale ? `locales/${locale}` : '';

  // The sub-dir of our views in case a custom render target is specified
  const subDir = process.env.TORTILLA_RENDER_TARGET || '';
  const fileName = step === 'root' ? 'root.md' : `step${step}.md`;

  // If sub-dir exists, return its path e.g. manuals/view/medium
  if (subDir) {
    return Path.resolve(Paths.manuals.views, subDir, locale, fileName);
  }
  // If we're trying to render root step, return README.md
  if (step === 'root' && !locale) {
    return Paths.readme;
  }

  // Resolve normally e.g. manuals/views/step1.md
  return Path.resolve(Paths.manuals.views, locale, fileName);
}

function getStepCommitMessage(step) {
  if (step === 'root') {
    const rootHash = Git.rootHash();

    return Git(['log', '-1', rootHash, '--format=%s']);
  }

  return Git(['log', '-1', '--grep', `^Step ${step}:`, '--format=%s']);
}

export const Manual = {
  render: renderManual,
  manualTemplatePath: getManualTemplatePath,
  manualViewPath: getManualViewPath
};
