var Fs = require('fs');
var Minimist = require('minimist');
var Paths = require('./paths');
var Step = require('./step');
var Utils = require('./utils');


var git = Utils.git;


// Automatically invoke a method by the provided arguments
(function () {
  var argv = Minimist(process.argv.slice(2));
  // The first argument will be the rebase file path provided to us by git
  var rebaseFilePath = argv._[0];
  var method = argv._[1];
  var message = argv.message || argv.m;

  // Grab the contents of the rebase file
  var rebaseFileContent = Fs.readFileSync(rebaseFilePath, 'utf8');
  var newRebaseFileContent;

  // Edit rebase content
  switch (method) {
    case 'edit': newRebaseFileContent = editStep(rebaseFileContent); break;
    case 'reword': newRebaseFileContent = rewordStep(rebaseFileContent, message); break;
    case 'retag': newRebaseFileContent = retagStep(rebaseFileContent); break;
  }

  // If content was edited
  if (newRebaseFileContent) {
    // Rewrite the rebase file
    Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);
  }
})();

// Edit the last step in the rebase file
function editStep(rebaseFileContent) {
  var commits = disassemblyCommits(rebaseFileContent);
  // Edit the first commit
  commits[0].method = 'edit';

  // If rebase
  if (commits) {
    // Reword the rest of the commits in case steps were added or removed
    commits.slice(1).forEach(function (commit) {
      commit.method = 'reword';
    });

    // After rebase, rename all the step tags
    var retagStepCommit = 'exec git rebase --continue && node ' + Paths.retagger;
    return assemblyCommits(commits) + '\n' + retagStepCommit;
  }
  // If ammend
  else {
    // Escape if the current commit is not a step
    var step = Step.extractStep(rebaseFileContent);
    if (!step) return;

    // Update the number of the step
    step.number = Step.next();
    return 'Step ' + step.number ': ' + step.message;
  }
}

// Reword the last step in the rebase file
function rewordStep(rebaseFileContent, message) {
  var commits = disassemblyCommits(rebaseFileContent);

  // If rebase
  if (commits) {
    // Reword the first commit
    commits[0].method = 'reword';
    return assemblyCommits(commits);
  }
  // If ammend
  else {
    // Replace original message with the provided message
    var step = Step.extractStep(rebaseFileContent);
    return 'Step ' + step.number + ': ' + message;
  }
}

// Rename step tags
function retagStep(rebaseFileContent) {
  var commits = disassemblyCommits(rebaseFileContent);

  // Edit all the super step commits, since we wanna update the names of the step files
  commits.forEach(function (commit) {
    if (Step.extractSuperStep(commit.message)) {
      commit.method = 'edit'
    }
  });

  return assemblyCommits(commits);
}

// Convert rebase file content to commits array
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

// Convert commits array to rebase file content
function assemblyCommits(commits) {
  return commits
    .map(function (commit) { return [commit.method, commit.hash, commit.message].join(' ') })
    .join('\n') + '\n';
}