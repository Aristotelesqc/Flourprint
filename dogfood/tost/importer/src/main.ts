import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convert } from './convert.js';
import type { Decisions } from './migrate.js';
import { reportMarkdown } from './report.js';

/**
 * Regenerates dogfood/tost/{converted,migration-report} from the verbatim source and the owner's
 * decisions. `--check` only verifies that the committed files are up to date.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const decisions = JSON.parse(readFileSync(join(root, 'decisions.json'), 'utf8')) as Decisions & {
  source: { file: string };
};
const sourcePath = join(root, decisions.source.file);
const source = readFileSync(sourcePath);
const sha256 = createHash('sha256').update(source).digest('hex');
const { file, reports } = convert(source.toString('utf8'), decisions);

const outputs: Record<string, string> = {
  'converted/flourprint-recipes.json': `${JSON.stringify(file, null, 2)}\n`,
  'migration-report/report.json': `${JSON.stringify({ source: decisions.source.file, sha256, reports }, null, 2)}\n`,
  'migration-report/report.md': reportMarkdown(reports, {
    file: relative(root, sourcePath),
    sha256,
  }),
};

if (process.argv.includes('--check')) {
  const stale = Object.entries(outputs).filter(([path, content]) => {
    try {
      return readFileSync(join(root, path), 'utf8') !== content;
    } catch {
      return true;
    }
  });
  if (stale.length > 0) {
    console.error(`Out of date: ${stale.map(([p]) => p).join(', ')}`);
    process.exit(1);
  }
  console.log('Converted files are up to date.');
} else {
  for (const [path, content] of Object.entries(outputs)) writeFileSync(join(root, path), content);
  const by = (s: string) => reports.filter((r) => r.status === s).length;
  console.log(
    `${reports.length} recipes: ${by('converted')} converted, ${by('converted-with-warning')} with warnings, ${by('needs-review')} to review.`,
  );
}
