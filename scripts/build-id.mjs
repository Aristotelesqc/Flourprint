#!/usr/bin/env node
// Build names of ADR 0016 (scripts/build-names.mjs), derived from the root package.json version
// and the CI context. Prints FLOURPRINT_VERSION, FLOURPRINT_BUILD, FLOURPRINT_LABEL,
// FLOURPRINT_CHANNEL and FLOURPRINT_VERSION_CODE as KEY=value lines; in GitHub Actions, also
// appends them to $GITHUB_ENV.
import { appendFileSync, readFileSync } from 'node:fs';
import { buildNames } from './build-names.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const names = buildNames(version, process.env);

const lines = [
  `FLOURPRINT_VERSION=${names.version}`,
  `FLOURPRINT_BUILD=${names.build}`,
  `FLOURPRINT_LABEL=${names.label}`,
  `FLOURPRINT_CHANNEL=${names.channel}`,
  `FLOURPRINT_VERSION_CODE=${names.versionCode}`,
];
console.log(lines.join('\n'));
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `${lines.join('\n')}\n`);
