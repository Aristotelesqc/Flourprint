// ADR 0022: keep the UI styling surface explicit while legacy app screens migrate in #169–172.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const cssAllowlist = new Map([
  ['packages/ui/src/tokens.css', 'generated'],
  ['packages/ui/src/patterns.css', 'utilities'],
  ['packages/ui/src/exceptions.css', 'exceptions'],
  ['packages/ui/catalogue.css', 'host'],
  // Existing Ionic app stylesheet, not library CSS. Retired by the screen slices.
  ['apps/mobile/src/theme/app.css', 'legacy-app'],
]);

export const validateCss = (file, source) => {
  const kind = cssAllowlist.get(file);
  if (!kind) return [file + ': CSS file is outside the ADR 0022 allowlist.'];
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (kind === 'legacy-app') {
    // Freeze the pre-port rules; a screen migration must explicitly review/reduce this allowance.
    const legacy = source
      .replaceAll('\r\n', '\n')
      .replaceAll("@import '@flourprint/ui/styles.css';\n", '')
      .replaceAll("@source '../../../../packages/ui/src';\n", '')
      .replaceAll('\r\n', '\n');
    return createHash('sha256').update(legacy).digest('hex') ===
      'af9d2d2945dde5a255998a8987111c8cb0865d1588dda5d468b2244ae8f1bd43'
      ? []
      : [file + ': legacy app CSS changed; migrate utilities and review the allowance.'];
  }
  if (kind === 'generated') {
    return source.includes('Generated') && clean.includes('@theme')
      ? []
      : [file + ': the generated theme must declare Tailwind @theme tokens.'];
  }
  if (kind === 'host') {
    return clean.replace(/@(import|source|layer)\s+[^;]+;/g, '').trim()
      ? [file + ': a catalogue host may import styles and declare sources only.']
      : [];
  }
  if (kind === 'exceptions') {
    if (
      clean &&
      !/Tailwind\s+(?:CSS\s+)?v?4\.\d[\s\S]*?(?:missing|cannot|does not|unsupported)/i.test(source)
    ) {
      return [
        file + ': every exception needs the missing capability and checked Tailwind version.',
      ];
    }
    if (/(?:^|[{}])\s*(?::root|html|body|button|input|select|dialog)\b/m.test(clean)) {
      return [file + ': global element selectors are forbidden in the library.'];
    }
    return [];
  }
  const rest = clean.replace(/@import\s+[^;]+;/g, '');
  const errors = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < rest.length; index++) {
    if (rest[index] === '{') {
      if (depth === 0 && !/^\s*@utility\s+[a-z][a-z0-9-]*\s*$/.test(rest.slice(start, index))) {
        errors.push(file + ': only named @utility blocks are allowed; no global selectors.');
      }
      depth++;
    } else if (rest[index] === '}') {
      depth--;
      if (depth === 0) start = index + 1;
    }
  }
  if (depth !== 0 || rest.slice(start).trim()) errors.push(file + ': invalid utility structure.');
  return errors;
};

const filesIn = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', 'android', 'out', 'test-results'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : file.endsWith('.css') ? [file] : [];
  });

export const checkCss = (repo = root) =>
  ['packages/ui', 'apps/mobile/src'].flatMap((directory) =>
    filesIn(path.join(repo, directory)).flatMap((file) =>
      validateCss(path.relative(repo, file).replaceAll('\\', '/'), readFileSync(file, 'utf8')),
    ),
  );

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const errors = checkCss();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('UI CSS allowlist and utility boundaries passed.');
}
