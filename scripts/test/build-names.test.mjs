import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildNames, codeName } from '../build-names.mjs';

const SHA = '4e3dd945410195f272d74f8138ce5f3d99422c8e';
const ci = { GITHUB_ACTIONS: 'true', FLOURPRINT_MERGES: '89', HEAD_SHA: SHA };

describe('build names (ADR 0016)', () => {
  it('names a release by its version only', () => {
    const names = buildNames('0.2.0', { ...ci, GITHUB_REF_NAME: 'main' });
    expect(names).toEqual({
      version: '0.2.0',
      build: '0.2.0',
      label: 'v0.2.0',
      channel: 'release',
      versionCode: 2000,
    });
  });

  it('gives dev and pull request builds the merge counter and the code name of their commit', () => {
    const name = codeName(SHA);
    expect(buildNames('0.2.0', { ...ci, GITHUB_REF_NAME: 'dev' })).toMatchObject({
      build: '0.2.0-dev.89+4e3dd94',
      label: `v0.2.0.0089-${name}`,
      channel: 'dev',
    });
    expect(buildNames('0.2.0', { ...ci, PR_NUMBER: '53' })).toMatchObject({
      build: '0.2.0-pr.53.89+4e3dd94',
      label: `v0.2.0.0089-pr53-${name}`,
      channel: 'preview',
    });
  });

  it('pads the counter to four digits in the label only, and keeps growing past 9999', () => {
    const dev = (merges) =>
      buildNames('0.3.0', { ...ci, GITHUB_REF_NAME: 'dev', FLOURPRINT_MERGES: merges });
    expect(dev('7').label).toBe(`v0.3.0.0007-${codeName(SHA)}`);
    expect(dev('7').build).toBe('0.3.0-dev.7+4e3dd94');
    expect(dev('12345').label).toBe(`v0.3.0.12345-${codeName(SHA)}`);
  });

  it('refuses a CI build other than a release without a merge counter', () => {
    const noCount = { GITHUB_ACTIONS: 'true', HEAD_SHA: SHA };
    expect(() => buildNames('0.3.0', { ...noCount, GITHUB_REF_NAME: 'dev' })).toThrow();
    expect(() =>
      buildNames('0.3.0', { ...ci, GITHUB_REF_NAME: 'dev', FLOURPRINT_MERGES: 'x' }),
    ).toThrow();
    expect(buildNames('0.3.0', { ...noCount, GITHUB_REF_NAME: 'main' }).label).toBe('v0.3.0');
  });

  it('names a canary build after its branch, with its own channel (ADR 0018)', () => {
    expect(buildNames('0.3.0', { ...ci, GITHUB_REF_NAME: 'canary' })).toMatchObject({
      build: '0.3.0-canary.89+4e3dd94',
      label: `v0.3.0.0089-canary-${codeName(SHA)}`,
      channel: 'canary',
      versionCode: 3000,
    });
  });

  it('names a local build without a code name', () => {
    expect(buildNames('0.2.0', {})).toMatchObject({
      build: '0.2.0-local',
      label: 'v0.2.0-local',
      channel: 'local',
    });
  });

  it('refuses a version that does not fit a versionCode', () => {
    expect(() => buildNames('0.2', {})).toThrow();
    expect(() => buildNames('0.1000.0', {})).toThrow();
  });
});

describe('code names', () => {
  it('depend on the commit only, in both hash cases', () => {
    expect(codeName(SHA)).toBe(codeName(SHA.toUpperCase()));
    expect(codeName(SHA)).toMatch(/^[a-z]+-[a-z]+$/);
  });

  it('tell commits apart', () => {
    const shas = Array.from({ length: 200 }, (_, i) =>
      createHash('sha1').update(String(i)).digest('hex'),
    );
    expect(new Set(shas.map(codeName)).size).toBeGreaterThan(150);
  });

  it('stay short enough for the app bar', () => {
    for (let i = 0; i < 2000; i++) {
      const name = codeName(createHash('sha1').update(String(i)).digest('hex'));
      expect(name.length).toBeLessThanOrEqual(15);
    }
  });

  it('refuse what is not a commit hash', () => {
    expect(() => codeName('')).toThrow();
    expect(() => codeName('not-a-sha-at-all')).toThrow();
  });
});
