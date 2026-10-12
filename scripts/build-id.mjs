#!/usr/bin/env node
// Build names of ADR 0016, derived from the root package.json version and the CI context.
// Prints FLOURPRINT_VERSION, FLOURPRINT_BUILD and FLOURPRINT_VERSION_CODE as KEY=value lines;
// in GitHub Actions, also appends them to $GITHUB_ENV.
import { appendFileSync, readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
if (!match) throw new Error(`package.json version is not MAJOR.MINOR.PATCH: ${version}`);
const [major, minor, patch] = match.slice(1).map(Number);
if (minor > 999 || patch > 999) throw new Error(`version ${version} does not fit a versionCode`);

const env = process.env;
const run = env.GITHUB_RUN_NUMBER;
const sha = (env.HEAD_SHA || env.GITHUB_SHA || '').slice(0, 7);
const pr = env.PR_NUMBER;

let build;
if (!env.GITHUB_ACTIONS) build = `${version}-local`;
else if (pr) build = `${version}-pr.${pr}.${run}+${sha}`;
else if (env.GITHUB_REF_NAME === 'main') build = version;
else if (env.GITHUB_REF_NAME === 'dev') build = `${version}-dev.${run}+${sha}`;
else build = `${version}-${env.GITHUB_REF_NAME?.replace(/[^0-9A-Za-z-]/g, '-')}.${run}+${sha}`;

const lines = [
  `FLOURPRINT_VERSION=${version}`,
  `FLOURPRINT_BUILD=${build}`,
  `FLOURPRINT_VERSION_CODE=${major * 1_000_000 + minor * 1_000 + patch}`,
];
console.log(lines.join('\n'));
if (env.GITHUB_ENV) appendFileSync(env.GITHUB_ENV, `${lines.join('\n')}\n`);
