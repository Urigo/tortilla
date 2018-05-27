import * as Fs from 'fs-extra';
import * as Path from 'path';
import * as ReadlineSync from 'readline-sync';
import * as semver from 'semver';
import * as Tmp from 'tmp';
import { Git } from './git';
import { Paths } from './paths';
import { Release } from './release';
import { Utils } from './utils';

const defaultDumpFileName = 'tutorial.json';
const headEnd = '[//]: # (head-end)\n';
const footStart = '[//]: # (foot-start)\n';

// Dumps tutorial into a JSON file
// Output path defaults to cwd
function dumpProject(out: any = Utils.cwd(), options: any = {}) {
  if (out instanceof Object && !(out instanceof String)) {
    options = out;
    out = Utils.cwd();
  }

  options = {
    filter: options.filter,
    reject: options.reject, ...options};

  // Output path is relative to cwd
  out = Path.resolve(Utils.cwd(), out);

  // If provided output path is a dir assume the dump file should be created inside of it
  if (Utils.exists(out, 'dir')) {
    out = Path.join(out, defaultDumpFileName);
  }

  if (Utils.exists(out, 'file')) {
    options.override = options.override || ReadlineSync.keyInYN([
      'Output path already exists.',
      'Would you like to override it and continue?',
    ].join('\n'));

    if (!options.override) {
      return;
    }
  }

  console.log();
  console.log(`Dumping into ${out}...`);
  console.log();

  // Will recursively ensure dirs as well
  Fs.ensureFileSync(out);

  // Run command once
  const tagNames = Git(['tag', '-l'])
    .split('\n')
    .filter(Boolean);

  let branchNames = tagNames
    .filter((tagName) => {
      return /^[^@]+?@\d+\.\d+\.\d+$/.test(tagName);
    })
    .map((tagName) => {
      return tagName.split('@')[0];
    })
    .reduce((prev, branchName) => {
      if (!prev.includes(branchName)) {
        prev.push(branchName);
      }

      return prev;
    }, []);

  if (options.filter) {
    branchNames = branchNames.filter((branchName) => {
      return options.filter.includes(branchName);
    });
  }

  if (options.reject) {
    branchNames = branchNames.filter((branchName) => {
      return !options.reject.includes(branchName);
    });
  }

  const dump = branchNames.map((branchName) => {
    const historyBranchName = `${branchName}-history`;

    // Run command once
    const releaseVersions = tagNames
      .map((tagName) => {
        return tagName.match(new RegExp(`${branchName}@(\\d+\\.\\d+\\.\\d+)`));
      })
      .filter(Boolean)
      .map(match => match[1])
      .reverse();

    const releases = releaseVersions.map((releaseVersion, releaseIndex) => {
      const prevReleaseVersion = releaseVersions[releaseIndex + 1];
      const tagName = `${branchName}@${releaseVersion}`;
      const tagRevision = Git(['rev-parse', tagName]);

      const historyRevision = Git([
        'log', historyBranchName, `--grep=^${tagName}:`, '--format=%H',
      ]).split('\n')
        .filter(Boolean)
        .pop();

      // Instead of printing diff to stdout we will receive it as a buffer
      const changesDiff = Release.diff(prevReleaseVersion, releaseVersion, null, {
        branch: branchName,
        pipe: true
      });

      const manuals = Fs.readdirSync(Paths.manuals.views).sort(Utils.naturalSort).map((manualName, stepIndex) => {
        const format = '%H %s';
        let stepLog;
        let manualPath;

        // Step
        if (stepIndex) {
          manualPath = Path.resolve(Paths.manuals.views, manualName);
          stepLog = Git([
            'log', branchName, `--grep=^Step ${stepIndex}:`, `--format=${format}`,
          ]);
        } else {
          manualPath = Paths.readme;
          stepLog = Git([
            'log', Git.rootHash(branchName), `--format=${format}`,
          ]);
        }

        manualPath = Path.relative(Utils.cwd(), manualPath);
        stepLog = stepLog.split(' ');
        const stepRevision = stepLog.shift();
        const manualTitle = stepLog.join(' ');

        // Removing header and footer, since the view should be used externally on a
        // different host which will make sure to show these two
        let manualView = Git(['show', `${stepRevision}:${manualPath}`]);

        if (manualView.includes(headEnd)) {
          manualView = manualView
            .split(headEnd)
            .slice(1)
            .join(headEnd);
        }

        if (manualView.includes(footStart)) {
          manualView = manualView
            .split(footStart)
            .slice(0, -1)
            .join(footStart);
        }

        manualView = manualView.trim();

        return {
          manualTitle,
          stepRevision,
          manualView,
        };
      });

      return {
        releaseVersion,
        tagName,
        tagRevision,
        historyRevision,
        changesDiff,
        manuals,
      };
    });

    return {
      branchName,
      historyBranchName,
      releases,
    };
  });

  Fs.writeJsonSync(out, dump, { spaces: 2 });

  console.log();
  console.log('Dump finished.');
  console.log();
}

// TODO: Make client calculate the diff on a service worker
// or serve the created HTML file (using SSR)
function diffReleases(dump: string|object, srcTag: string, dstTag: string) {
  let [srcBranchName, srcReleaseVersion] = srcTag.split('@');
  let [dstBranchName, dstReleaseVersion] = dstTag.split('@');

  if (!srcReleaseVersion && !dstReleaseVersion) {
    srcReleaseVersion = srcBranchName;
    dstReleaseVersion = dstBranchName;
    srcBranchName = null;
    dstBranchName = null;
  }

  if (semver.eq(srcReleaseVersion, dstReleaseVersion)) {
    return '';
  }

  // Test result will be used later on
  const reversed = semver.gt(srcReleaseVersion, dstReleaseVersion)

  if (reversed) {
    let temp;

    temp = srcReleaseVersion;
    srcReleaseVersion = dstReleaseVersion;
    dstReleaseVersion = temp;

    temp = srcBranchName;
    srcBranchName = dstBranchName;
    dstBranchName = temp;
  }

  // If an FS path was provided
  if (typeof dump === 'string' || dump instanceof String) {
    // Resolving path relative to cwd
    dump = Path.resolve(Utils.cwd(), dump as string);
    // Parsing JSON
    dump = Fs.readJSONSync(dump);
  }

  const srcDir = buildRelease(dump, srcReleaseVersion, srcBranchName);
  const dstDir = buildRelease(dump, dstReleaseVersion, dstBranchName);

  Fs.removeSync(`${srcDir.name}/.git`);
  Fs.copySync(`${dstDir.name}/.git`, `${srcDir.name}/.git`);

  const diff = Utils.scopeEnv(() => {
    Git(['add', '.']);

    try {
      Git(['commit', '-m', dstReleaseVersion]);
    // No changes were made between releases
    // Probably due to missing versions of submodules
    } catch (e) {
      return '';
    }

    return reversed
      ? Git(['diff', 'HEAD', 'HEAD^'])
      : Git(['diff', 'HEAD^', 'HEAD']);
  }, {
    TORTILLA_CWD: srcDir.name
  });

  srcDir.removeCallback();
  dstDir.removeCallback();

  return diff;
}

function buildRelease(dump: any, releaseVersion: string, branchName?: string) {
  // If no branch was provided, assuming this is a chunk
  const chunk = branchName ? dump.find(c => c.branchName === branchName) : dump;
  const releaseIndex = chunk.releases.findIndex(r => r.releaseVersion === releaseVersion);
  // Most recent release would come LAST
  const releases = chunk.releases.slice(releaseIndex - chunk.releases.length).reverse();
  const diffs = releases.map(r => r.changesDiff).filter(Boolean);
  const dir = Tmp.dirSync({ unsafeCleanup: true });

  Utils.scopeEnv(() => {
    Git(['init']);

    diffs.forEach((diff) => {
      Git(['apply'], {
        input: diff
      });
    });

    Git(['add', '.']);
    Git(['commit', '-m', releaseVersion]);
  }, {
    TORTILLA_CWD: dir.name
  });

  return dir;
}

export const Dump = {
  create: dumpProject,
  diffReleases
};
