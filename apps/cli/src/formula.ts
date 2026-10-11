import { readFile } from 'node:fs/promises';
import { InvalidArgumentError, type Command } from 'commander';
import { parseFormula } from '@flourprint/core/contracts';
import {
  applyFormulaEdit,
  resolveFormula,
  type Anchor,
  type Formula,
  type ResolvedFormula,
} from '@flourprint/core/domain';
import { renderCalculation, renderWaterExplanation } from './format.js';

export interface Io {
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
  readonly readText: (path: string) => Promise<string>;
}

export const nodeIo: Io = {
  out: (text) => process.stdout.write(`${text}\n`),
  err: (text) => process.stderr.write(`${text}\n`),
  readText: (path) => readFile(path, 'utf8'),
};

/** A failure already reported to the user; the caller only sets the exit code. */
export class ReportedError extends Error {}

interface OutputOptions {
  readonly json?: boolean;
}

const fail = (
  io: Io,
  json: boolean | undefined,
  code: string,
  message: string,
  details?: unknown,
): never => {
  if (json) io.out(JSON.stringify({ error: { code, message, details } }, null, 2));
  else io.err(`Error ${code}: ${message}`);
  throw new ReportedError(code);
};

const loadFormula = async (io: Io, path: string, json: boolean | undefined): Promise<Formula> => {
  let data: unknown;
  try {
    data = JSON.parse(await io.readText(path));
  } catch (cause) {
    return fail(
      io,
      json,
      'UnreadableInput',
      `Cannot read JSON from ${path}: ${(cause as Error).message}`,
    );
  }
  const parsed = parseFormula(data);
  if (!parsed.ok) {
    const summary = parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    return fail(io, json, 'InvalidInput', summary, parsed.issues);
  }
  return parsed.value;
};

const resolveOrFail = (io: Io, formula: Formula, json: boolean | undefined): ResolvedFormula => {
  const resolved = resolveFormula(formula);
  if (!resolved.ok) {
    const { code, message, details } = resolved.error;
    return fail(io, json, code, message, details);
  }
  return resolved.value;
};

const positiveNumber = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new InvalidArgumentError('Expected a positive number.');
  return parsed;
};

const pieces = (value: string): { count: number; gramsEach: number } => {
  const match = /^(\d+)x(\d+(?:\.\d+)?)$/.exec(value);
  if (!match) throw new InvalidArgumentError('Expected <count>x<grams>, for example 2x860.');
  return { count: Number(match[1]), gramsEach: Number(match[2]) };
};

interface ScaleOptions extends OutputOptions {
  readonly flour?: number;
  readonly dough?: number;
  readonly pieces?: { count: number; gramsEach: number };
}

const anchorFrom = (options: ScaleOptions): Anchor[] => [
  ...(options.flour === undefined ? [] : [{ kind: 'flourTotal', grams: options.flour } as const]),
  ...(options.dough === undefined ? [] : [{ kind: 'doughWeight', grams: options.dough } as const]),
  ...(options.pieces === undefined ? [] : [{ kind: 'pieces', ...options.pieces } as const]),
];

export const registerFormulaCommands = (program: Command, io: Io): void => {
  const formula = program.command('formula').description('Calculate, scale and explain formulas');

  formula
    .command('calculate')
    .description('Resolve a formula file into grams, totals and water balance')
    .argument('<file>', 'formula JSON file')
    .option('--json', 'machine-readable output')
    .action(async (file: string, options: OutputOptions) => {
      const resolved = resolveOrFail(io, await loadFormula(io, file, options.json), options.json);
      io.out(options.json ? JSON.stringify(resolved, null, 2) : renderCalculation(resolved));
    });

  formula
    .command('scale')
    .description('Rescale a formula to a new anchor, keeping its percentages')
    .argument('<file>', 'formula JSON file')
    .option('--flour <grams>', 'total flour', positiveNumber)
    .option('--dough <grams>', 'dough weight', positiveNumber)
    .option('--pieces <count>x<grams>', 'number and weight of dough pieces', pieces)
    .option('--json', 'machine-readable output')
    .action(async (file: string, options: ScaleOptions) => {
      const anchors = anchorFrom(options);
      if (anchors.length !== 1) {
        fail(
          io,
          options.json,
          'InvalidArguments',
          'Give exactly one of --flour, --dough or --pieces.',
        );
      }
      const source = await loadFormula(io, file, options.json);
      const scaled = applyFormulaEdit(source, {
        type: 'SetAnchor',
        mode: 'rescale',
        anchor: anchors[0] as Anchor,
      });
      if (!scaled.ok) {
        fail(io, options.json, scaled.error.code, scaled.error.message, scaled.error.details);
        return;
      }
      const resolved = resolveOrFail(io, scaled.value, options.json);
      io.out(
        options.json
          ? JSON.stringify({ formula: scaled.value, resolved }, null, 2)
          : renderCalculation(resolved),
      );
    });

  formula
    .command('explain')
    .description('Explain how the water quantities of a formula are obtained')
    .argument('<file>', 'formula JSON file')
    .option('--json', 'machine-readable output')
    .action(async (file: string, options: OutputOptions) => {
      const resolved = resolveOrFail(io, await loadFormula(io, file, options.json), options.json);
      io.out(
        options.json
          ? JSON.stringify(
              {
                totalWater: resolved.totalWater,
                totalWaterPct: resolved.totalWaterPct,
                pureWaterTotal: resolved.pureWaterTotal,
                pureWaterPct: resolved.pureWaterPct,
                finalMixWater: resolved.finalMixWater,
                components: resolved.components,
              },
              null,
              2,
            )
          : renderWaterExplanation(resolved),
      );
    });
};
