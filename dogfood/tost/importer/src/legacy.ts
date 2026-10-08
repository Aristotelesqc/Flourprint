/**
 * Legacy parser for TOST ("HOME Bread Recipe") exports. It is deliberately isolated from the
 * product: it only reads the export into an intermediate representation and never produces
 * Flourprint documents (see migrate.ts).
 *
 * Format quirks of the export, handled here and nowhere else:
 * - top-level keys are written `id_bread_N={` instead of `"id_bread_N":{`;
 * - a line break was inserted after every comma, including inside string values
 *   (`"1,\n38Kg"` for `"1,38Kg"`).
 */

/** One extra ingredient, in grams per piece. */
export interface TostExtra {
  readonly key: string;
  readonly gramsPerPiece: number;
}

export interface TostNote {
  readonly description: string;
  readonly text: string;
}

/** Intermediate representation of one TOST recipe: values as TOST stored them. */
export interface TostRecipe {
  readonly id: string;
  readonly name: string;
  readonly pieces: number;
  /** Main flour per piece, tangzhong flour excluded (`INT_FLOUR_WEIGHT`). */
  readonly flourPerPiece: number;
  /** Dough per piece without salt and yeast (`INT_DOUGH_WEIGHT`, rounded to the gram). */
  readonly doughPerPiece: number;
  /** 600: flour entered, 700: dough entered (inferred, see the report). */
  readonly driver: number;
  /** Relative to the main flour, water of the extras included. */
  readonly hydrationPct: number;
  readonly saltPct: number;
  readonly yeastPct: number;
  readonly yeastType: string;
  readonly flours: readonly { readonly key: string; readonly sharePct: number }[];
  readonly extras: readonly TostExtra[];
  readonly ferment: {
    readonly type: string;
    /** Share of the main flour. */
    readonly flourPct: number;
    /** Water over flour, as a fraction (1 = 100 %). */
    readonly hydration: number;
    readonly hours: number;
    readonly temperatureC: number;
  };
  readonly hours: { readonly bulkWarm: number; readonly bulkCold: number; readonly proof: number };
  readonly temperaturesC: {
    readonly bulkWarm: number;
    readonly bulkCold: number;
    readonly proof: number;
    readonly ambient: number;
    readonly dough: number;
  };
  readonly shapeBeforeCold: boolean;
  readonly shapeBeforeProof: boolean;
  readonly roundedFlourToAdd: number;
  readonly notes: readonly TostNote[];
  /** Every field as exported, for the field inventory of the report. */
  readonly raw: Readonly<Record<string, unknown>>;
}

export class TostFormatError extends Error {}

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Turns the export text into plain JSON and parses it. */
export const parseTostJson = (text: string): Record<string, Raw> => {
  const json = text
    .replace(/,\n/g, ',')
    .replace(/(^|[\s,{])(id_[A-Za-z0-9_]+)=\{/g, (_m, before: string, key: string) => {
      return `${before}"${key}":{`;
    });
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new TostFormatError(`Not a TOST export: ${(error as Error).message}`);
  }
  if (!isRecord(data) || !Object.values(data).every(isRecord)) {
    throw new TostFormatError('Not a TOST export: expected an object of recipes');
  }
  return data as Record<string, Raw>;
};

const field = <T>(raw: Raw, key: string, check: (v: unknown) => v is T, id: string): T => {
  const value = raw[key];
  if (!check(value)) throw new TostFormatError(`${id}: field ${key} is missing or invalid`);
  return value;
};

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

/** Reads every recipe of an export into the intermediate representation. */
export const parseTostExport = (text: string): TostRecipe[] =>
  Object.entries(parseTostJson(text)).map(([key, raw]) => readRecipe(key, raw));

const readRecipe = (key: string, raw: Raw): TostRecipe => {
  const id = field(raw, 'S_CUBE_ID', isString, key);
  if (id !== key) throw new TostFormatError(`${key}: S_CUBE_ID is ${id}`);
  const num = (name: string) => field(raw, name, isNumber, id);
  const str = (name: string) => field(raw, name, isString, id);
  const bool = (name: string) => field(raw, name, isBoolean, id);

  const flours = [1, 2, 3]
    .map((n) => ({ key: str(`S_FLOUR${n}_TYPE`), sharePct: num(`INT_FLOUR${n}_PERCENT`) }))
    .filter((f) => f.sharePct > 0);

  const extrasRaw = raw.S_CUBE_EXTRA_INGREDIENTS ?? {};
  if (!isRecord(extrasRaw)) throw new TostFormatError(`${id}: invalid extra ingredients`);
  const extras = Object.values(extrasRaw).map((extra) => {
    if (!isRecord(extra)) throw new TostFormatError(`${id}: invalid extra ingredient`);
    return {
      key: field(extra, 'S_INGREDIENT_KEY_TYPE', isString, id),
      gramsPerPiece: field(extra, 'S_INGREDIENT_WEIGHT_SI', isNumber, id),
    };
  });

  const notesRaw = raw.S_CUBE_NOTESPHOTOS ?? {};
  if (!isRecord(notesRaw)) throw new TostFormatError(`${id}: invalid notes`);
  const notes = Object.values(notesRaw).map((note) => {
    if (!isRecord(note)) throw new TostFormatError(`${id}: invalid note`);
    return {
      description: field(note, 'S_NOTEPHOTO_DESCRIPTION', isString, id),
      text: field(note, 'S_NOTEPHOTO_TEXTOFNOTE', isString, id),
    };
  });

  return {
    id,
    name: str('S_CUBE_NAME'),
    pieces: num('INT_BREAD_BATCH_NUMBER'),
    flourPerPiece: num('INT_FLOUR_WEIGHT'),
    doughPerPiece: num('INT_DOUGH_WEIGHT'),
    driver: num('INT_BREAD_COMPUTATION_DRIVER'),
    hydrationPct: num('INT_HYDRATION_PERCENT'),
    saltPct: num('D_SALT_PERCENT'),
    yeastPct: num('D_YEAST_PERCENT'),
    yeastType: str('S_YEAST_TYPE'),
    flours,
    extras,
    ferment: {
      type: str('S_BREAD_FERMENT_TYPE'),
      flourPct: num('INT_FERMENT_PERCENT'),
      hydration: num('D_FERMENT_HYDRATION_PERCENT'),
      hours: num('D_FERMENT_FERMENTATION_TIME'),
      temperatureC: num('INT_FERMENT_TEMPERATURE'),
    },
    hours: {
      bulkWarm: num('D_TIMING_BULK_WARM_FERMENTATION'),
      bulkCold: num('D_TIMING_BULK_COLD_FERMENTATION'),
      proof: num('D_TIMING_PROOF_WARM_FERMENTATION'),
    },
    temperaturesC: {
      bulkWarm: num('D_COMPUTED_WARM_BULK_TEMPERATURE'),
      bulkCold: num('D_COMPUTED_COLD_BULK_TEMPERATURE'),
      proof: num('D_COMPUTED_WARM_PROOF_TEMPERATURE'),
      ambient: num('INT_AMBIENT_TEMPERATURE'),
      dough: num('INT_DOUGH_TEMPERATURE'),
    },
    shapeBeforeCold: bool('B_SHAPE_BEFORE_BULK_COLD'),
    shapeBeforeProof: bool('B_SHAPE_BEFORE_PROOF_WARM'),
    roundedFlourToAdd: num('INT_FLOUR_ROUNDED_WEIGHT_TO_ADD'),
    notes,
    raw,
  };
};
