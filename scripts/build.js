const ChildProcess = require('child_process');
const Fs = require('fs-extra');
const Path = require('path');

// Independent from process.cwd()
const cwd = Path.resolve(__dirname, '..');

const main = () => {
  // Abort if build failed (status code isn't 0)
  if (compileProject()) return
  chmodCLI()
  archiveSkeleton()
}

// Typescript to es5
const compileProject = () => {
  const tscFile = Path.resolve(cwd, 'node_modules/typescript/bin/tsc');
  const tsConfig = Path.resolve(cwd, 'tsconfig.json');

  const { status } = ChildProcess.spawnSync(tscFile, ['-p', tsConfig], {
    stdio: 'inherit',
    cwd
  });

  return status
}

// Ensure CLI files can be executed without sudo
const chmodCLI = () => {
  const cliDir = Path.resolve(cwd, 'dist/cli');
  const cliFiles = Fs.readdirSync(cliDir).map(fileName => Path.resolve(cliDir, fileName));

  cliFiles.forEach((cliFile) => {
    Fs.chmodSync(cliFile, '755');
  });
}

// Put the skeleton in a .tar file.
// Necessary if we would like to preserve in the NPM registry without files disappearing
const archiveSkeleton = () => {
  ChildProcess.spawnSync('tar', ['-cvf', 'dist/skeleton.tar', 'skeleton'], {
    stdio: 'inherit',
    cwd,
  });
}

main()
