#!/usr/bin/env node
// Stages react-native-fast-tflite as a self-contained package directory and,
// with --push, commits it to the `release/react-native-fast-tflite` branch so
// apps can install it straight from GitHub:
//
//   "react-native-fast-tflite": "github:mikevocalz/react-native-fast-tflite-nitro-v1#release/react-native-fast-tflite"
//
// Modeled on mikevocalz/expo-pico's scripts/build-release-branches.mjs. This
// repo has a single package at its root, so there is one branch.
//
// Usage:
//   node scripts/build-release-branches.mjs [--out <dir>] [--push] [--remote origin]
//
// Steps:
//   1. Re-run nitrogen and refuse to continue if that changes any tracked file,
//      so the branch never ships stale generated code.
//   2. Build lib/ (tsc for the package, tsc for the Expo config plugin).
//   3. Stage the exact `npm pack` contents (the `files` list) of a copy of the
//      package with lifecycle scripts removed.
//   4. Strip `scripts` and `devDependencies` from the staged package.json and
//      record the source commit in `gitHead` and `nitroV1.sourceCommit`.
//   5. Commit the staged tree on top of the branch's current remote tip and
//      push it, plus an annotated `react-native-fast-tflite@<version>+<sha>` tag.
//
// History stays linear: every release commit's parent is the previous tip, so
// a consumer can pin any commit SHA and it stays reachable. If the staged tree
// equals the tip's tree, nothing is committed.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BRANCH = 'release/react-native-fast-tflite';
const TRAILER = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const push = flag('--push');
const remote = option('--remote', 'origin');
const outDir = resolve(option('--out', mkdtempSync(join(tmpdir(), 'fast-tflite-release-'))));

function run(cmd, cmdArgs, opts = {}) {
  // stdout is null when the caller sends it to 'inherit' or 'ignore'.
  const out = execFileSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });
  return (out ?? '').trim();
}
const git = (gitArgs, opts) => run('git', gitArgs, opts);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const bin = (name) => join(ROOT, 'node_modules', '.bin', name);

const sourceSha = git(['rev-parse', 'HEAD']);
const shortSha = sourceSha.slice(0, 7);

// A release commit says "from <sha>", so with --push the tracked files must be
// exactly that commit.
if (push && git(['status', '--porcelain', '--untracked-files=no'])) {
  throw new Error('Refusing to push a release branch from a working tree with uncommitted changes.');
}

// ---------------------------------------------------------------------------
// 1. Generated code must match the specs.

run(bin('nitrogen'), ['--logLevel=warning'], { stdio: ['ignore', 'ignore', 'inherit'] });
const drift = git(['status', '--porcelain', '--', 'nitrogen', 'Package.swift']);
if (drift) {
  throw new Error(`nitrogen changed tracked files; commit the regenerated output first:\n${drift}`);
}

// ---------------------------------------------------------------------------
// 2. Build lib/.

rmSync(join(ROOT, 'lib'), { recursive: true, force: true });
run(bin('tsc'), ['--noEmit', 'false'], { stdio: ['ignore', 'inherit', 'inherit'] });
run(bin('tsc'), ['--project', 'tsconfig.expo-plugin.json'], { stdio: ['ignore', 'inherit', 'inherit'] });

// ---------------------------------------------------------------------------
// 3. Pack and stage.

// `npm pack` runs `prepack` even with --ignore-scripts on some npm versions, and
// its output would land on stdout ahead of the --json report. Pack a copy
// without lifecycle scripts so no npm version can run them.
function packIntoStage(stageDir) {
  const copy = mkdtempSync(join(tmpdir(), 'fast-tflite-src-'));
  const skipNames = new Set(['node_modules', '.git', '.gradle', '.cxx', 'example']);
  const skipPaths = new Set([
    join(ROOT, 'android/build'),
    join(ROOT, 'android/src/main/cpp/lib'),
  ]);
  cpSync(ROOT, copy, {
    recursive: true,
    filter: (src) => !skipNames.has(src.split('/').pop()) && !skipPaths.has(src),
  });
  const manifestFile = join(copy, 'package.json');
  const manifest = readJson(manifestFile);
  delete manifest.scripts;
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

  const scratch = mkdtempSync(join(tmpdir(), 'fast-tflite-pack-'));
  const out = run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], {
    cwd: copy,
  });
  // npm 10 prints an array of reports; npm 11+ may print an object keyed by name.
  const report = JSON.parse(out);
  const [{ filename }] = Array.isArray(report) ? report : Object.values(report);
  run('tar', ['xzf', join(scratch, filename), '-C', scratch]);
  rmSync(stageDir, { recursive: true, force: true });
  cpSync(join(scratch, 'package'), stageDir, { recursive: true });
  rmSync(scratch, { recursive: true, force: true });
  rmSync(copy, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 4. Rewrite the staged manifest.

function rewriteManifest(stageDir) {
  const file = join(stageDir, 'package.json');
  const m = readJson(file);
  delete m.scripts;
  delete m.devDependencies;
  m.gitHead = sourceSha;
  m.nitroV1 = { ...(m.nitroV1 ?? {}), sourceCommit: sourceSha };
  writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
  return m;
}

function resolveEntry(stageDir, entry) {
  return ['', '.js', '.d.ts'].some((ext) => existsSync(join(stageDir, entry + ext)));
}

function assertContents(stageDir, m) {
  const missing = [m.main, m.module, m.types, m['react-native']]
    .filter(Boolean)
    .filter((entry) => !resolveEntry(stageDir, entry));
  const required = [
    'Package.swift',
    'nitro.json',
    'react-native-fast-tflite.podspec',
    'android/CMakeLists.txt',
    'android/build.gradle',
    'apple/HybridAssetLoader.swift',
    'cpp/HybridTfliteModel.cpp',
    'nitrogen/generated/hybrid-classes.json',
    'lib/commonjs/expo-plugin/withFastTFLite.js',
    'LICENSE',
    'NOTICE',
  ];
  missing.push(...required.filter((path) => !existsSync(join(stageDir, path))));
  // `#nitro/*` resolves to nitrogen/generated/shared/javascript/*.cjs.
  const jsDir = join(stageDir, 'nitrogen/generated/shared/javascript');
  for (const spec of readdirSync(join(ROOT, 'src/specs')).filter((f) => f.endsWith('.nitro.ts'))) {
    const name = spec.replace(/\.nitro\.ts$/, '');
    if (!existsSync(join(jsDir, `${name}.cjs`))) missing.push(`#nitro/${name}`);
  }
  if (existsSync(join(stageDir, 'android/src/main/cpp/lib'))) {
    throw new Error('android/src/main/cpp/lib (extracted LiteRT binaries) must not ship.');
  }
  if (missing.length) {
    throw new Error(`${m.name}: missing from the packed output: ${missing.join(', ')}`);
  }
}

mkdirSync(outDir, { recursive: true });
const stageDir = join(outDir, 'react-native-fast-tflite');
packIntoStage(stageDir);
const manifest = rewriteManifest(stageDir);
assertContents(stageDir, manifest);

// ---------------------------------------------------------------------------
// 5. Commit on top of the branch's remote tip.

// Read the tip straight from the remote and fetch it without writing a local
// ref (FETCH_HEAD only), so a dry run leaves the checkout's refs untouched.
let parent = '';
try {
  const listing = git(['ls-remote', '--heads', remote, BRANCH]);
  parent = listing.split('\t')[0] ?? '';
  if (parent) git(['fetch', '--quiet', '--no-tags', remote, `refs/heads/${BRANCH}`]);
} catch (error) {
  if (push) throw error;
  console.warn(`could not read ${remote}; comparing against an empty branch (${error.message})`);
  parent = '';
}

const index = join(mkdtempSync(join(tmpdir(), 'fast-tflite-index-')), 'index');
const env = { ...process.env, GIT_INDEX_FILE: index };
git(['--work-tree', stageDir, 'add', '--all', '--force', '.'], { env });
const tree = git(['write-tree'], { env });
const parentTree = parent ? git(['rev-parse', `${parent}^{tree}`]) : '';

const subject = `release ${manifest.name}@${manifest.version} from ${sourceSha}`;
const message = `${subject}\n\n${TRAILER}\n`;
let status;
let commit = parent;
let tag = '';
if (tree === parentTree) {
  status = 'unchanged';
} else if (!push) {
  status = 'would commit';
} else {
  commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-F', '-'], {
    input: message,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  // Plain push: fast-forward only. If someone rewrote the branch, fail loudly.
  git(['push', '--quiet', remote, `${commit}:refs/heads/${BRANCH}`]);
  status = 'pushed';
  tag = `${manifest.name}@${manifest.version}+${shortSha}`;
  if (git(['ls-remote', '--tags', remote, `refs/tags/${tag}`])) {
    console.warn(`tag ${tag} already exists on ${remote}; leaving it`);
  } else {
    // Annotated tag object built with mktag and pushed directly, so no local
    // tag ref is created.
    const tagObject = git(['mktag'], {
      input:
        `object ${commit}\ntype commit\ntag ${tag}\n` +
        `tagger ${git(['var', 'GIT_COMMITTER_IDENT'])}\n\n${message}`,
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    git(['push', '--quiet', remote, `${tagObject}:refs/tags/${tag}`]);
  }
}

console.log(`source ${sourceSha}`);
console.log(`staged in ${stageDir}`);
console.log([BRANCH, `${manifest.name}@${manifest.version}`, status, commit, tag, `tree ${tree}`]
  .filter(Boolean)
  .join(' '));
if (!push) console.log('(dry run, nothing pushed)');
