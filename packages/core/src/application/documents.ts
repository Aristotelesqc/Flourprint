import type { Formula, Process } from '../domain/index.js';
import { isNumber, isObject, refuse, type Json } from './decode.js';

/**
 * Structural decoders for formula and process documents read from untrusted JSON (backups,
 * recipe files). They check every field's type and every discriminant, and refuse unknown
 * fields, before business validation runs (persistence.md). Operation codes and locations stay
 * open strings (#5).
 */

type Check = (value: unknown, where: string) => void;

const isString = (value: unknown): value is string => typeof value === 'string';

const fields = (
  value: unknown,
  where: string,
  required: Readonly<Record<string, Check>>,
  optional: Readonly<Record<string, Check>> = {},
): Json => {
  if (!isObject(value)) return refuse(`${where} is not an object`);
  for (const key of Object.keys(value)) {
    if (!(key in required) && !(key in optional)) refuse(`${where} has an unknown field ${key}`);
  }
  for (const [key, check] of Object.entries(required)) {
    if (!(key in value)) refuse(`${where} has no ${key}`);
    check(value[key], `${where}.${key}`);
  }
  for (const [key, check] of Object.entries(optional)) {
    if (value[key] !== undefined) check(value[key], `${where}.${key}`);
  }
  return value;
};

const string: Check = (value, where) => {
  if (!isString(value)) refuse(`${where} is not a string`);
};
const number: Check = (value, where) => {
  if (!isNumber(value)) refuse(`${where} is not a number`);
};
const oneOf =
  (...allowed: readonly string[]): Check =>
  (value, where) => {
    if (!isString(value) || !allowed.includes(value)) {
      refuse(`${where} must be one of ${allowed.join(', ')}`);
    }
  };
const list =
  (item: Check): Check =>
  (value, where) => {
    if (!Array.isArray(value)) return refuse(`${where} is not a list`);
    value.forEach((v: unknown, i) => item(v, `${where}[${i}]`));
  };
/** A discriminated union: the discriminant picks the fields to check. */
const union =
  (
    key: string,
    variants: Readonly<Record<string, (value: unknown, where: string) => void>>,
  ): Check =>
  (value, where) => {
    if (!isObject(value)) return refuse(`${where} is not an object`);
    const tag = value[key];
    const variant = isString(tag) ? variants[tag] : undefined;
    if (!variant || !Object.hasOwn(variants, tag as string)) {
      return refuse(`${where}.${key} must be one of ${Object.keys(variants).join(', ')}`);
    }
    variant(value, where);
  };

const range: Check = (value, where) => {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(isNumber)) {
    refuse(`${where} must be two numbers`);
  }
};

const rangeBound = union('kind', {
  finite: (v, w) => fields(v, w, { kind: string, value: number }),
  beyondHorizon: (v, w) => fields(v, w, { kind: string, horizonS: number }),
});

const modelRef: Check = (v, w) => fields(v, w, { id: string, version: string });

/** A portable estimate range: two bounds (values-and-units.md). */
export const estimateRange: Check = (value, where) => {
  if (!Array.isArray(value) || value.length !== 2) return refuse(`${where} must be two bounds`);
  value.forEach((bound: unknown, i) => rangeBound(bound, `${where}[${i}]`));
};

/** The estimate that came with an applied suggestion: always `ok`. */
const acceptedEstimate: Check = (v, w) =>
  fields(
    v,
    w,
    { status: oneOf('ok'), value: number, model: modelRef, assumptions: list(string) },
    { range: estimateRange, extrapolations: list(string), calibration: modelRef },
  );

/** Provenance of an applied model suggestion (fermentation.md). */
const accepted: Check = (v, w) =>
  fields(v, w, { estimate: acceptedEstimate, appliedValue: number, model: modelRef });

const content = union('status', {
  known: (v, w) => fields(v, w, { status: string, valuePct: number }, { source: string }),
  estimated: (v, w) =>
    fields(v, w, { status: string, valuePct: number }, { rangePct: range, source: string }),
  unknown: (v, w) => fields(v, w, { status: string }),
});

const flour: Check = (v, w) => fields(v, w, { id: string, sharePct: number });

const ingredient: Check = (v, w) =>
  fields(
    v,
    w,
    {
      id: string,
      kind: oneOf('water', 'other'),
      bakerPct: number,
      role: oneOf('dough', 'topping', 'glaze'),
    },
    {
      water: content,
      fat: content,
      sugar: content,
      yeast: (y, yw) => fields(y, yw, { form: oneOf('fresh', 'active-dry', 'instant') }),
      accepted,
    },
  );

const component: Check = (v, w) =>
  fields(
    v,
    w,
    {
      id: string,
      kind: oneOf('preferment', 'scald', 'soaker', 'custom'),
      flourPct: number,
      flourBlend: list((p, pw) => fields(p, pw, { flour: string, sharePct: number })),
      hydrationPct: number,
    },
    {
      waterLossPct: number,
      allocations: list((a, aw) =>
        fields(a, aw, { ingredient: string, bakerPct: number }, { accepted }),
      ),
    },
  );

const anchor = union('kind', {
  flourTotal: (v, w) => fields(v, w, { kind: string, grams: number }),
  doughWeight: (v, w) => fields(v, w, { kind: string, grams: number }),
  pieces: (v, w) => fields(v, w, { kind: string, count: number, gramsEach: number }),
});

const endCriterion = union('kind', {
  duration: (v, w) => fields(v, w, { kind: string }),
  observation: (v, w) => fields(v, w, { kind: string }, { description: string }),
  userDecision: (v, w) => fields(v, w, { kind: string }),
});

const incorporation = union('item', {
  flour: (v, w) => fields(v, w, { item: string, id: string, sharePct: number }),
  ingredient: (v, w) => fields(v, w, { item: string, id: string, sharePct: number }),
  component: (v, w) => fields(v, w, { item: string, id: string, sharePct: number }),
  water: (v, w) => fields(v, w, { item: string, sharePct: number }),
});

/** Techniques (process.md): method, end check and fold style stay open codes. */
const technique: Check = (v, w) =>
  fields(
    v,
    w,
    {},
    {
      method: string,
      phases: list((p, pw) =>
        fields(p, pw, { speed: oneOf('low', 'medium', 'high'), durationS: number }),
      ),
      folds: (f, fw) => fields(f, fw, { count: number, intervalS: number }, { style: string }),
      endCheck: string,
    },
  );

const step: Check = (v, w) =>
  fields(
    v,
    w,
    {
      id: string,
      operation: string,
      dependsOn: list(string),
      schedule: oneOf('asap', 'alap'),
    },
    {
      label: string,
      plannedDurationS: number,
      endCriterion,
      conditions: (c, cw) =>
        fields(
          c,
          cw,
          {},
          { location: string, temperatureC: number, doughTemperatureC: number, frictionC: number },
        ),
      incorporations: list(incorporation),
      accepted,
      technique,
    },
  );

/** Refuses (throws `Refused`) unless the value has exactly the shape of a formula. */
export const decodeFormula = (value: unknown, where: string): Formula => {
  fields(
    value,
    where,
    {
      flours: list(flour),
      ingredients: list(ingredient),
      components: list(component),
      anchor,
    },
    {
      waterTarget: (v, w) => fields(v, w, { totalWaterPct: number, absorbInto: string }),
    },
  );
  return value as Formula;
};

/** Refuses (throws `Refused`) unless the value has exactly the shape of a process. */
export const decodeProcess = (value: unknown, where: string): Process => {
  fields(value, where, { steps: list(step) }, { readiness: modelRef });
  return value as Process;
};
