import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { originOfFolder, versionsWithData } from '../src/versions.js';

const HOST = 'flourprint-aristotelesqc.pages.dev';
let userData: string;

const folder = (name: string, files: Record<string, number>) => {
  const path = join(userData, 'IndexedDB', name);
  mkdirSync(path, { recursive: true });
  for (const [file, size] of Object.entries(files)) {
    writeFileSync(join(path, file), Buffer.alloc(size));
  }
};

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'flourprint-versions-'));
});
afterEach(() => rmSync(userData, { recursive: true, force: true }));

describe('IndexedDB folders of the dev shell', () => {
  it('reads the origin out of the folder name', () => {
    expect(originOfFolder(`https_dev.${HOST}_0.indexeddb.leveldb`)).toBe(`https://dev.${HOST}`);
    expect(originOfFolder('http_127.0.0.1_4317.indexeddb.leveldb')).toBe('http://127.0.0.1:4317');
    expect(originOfFolder(`https_${HOST}_443.indexeddb.blob`)).toBe(`https://${HOST}`);
    expect(originOfFolder('Local Storage')).toBeUndefined();
    expect(originOfFolder('file__0.indexeddb.leveldb')).toBeUndefined();
  });

  it('lists the versions that hold data with their sizes, allowlisted addresses only', () => {
    folder(`https_dev.${HOST}_0.indexeddb.leveldb`, { a: 1000, b: 500 });
    folder(`https_pr-12.${HOST}_0.indexeddb.leveldb`, { a: 300 });
    folder(`https_pr-12.${HOST}_0.indexeddb.blob`, { a: 200 });
    folder(`https_${HOST}_0.indexeddb.leveldb`, { a: 50 });
    folder(`https_canary.${HOST}_0.indexeddb.leveldb`, {});
    folder('https_evil.example_0.indexeddb.leveldb', { a: 9999 });
    folder(`https_pr-0012.${HOST}_0.indexeddb.leveldb`, { a: 9999 });
    expect(versionsWithData(userData, `https://dev.${HOST}`)).toEqual([
      { version: 'dev', bytes: 1500 },
      { version: 'main', bytes: 50 },
      { version: 'pr-12', bytes: 500 },
    ]);
  });

  it('counts the local address tests give the dev version as dev', () => {
    folder('http_127.0.0.1_4317.indexeddb.leveldb', { a: 70 });
    expect(versionsWithData(userData, 'http://127.0.0.1:4317')).toEqual([
      { version: 'dev', bytes: 70 },
    ]);
    expect(versionsWithData(userData, `https://dev.${HOST}`)).toEqual([]);
  });

  it('finds nothing in a profile that has no IndexedDB folder yet', () => {
    expect(versionsWithData(userData, `https://dev.${HOST}`)).toEqual([]);
  });
});
