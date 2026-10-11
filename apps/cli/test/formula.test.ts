import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ReportedError, type Io } from '../src/formula.js';
import { buildProgram } from '../src/program.js';

const example = readFileSync(
  fileURLToPath(new URL('../../../examples/poolish-tangzhong.formula.json', import.meta.url)),
  'utf8',
);

const run = async (args: string[], files: Record<string, string> = { 'f.json': example }) => {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = {
    out: (text) => out.push(text),
    err: (text) => err.push(text),
    readText: async (path) => {
      const content = files[path];
      if (content === undefined) throw new Error(`ENOENT: ${path}`);
      return content;
    },
  };
  let failed = false;
  try {
    await buildProgram(io).exitOverride().parseAsync(args, { from: 'user' });
  } catch (error) {
    if (!(error instanceof ReportedError)) throw error;
    failed = true;
  }
  return { out: out.join('\n'), err: err.join('\n'), failed };
};

describe('flourprint formula', () => {
  it('calculates a formula as JSON with the engine values', async () => {
    const { out, failed } = await run(['formula', 'calculate', 'f.json', '--json']);
    expect(failed).toBe(false);
    const resolved = JSON.parse(out);
    expect(resolved.doughWeight).toBeCloseTo(1774, 9);
    expect(resolved.finalMix.water).toBeCloseTo(200, 9);
  });

  it('prints a human-readable calculation', async () => {
    const { out } = await run(['formula', 'calculate', 'f.json']);
    expect(out).toContain('Dough weight     1774 g');
    expect(out).toContain('tangzhong: flour 50.0 g, water 250 g → 300 g');
  });

  it('scales to a number of pieces', async () => {
    const { out } = await run(['formula', 'scale', 'f.json', '--pieces', '2x900', '--json']);
    const { formula, resolved } = JSON.parse(out);
    expect(formula.anchor).toEqual({ kind: 'pieces', count: 2, gramsEach: 900 });
    expect(resolved.doughWeight).toBeCloseTo(1800, 9);
  });

  it('requires exactly one anchor to scale', async () => {
    const { err, failed } = await run([
      'formula',
      'scale',
      'f.json',
      '--flour',
      '500',
      '--dough',
      '900',
    ]);
    expect(failed).toBe(true);
    expect(err).toContain('InvalidArguments');
  });

  it('rejects unknown fields instead of dropping them', async () => {
    const withExtra = JSON.stringify({ ...JSON.parse(example), dependsOn: [] });
    const { out, failed } = await run(['formula', 'calculate', 'x.json', '--json'], {
      'x.json': withExtra,
    });
    expect(failed).toBe(true);
    expect(JSON.parse(out).error.code).toBe('InvalidInput');
  });

  it('reports engine errors with their code and details', async () => {
    const formula = JSON.parse(example);
    formula.components[0].flourBlend = [{ flour: 'whole-wheat', sharePct: 100 }];
    const { out, failed } = await run(['formula', 'calculate', 'x.json', '--json'], {
      'x.json': JSON.stringify(formula),
    });
    expect(failed).toBe(true);
    expect(JSON.parse(out).error).toMatchObject({
      code: 'FlourAllocationExceeded',
      details: { flour: 'whole-wheat' },
    });
  });

  it('explains the water balance', async () => {
    const { out } = await run(['formula', 'explain', 'f.json']);
    expect(out).toContain('water (pure water): 750 g');
    expect(out).toContain('instant-yeast: unknown');
  });
});
