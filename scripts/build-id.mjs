#!/usr/bin/env node
// Build names of ADR 0016 (scripts/build-names.mjs), derived from the root package.json version
// and the CI context, with the merge counter from git. Prints FLOURPRINT_VERSION, FLOURPRINT_BUILD, FLOURPRINT_LABEL,
// FLOURPRINT_CHANNEL and FLOURPRINT_VERSION_CODE as KEY=value lines; in GitHub Actions, also
// appends them to $GITHUB_ENV.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { buildNames } from './build-names.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// The merge counter (ADR 0016): the first-parent commit count of the built branch, or of the base
// branch for a pull request (BASE_SHA), so it rises by one per merge and never resets. It needs
// the full history: a shallow checkout would silently count 1, so it is refused.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const env = { ...process.env };
if (env.GITHUB_ACTIONS && env.GITHUB_REF_NAME !== 'main') {
  if (git('rev-parse', '--is-shallow-repository') === 'true') {
    throw new Error('the merge counter needs the full history: check out with fetch-depth: 0');
  }
  const counted = env.PR_NUMBER ? env.BASE_SHA : env.HEAD_SHA || env.GITHUB_SHA;
  if (!counted) throw new Error('no commit to count merges on (BASE_SHA or HEAD_SHA)');
  env.FLOURPRINT_MERGES = git('rev-list', '--count', '--first-parent', counted);
}
const names = buildNames(version, env);

const lines = [
  `FLOURPRINT_VERSION=${names.version}`,
  `FLOURPRINT_BUILD=${names.build}`,
  `FLOURPRINT_LABEL=${names.label}`,
  `FLOURPRINT_CHANNEL=${names.channel}`,
  `FLOURPRINT_VERSION_CODE=${names.versionCode}`,
];
console.log(lines.join('\n'));
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${lines.join('\n')}\n`);
