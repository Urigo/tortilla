var Fs = require('fs');
var Minimist = require('minimist');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');


var git = Utils.git;


(function () {
  var argv = Minimist(process.argv.slice(2));
  var rebaseFilePath = argv._[0];
  var method = argv._[1];
  var message = argv.message || argv.m;

  var rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
  var newRebaseFileContent;

  switch (method) {
    case 'edit': newRebaseFileContent = editStep(rebaseFileContent); break;
    case 'reword': newRebaseFileContent = rewordStep(rebaseFileContent, message); break;
    case 'retag': newRebaseFileContent = retagStep(rebaseFileContent); break;
  }

  newRebaseFileContent = newRebaseFileContent || rebaseFileContent;
  Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);
})();

function editStep(rebaseFileContent) {
  var commits = disassemblyCommits(rebaseFileContent);
  commits[0].method = 'edit';

  if (commits) {
    commits.slice(1).forEach(function (commit) {
      commit.method = 'reword';
    });

    var retagStepCommit = 'exec git rebase --continue && node ' + Paths.retagger;
    return assemblyCommits(commits) + '\n' + retagStepCommit;
  }
  else {
    var step = Step.extractStep(rebaseFileContent);
    if (!step) return;

    step.number = Step.next();
    return 'Step ' + step.number ': ' + step.message;
  }
}

function rewordStep(rebaseFileContent, message) {
  var commits = disassemblyCommits(rebaseFileContent);

  if (commits) {
    commits[0].method = 'reword';
    return assemblyCommits(commits);
  }
  else {
    var step = Step.extractStep(rebaseFileContent);
    return 'Step ' + step.number + ': ' + message;
  }
}

function retagStep(rebaseFileContent) {
  var commits = disassemblyCommits(rebaseFileContent);

  commits.forEach(function (commit) {
    if (Step.extractSuperStep(commit.message)) {
      commit.method = 'edit'
    }
  });

  return assemblyCommits(commits);
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