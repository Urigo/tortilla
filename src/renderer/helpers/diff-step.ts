import * as Handlebars from 'handlebars';
import * as ParseDiff from 'parse-diff';
import { Config } from '../../config';
import { Git} from '../../git';
import {Submodule} from '../../submodule';
import {Translator} from '../../translator';
import { Utils} from '../../utils';
import { Renderer} from '../index';

/**
  Renders step diff in a pretty markdown format. For example {{{ diffStep 1.1 }}}
  will render as:

  #### Step 1.1

  ##### Changed /path/to/file.js
  ```diff
  @@ -1,3 +1,3 @@
  +┊ ┊1┊foo
  -┊1┊ ┊bar
   ┊2┊2┊baz🚫↵
  ```

  We can also render this helper to be suitable for use in Medium (https://medium.com/)
  by setting the environment variable TORTILLA_RENDER_TARGET to 'medium':

  #### Step 1.1

  ##### Changed /path/to/file.js
  <pre>
  <i>@@ -1,3 +1,3 @@</i>
  <b>+┊ ┊1┊foo</b>
   ┊2┊2┊baz🚫↵
  </pre>

  Note: Removals won't be shown to reduce complexity, since medium can render only
  very simple stuff
 */

const t = Translator.translate.bind(Translator);

Renderer.registerHelper('diffStep', (step, options) => {
  const hash = options.hash;

  let pattern;
  // Will print diff of multiple specified files
  // e.g. files="foo/a, bar/b"
  if (hash.files) {
    pattern = new RegExp(hash.files.replace(/\s*,\s*/g, '|').replace(/\./g, '\\.'));
  // Will print diff of all possible files
  } else {
    pattern = /.*/;
  }

  let cwd = Git(['rev-parse', '--show-toplevel']);
  // In case a submodule was specified then all our git commands should be executed
  // from that module
  if (hash.module) {
    // Use the cloned repo that is used for development
    if (process.env.TORTILLA_SUBDEV) {
      cwd = Submodule.getCwd(hash.module);
    } else {
      cwd = `${cwd}/${hash.module}`;
    }
  }

  const stepData = Git.recentCommit([
    `--grep=^Step ${step}:`, '--format=%h %s',
  ], {
    cwd,
  }).split(' ')
    .filter(Boolean);

  // In case step doesn't exist just render the error message.
  // It's better to have a silent error like this rather than a real one otherwise
  // the rebase process will skrew up very easily and we don't want that
  if (!hash.noTitle && !stepData.length) {
    return `#### ${t('step.commit.missing', { number: step })}`;
  }

  const stepHash = stepData[0];
  let commitReference

  // URL composition should be done in relation to the submodule
  if (hash.module) {
    commitReference = Utils.tempCwd(() => {
      return Renderer.resolve('~/commit', stepHash);
    }, cwd);
  }
  else {
    commitReference = Renderer.resolve('~/commit', stepHash);
  }

  // Translate step message, if at all
  const stepMessage = Renderer.call('stepMessage', {
    commitMessage: stepData.slice(1).join(' '),
    module: hash.module,
  });

  let stepTitle;

  // If this is a relative path, we won't reference the commit
  if (commitReference.isRelative) {
    stepTitle = `#### ${stepMessage}`;
  } else {
    stepTitle = `#### [${stepMessage}](${commitReference})`;
  }

  const diff = Git(['diff', `${stepHash}^`, stepHash], { cwd });

  const blacklist: any = Config.getBlacklist();

  // Convert diff string to json format
  const files = ParseDiff(diff).filter((file) =>
    // Filter files which match the given pattern
    (file.from.match(pattern) || file.to.match(pattern)) &&
    (!blacklist || (!file.to.match(blacklist) && !file.from.match(blacklist))));

  const mdDiffs = files
    .map(getMdDiff)
    .join('\n\n');

  if (hash.noTitle) {
    return mdDiffs;
  }

  return `${stepTitle}\n\n${mdDiffs}`;
}, {
  mdWrap: true,
});

// Gets all diff chunks in a markdown format for a single file
function getMdDiff(file) {
  let fileTitle;

  if (file.new) {
    fileTitle = `##### ${t('diff.added', { path: file.to })}`;
  } else if (file.deleted) {
    fileTitle = `##### ${t('diff.deleted', { path: file.from })}`;
  } else if (!file.chunks.length) {
    fileTitle = `##### ${t('diff.renamed', { from: file.from, to: file.to })}`;
  } else {
    fileTitle = `##### ${t('diff.changed', { path: file.from })}`;
  }

  const mdChunks = file.chunks
    .map(getMdChunk)
    .join('\n');

  return `${fileTitle}\n${mdChunks}`;
}

// Gets diff in a markdown format for a single chunk
function getMdChunk(chunk) {
  // Grab chunk data since it's followed by irrelevant content
  const chunkData = chunk.content.match(/^@@\s+\-(\d+),?(\d+)?\s+\+(\d+),?(\d+)?\s@@/)[0];
  const padLength = getPadLength(chunk.changes);

  const mdChanges = chunk.changes
    .map(getMdChange.bind(null, padLength))
    .join('\n')
    // Replace EOF flag with a pretty format and append it to the recent line
    .replace(/\n\\ No newline at end of file/g, '🚫↵');

  // Wrap changes with markdown 'diff'
  return ['```diff', chunkData, mdChanges, '```'].join('\n');
}

// Gets line in a markdown format for a single change
function getMdChange(padLength, change) {
  // No newline at end of file
  if (change.content[0] === '\\') {
    return change.content;
  }

  let addLineNum = '';
  let delLineNum = '';
  let sign = '';

  switch (change.type) {
    case 'add':
      sign = '+';
      addLineNum = change.ln;
      break;

    case 'del':
      sign = '-';
      delLineNum = change.ln;
      break;

    case 'normal':
      sign = ' ';
      addLineNum = change.ln2;
      delLineNum = change.ln1;
      break;
    default:
      break;
  }

  addLineNum = Utils.pad(addLineNum, padLength);
  delLineNum = Utils.pad(delLineNum, padLength);

  // Using content.slice(1) since we want to remove '-\+' prefixes
  return [sign, delLineNum, addLineNum, change.content.slice(1)].join('┊');
}

// Gets the pad length by the length of the max line number in changes
function getPadLength(changes) {
  const maxLineNumber = changes.reduce((max, change) => (
    Math.max(max, change.ln || 0, change.ln1 || 0, change.ln2 || 0)
  ), 1);

  return maxLineNumber.toString().length;
}

Renderer.registerTransformation('medium', 'diffStep', (view) => {
  const diffBlock = [
    '<i>╔══════╗</i>',
    '<i>║ diff ║</i>',
    '<i>╚══════╝</i>',
  ].join('\n');

  return view
    .split(/```diff\n|\n```(?!diff)/).map((chunk, index) => {
      if (index % 2 === 0) { return chunk; }

      const content = Handlebars.escapeExpression(chunk)
        // Make diff changes (e.g. @@ -1,3 +1,3 @@) italic
        .replace(/^@.+$/m, diffBlock)
        // Remove removals
        .replace(/\n\-.+/g, '')
        // Bold additions
        .replace(/^(\+.+)$/mg, '<b>$&</b>');

      // Wrap with <pre> tag
      return `<pre>\n${content}\n</pre>`;
    })
    .join('');
});
