function git(args, env) {
  var cmd = 'git ' + args;
  return exec(cmd, env);
}

function exec(cmd, env) {
  return child_process.execSync(cmd, { env: env }).toString();
}


module.exports = {
  git: git,
  exec: exec
};