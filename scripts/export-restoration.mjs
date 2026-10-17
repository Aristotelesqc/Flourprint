// Export only reviewed prototype, catalogue, capture and motion assets. No traces or raw agent data.
import { readFile, readdir, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(repo, 'docs/mockups/0.3-ux/restoration/dist');
const target = process.env.FLOURPRINT_MOCKUP_EXPORT;
if (!target || !path.isAbsolute(target))
  throw Error('Set FLOURPRINT_MOCKUP_EXPORT to an explicit absolute gallery directory');
const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
const build = JSON.parse(
  await readFile(path.join(repo, 'docs/mockups/0.3-ux/dist/review-build.json'), 'utf8'),
);
const motion = JSON.parse(await readFile(path.join(source, 'motion/manifest.json'), 'utf8'));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
if (
  manifest.sourceSha256 !== build.sourceSha256 ||
  motion.sourceSha256 !== manifest.sourceSha256 ||
  manifest.revision !== head
)
  throw Error('Capture sources do not match the built review head');
const dirty = execFileSync('git', ['status', '--porcelain'], {
  cwd: repo,
  encoding: 'utf8',
}).trim();
if (dirty) throw Error('Commit the reviewed sources before export');
const files = new Set([
  'index.html',
  'components.html',
  'mockup.html',
  'mark.svg',
  'review-build.json',
  'manifest.json',
  'motion/index.html',
  'motion/manifest.json',
]);
const sha = (b) => createHash('sha256').update(b).digest('hex');
for (const entry of [
  ...manifest.images,
  ...manifest.components,
  ...manifest.comparisons,
  ...motion.records.flatMap((r) => r.frames),
]) {
  if (
    !/^(?:screenshots\/[A-Za-z0-9_.-]+\.png|comparison-[A-Za-z0-9_.-]+\.png|motion\/[A-Za-z0-9_.-]+\.png)$/.test(
      entry.path,
    )
  )
    throw Error('Unexpected evidence path: ' + entry.path);
  const bytes = await readFile(path.join(source, entry.path));
  if (sha(bytes) !== entry.sha256) throw Error('Evidence hash mismatch: ' + entry.path);
  files.add(entry.path);
}
for (const asset of await readdir(path.join(source, 'assets'))) {
  if (!/^[A-Za-z0-9_.-]+\.(css|js)$/.test(asset)) throw Error('Unexpected asset');
  files.add('assets/' + asset);
}
const hashes = [];
for (const file of files) {
  const dest = path.join(target, file);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(path.join(source, file), dest);
  hashes.push({ path: file, sha256: sha(await readFile(dest)) });
}
await writeFile(
  path.join(target, 'publication.json'),
  JSON.stringify({ revision: head, sourceSha256: manifest.sourceSha256, files: hashes }, null, 2) +
    '\n',
);
console.log(`Exported ${files.size} allowlisted assets; hashes recorded in publication.json`);
