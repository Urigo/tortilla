var DiffParse = require('diff-parse');
var Handlebars = require('handlebars');
var Git = require('../git');
var Utils = require('../utils');

/*
  Renders step diff in a pretty markdown format. For example {{{diff_step 1.1}}}
  will render as:

  [{]: <helper> (diff_step 1.1)
  #### Step 1.1

  ##### Changed /path/to/file.js
  ```diff
  @@ -1,3 +1,3 @@
  +┊ ┊1┊foo
  -┊1┊ ┊bar
   ┊2┊2┊baz🚫⮐
  ```
  [}]: #

  VERY IMPORTANT NOTE

  There are two packages for parsing diff, one is called 'diff-parse' (Which I'm using
  right now) and the other is 'parse-diff'. 'diff-parse' is simpler than 'parse-diff'
  and doesn't contain any reference to changes chunks, it means that if we have a very
  long diff output it will appear continuous but we would expect it to have small 'skips'
  which are called chunks. For the sake of simplisity I'm now using 'diff-parse' but we
  will have to upgrade to 'parse-diff'.
 */

Handlebars.registerMDHelper('diff_step', function(step) {
  var stepHash = Git.recentCommit(['--grep=^Step ' + step, '--format=%h']);
  // In case step doesn't exist just render the error message.
  // It's better to have a silent error like this rather than a real one otherwise
  // the rebase process will skrew up very easily and we don't want that
  if (!stepHash) return 'STEP ' + step + ' NOT FOUND!';

  var stepTitle = '#### Step ' + step;
  var diff = Git(['diff', stepHash]);
  // Convert diff string to json format
  var files = DiffParse(diff);

  var diffs = files.map(function (file) {
    var fileTitle;

    if (file.from != '/dev/null' && file.to != '/dev/null')
      fileTitle = '##### Changed ' + file.from;
    else if (file.from != '/dev/null')
      fileTitle = '##### Added ' + file.from;
    else if (file.to != '/dev/null')
      fileTitle = '##### Deleted ' + file.to;

    if (!fileTitle) return;

    var diff = '```diff\n' + getFileDiff(file) + '\n```';

    return fileTitle + '\n' + diff;

  }).filter(Boolean)
    .join('\n\n');

  return stepTitle + '\n\n' + diffs;
});

function getFileDiff(file) {
  var lines = file.lines;
  if (!lines) return;

  var lastLine = lines[lines.length - 1];
  if (!lastLine) return;

  var lastLineNumber = Math.max(
    lastLine.ln || 0,
    lastLine.ln1 || 0,
    lastLine.ln2 || 0
  );

  if (!lastLineNumber) return;

  var padLength = lastLineNumber.toString().length;
  var postFix = '';

  var diff = lines.map(function (line) {
    if (line.content == '\\ No newline at end of file') return postFix = '🚫⮐';

    var addLineNum = '';
    var delLineNum = '';
    var sign = '';

    switch (line.type) {
      case 'add':
        sign = '+';
        addLineNum = line.ln;
        break;

      case 'del':
        sign = '-';
        delLineNum = line.ln;
        break;

      case 'normal':
        sign = ' ';
        addLineNum = line.ln2;
        delLineNum = line.ln1;
        break;

      case 'chunk': return line.content;
      default: return;
    }

    if (!sign) return;

    addLineNum = Utils.padLeft(addLineNum, padLength);
    delLineNum = Utils.padLeft(delLineNum, padLength);

    return sign + '┊' + delLineNum + '┊' + addLineNum + '┊' + line.content;

  }).filter(Boolean)
    .join('\n');

  return diff + postFix;
}