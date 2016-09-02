var Fs = require('fs');
var Minimist = require('minimist');


var argv = Minimist(process.argv.slice(2));
var rebaseFilePath = argv._[0];
var rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
var newRebaseFileContent = rebaseFileContent;

if (argv.edit)
  editStep();
else if (argv.reword)
  rewordStep(argv.message);

Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);


function editStep() {
  var commits = disassemblyCommits();

  if (commits) {
    commits.forEach(function (commit) {
      if (commit.message.match(/Step \d+\:/)) {
        return commit.method = 'edit';
      }
      if (commit.message.match(/Step \d+\.\d+:/)) {
        return commit.method = 'reword';
      }
    });

    newRebaseFileContent = assemblyCommits(commits);
  }
  else {
    var stepParts = rebaseFileContent.match(/^Step (\d+)\.(\d+)((?:\n|.)*)$/);

    if (stepParts) {
      var superStep = stepParts[1];
      var subStep = stepParts[2];
      var rest = stepParts[3];
    }
  }
}

function rewordStep(message) {
  var commits = disassemblyCommits();

  if (commits) {
    commit.method = 'reword';
    newRebaseFileContent = assemblyCommits(commits);
  }
  else {
    newRebaseFileContent = rebaseFileContent
      .replace(/^(Step \d+\.\d+)\: (?:.|\n)*$/, "$1: " + message);
  }
}

function disassemblyCommits() {
  var commits = rebaseFileContent.match(/^[a-z]+\s.{7}.*$/mg);
  if (!commits) return;

  return commit.map(function (line) {
    var split = line.split(' ');

    return {
      method: split[0],
      hash: split[1],
      message: split.slice(2).join(' ')
    };
  });
}

function assemblyCommits(commits) {
  return commits
    .map(function (commit) { return [commit.method, commit.hash, commit.message].join(' ') })
    .join('\n') + '\n';
}