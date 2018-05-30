const ChildProcess = require('child_process');
const Fs = require('fs-extra');
const Path = require('path');

// Independent from process.cwd()
const cwd = Path.resolve(__dirname, '..');
const tscFile = Path.resolve(cwd, 'node_modules/typescript/bin/tsc');
const tsConfig = Path.resolve(cwd, 'tsconfig.json');
const cliDir = Path.resolve(cwd, 'dist/cli');

// Building project
const { status } = ChildProcess.spawnSync(tscFile, ['-p', tsConfig], {
  stdio: 'inherit',
  cwd
});

// If build was successful chmod all CLI files
if (status == 0) {
  const cliFiles = Fs.readdirSync(cliDir).map(fileName => Path.resolve(cliDir, fileName));

  cliFiles.forEach((cliFile) => {
    Fs.chmodSync(cliFile, '755');
  });
}
