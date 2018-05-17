import * as Fs from 'fs-extra';
import * as Path from 'path';
import * as ReadlineSync from 'readline-sync';
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
      const nextReleaseVersion = releaseVersions[releaseIndex + 1];
      const tagName = `${branchName}@${releaseVersion}`;
      const tagRevision = Git(['rev-parse', tagName]);

      const historyRevision = Git([
        'log', historyBranchName, `--grep=^${tagName}:`, '--format=%H',
      ]).split('\n')
        .filter(Boolean)
        .pop();

      // Instead of printing diff to stdout we will receive it as a buffer
      const changesDiff = Release.diff(releaseVersion, nextReleaseVersion, null, {
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
}


// TODO: Make client calculate the diff on a service worker
// or serve the created HTML file (using SSR)
function diffReleases(dump: string, srcTag: string, dstTag: string, cacheDir?: string) {
  const diffPath = `${cacheDir}/${srcTag}..${dstTag}.diff`;

  if (cacheDir && Fs.existsSync(diffPath)) {
    return Fs.readFileSync(diffPath).toString();
  }

  const srcDir = buildRelease(dump, srcTag);
  const dstDir = buildRelease(dump, dstTag);

  Fs.removeSync(`${srcDir}/.git`);
  Fs.copySync(`${dstDir}/.git`, `${srcDir}/.git`);

  const diff = Utils.scopeEnv(() => {
    Git(['commit', '-m', dstTag]);

    return Git(['diff', 'HEAD^', 'HEAD']);
  }, {
    TORTILLA_CWD: srcDir.name
  });

  srcDir.removeCallback();
  dstDir.removeCallback();

  if (cacheDir) {
    Fs.writeFileSync(diffPath, diff);
  }

  return diff;
}

function buildRelease(dump, tag) {
  const [branchName, releaseVersion] = tag.split('@');
  const chunk = dump.find(c => c.branchName === branchName);
  const releaseIndex = chunk.releases.findIndex(r => r.releaseVersion === releaseVersion);
  const releases = chunk.releases.slice(0, releaseIndex + 1);
  const diffs = releases.map(r => r.changesDiff);
  const dir = Tmp.dirSync({ unsafeCleanup: true });

  Utils.scopeEnv(() => {
    Git(['init']);

    diffs.forEach((diff) => {
      Git(['apply'], {
        input: diff
      });
    });

    Git(['commit', '-m', tag]);
  }, {
    TORTILLA_CWD: dir.name
  });

  return dir;
}

export const Dump = {
  create: dumpProject,
  diffReleases
};
