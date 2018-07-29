import * as Handlebars from 'handlebars';
import * as ParseDiff from 'parse-diff';
import { Config } from '../../config';
import { Git } from '../../git';
import { Release } from '../../release'
import { Submodule } from '../../submodule';
import { Translator } from '../../translator';
import { Utils} from '../../utils';
import { Renderer } from '../index';

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

Renderer.registerHelper('diffFile', (file, options) => {
  const hash = options.hash
  const srcRelease = hash.srcRelease || Release.current();
  const dstRelease = hash.dstRelease || Release.all()[1];

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

  const fileDiff = Git(['diff', `${srcRelease}:${hash}`, dstRelease], { cwd })

  return getMdDiff(file)
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

Renderer.registerTransformation('medium', 'diffFile', (view) => {
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
