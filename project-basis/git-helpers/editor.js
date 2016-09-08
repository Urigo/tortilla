var Fs = require('fs');
var Minimist = require('minimist');
var Step = require('./step');


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
  }

  newRebaseFileContent = newRebaseFileContent || rebaseFileContent;
  Fs.writeFileSync(rebaseFilePath, newRebaseFileContent);
})();

function editStep(rebaseFileContent) {
  // TODO: Edit the first commit
  var commits = disassemblyCommits(rebaseFileContent);

  if (commits) {
    commits.forEach(function (commit) {
      if (Step.extractSuperStep(commit.message)) {
        return commit.method = 'edit';
      }

      if (Step.extractSubStep(commit.message)) {
        return commit.method = 'reword';
      }
    });

    // TODO: Push exec for post rebase logic
    return assemblyCommits(commits);
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
    commit.method = 'reword';
    return assemblyCommits(commits);
  }
  else {
    var step = Step.extractStep(rebaseFileContent);
    return 'Step ' + step.number + ': ' + message;
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