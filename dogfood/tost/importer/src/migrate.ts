import {
  projectProcess,
  resolveFormula,
  validateRecipe,
  type ContentPct,
  type Formula,
  type Ingredient,
  type Instant,
  type Process,
  type ProcessStep,
  type ResolvedFormula,
} from '../../../../packages/core/dist/domain/index.js';
import type { RecordedRecipe } from '../../../../packages/core/dist/application/index.js';
import { parseFormula } from '../../../../packages/core/dist/contracts/index.js';
import type { TostRecipe } from './legacy.js';
import { parseNoteDate } from './dates.js';

/**
 * Explicit migration from the TOST intermediate representation to Flourprint documents. Every
 * choice that is not a plain copy comes from the owner's decisions (decisions.json) or is reported.
 */

export type Status = 'converted' | 'converted-with-warning' | 'needs-review';

interface FlourChoice {
  readonly id: string;
  readonly confidence: 'tost' | 'guess-from-recipe-name' | 'unknown';
}

export interface Decisions {
  readonly source: { readonly exportedAt: string };
  readonly timeZone: string;
  readonly recipeIdPrefix: string;
  readonly tostWaterModel: { readonly solids: Readonly<Record<string, number>> };
  readonly tangzhong: { readonly flourFraction: number };
  readonly poolish: { readonly yeastGramsByRecipe: Readonly<Record<string, number>> };
  readonly flours: {
    readonly default: Readonly<Record<string, FlourChoice>>;
    readonly byRecipe: Readonly<Record<string, Readonly<Record<string, FlourChoice>>>>;
  };
  readonly yeast: { readonly id: string };
  readonly ingredients: Readonly<Record<string, string>>;
  readonly compositions: Readonly<
    Record<string, { water?: ContentPct; fat?: ContentPct; sugar?: ContentPct } | string>
  >;
  readonly families: readonly {
    readonly id: string;
    readonly name: string;
    readonly members: readonly string[];
  }[];
  readonly reviews: Readonly<Record<string, readonly string[] | string>>;
}

/** Grams for the whole batch, as TOST had the owner weigh them, and as Flourprint derives them. */
export interface Comparison {
  readonly tost: {
    readonly mainFlour: number;
    readonly tangzhong: number;
    readonly water: number;
    readonly salt: number;
    readonly yeast: number;
    readonly extras: Readonly<Record<string, number>>;
    readonly dough: number;
    readonly hydrationPct: number;
    /** Stored dough minus the dough rebuilt from TOST's own water model, per piece. */
    readonly doughResidualPerPiece: number;
  };
  readonly flourprint: {
    readonly flourTotal: number;
    readonly pureWater: number;
    readonly finalMixWater: number;
    readonly doughWeight: number;
    readonly pureWaterPct: number;
    readonly totalWaterPct: number;
    readonly totalWaterComplete: boolean;
    readonly totalFatPct?: number;
    readonly totalSugarPct?: number;
    readonly components: Readonly<Record<string, { flour: number; water: number }>>;
  };
}

export interface RecipeReport {
  readonly legacyId: string;
  readonly recipeId: string;
  readonly name: string;
  readonly status: Status;
  readonly anchor: string;
  readonly createdAt: string;
  readonly family?: string;
  readonly flours: readonly string[];
  readonly assumptions: readonly string[];
  readonly warnings: readonly string[];
  readonly reviews: readonly string[];
  readonly dropped: readonly string[];
  readonly engine: readonly string[];
  readonly comparison: Comparison;
}

export interface Migrated {
  readonly recipe: RecordedRecipe;
  readonly report: RecipeReport;
}

export class MigrationError extends Error {}

const H = 3600;
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Migrates one recipe; throws `MigrationError` when the engine refuses the result. */
export const migrateRecipe = (tost: TostRecipe, decisions: Decisions): Migrated => {
  const assumptions: string[] = [];
  const warnings: string[] = [];
  const reviews: string[] = [];
  const dropped: string[] = [];
  const n = tost.pieces;
  const solids = decisions.tostWaterModel.solids;
  const solidsOf = (key: string): number => {
    const value = solids[key];
    if (value === undefined) throw new MigrationError(`${tost.id}: no TOST water model for ${key}`);
    return value;
  };

  // --- Masses for the whole batch, rebuilt from TOST's own model -------------------------------
  const mainFlour = tost.flourPerPiece * n;
  const tangzhongExtras = tost.extras.filter((e) => e.key === 'disc_tangzhong');
  const otherExtras = tost.extras.filter((e) => e.key !== 'disc_tangzhong');
  const tangzhongMass = tangzhongExtras.reduce((s, e) => s + e.gramsPerPiece, 0) * n;
  const tzFlour = tangzhongMass * decisions.tangzhong.flourFraction;
  const tzWater = tangzhongMass - tzFlour;
  // Water TOST had the owner weigh for the dough (tangzhong prepared on the side).
  const modelWater =
    (tost.hydrationPct / 100) * mainFlour -
    tost.extras.reduce((s, e) => s + (1 - solidsOf(e.key)) * e.gramsPerPiece * n, 0);
  // The extras can bring more water than the hydration asks for: nothing is left to weigh.
  const weighedWater = Math.max(0, modelWater);
  if (modelWater < 0) {
    reviews.push(
      `TOST's hydration (${round(tost.hydrationPct)} %) is below the water its model gives the extras: it would need ${round(modelWater)} g of water. Imported with no added water.`,
    );
  }
  const pureWater = weighedWater + tzWater;
  const salt = (tost.saltPct / 100) * mainFlour;
  const yeast = (tost.yeastPct / 100) * mainFlour;
  const flourTotal = mainFlour + tzFlour;
  const rebuiltDough =
    tost.flourPerPiece * (1 + tost.hydrationPct / 100) +
    tost.extras.reduce((s, e) => s + solidsOf(e.key) * e.gramsPerPiece, 0);
  const doughResidualPerPiece = tost.doughPerPiece - rebuiltDough;
  assumptions.push(
    'Salt and yeast percentages are taken relative to the main flour, as TOST shows them.',
    `Tangzhong: ${decisions.tangzhong.flourFraction * 100} % flour (TOST), from the main flour.`,
    'Water to weigh rebuilt from TOST: hydration × main flour − water TOST attributes to extras.',
  );
  if (Math.abs(doughResidualPerPiece) > 0.5) {
    warnings.push(
      `TOST's dough weight differs from its own model by ${round(doughResidualPerPiece)} g per piece.`,
    );
  }

  // --- Flours ---------------------------------------------------------------------------------
  const floursOverride = decisions.flours.byRecipe[tost.id] ?? {};
  const flourChoice = (key: string): FlourChoice => {
    const choice = floursOverride[key] ?? decisions.flours.default[key];
    if (!choice) throw new MigrationError(`${tost.id}: no flour decision for ${key}`);
    return choice;
  };
  const [main, ...others] = tost.flours;
  if (!main) throw new MigrationError(`${tost.id}: no flour`);
  const flourGrams = new Map<string, number>();
  const flourNotes: string[] = [];
  for (const flour of tost.flours) {
    const choice = flourChoice(flour.key);
    flourGrams.set(
      choice.id,
      (flourGrams.get(choice.id) ?? 0) + (mainFlour * flour.sharePct) / 100,
    );
    flourNotes.push(`${flour.key} → ${choice.id} (${round(flour.sharePct)} % of the main flour)`);
    if (choice.confidence === 'guess-from-recipe-name') {
      warnings.push(`Flour ${flour.key} named ${choice.id} from the recipe name: to check.`);
    } else if (choice.confidence === 'unknown') {
      warnings.push(`Flour ${flour.key} is a TOST custom or unnamed flour: to identify.`);
    }
  }
  const mainId = flourChoice(main.key).id;
  flourGrams.set(mainId, (flourGrams.get(mainId) ?? 0) + tzFlour);
  if (others.length > 0 && (tzFlour > 0 || tost.ferment.type === 'disc_poolish')) {
    assumptions.push(`Tangzhong and poolish flour drawn from the main flour (${mainId}) only.`);
  }
  const pct = (grams: number) => (100 * grams) / flourTotal;

  // --- Ingredients ----------------------------------------------------------------------------
  const composition = (id: string): Pick<Ingredient, 'water' | 'fat' | 'sugar'> => {
    const entry = decisions.compositions[id];
    if (entry === undefined || typeof entry === 'string') {
      warnings.push(`No composition for ${id}: water, fat and sugar unknown.`);
      return {};
    }
    return {
      ...(entry.water ? { water: entry.water } : {}),
      ...(entry.fat ? { fat: entry.fat } : {}),
      ...(entry.sugar ? { sugar: entry.sugar } : {}),
    };
  };
  const ingredients: Ingredient[] = [
    { id: 'water', kind: 'water', bakerPct: pct(pureWater), role: 'dough' },
    { id: 'salt', kind: 'other', bakerPct: pct(salt), role: 'dough', ...composition('salt') },
    {
      id: decisions.yeast.id,
      kind: 'other',
      bakerPct: pct(yeast),
      role: 'dough',
      ...composition(decisions.yeast.id),
    },
  ];
  if (tost.yeastType !== 'disc_active_dry_yeast') {
    assumptions.push(`Yeast ${tost.yeastType} recorded as ${decisions.yeast.id} (owner decision).`);
  }
  const extraGrams: Record<string, number> = {};
  for (const extra of otherExtras) {
    const id = decisions.ingredients[extra.key];
    if (!id) throw new MigrationError(`${tost.id}: no ingredient for ${extra.key}`);
    const grams = extra.gramsPerPiece * n;
    extraGrams[id] = (extraGrams[id] ?? 0) + grams;
    if (extra.gramsPerPiece === 0) {
      reviews.push(`${id} is at 0 g in TOST: kept at 0, remove it if it is not used.`);
    }
  }
  for (const [id, grams] of Object.entries(extraGrams)) {
    ingredients.push({
      id,
      kind: 'other',
      bakerPct: pct(grams),
      role: 'dough',
      ...composition(id),
    });
  }

  // --- Components -----------------------------------------------------------------------------
  const components: Formula['components'][number][] = [];
  if (tangzhongMass > 0) {
    components.push({
      id: 'tangzhong',
      kind: 'scald',
      flourPct: pct(tzFlour),
      flourBlend: [{ flour: mainId, sharePct: 100 }],
      hydrationPct: (100 * tzWater) / tzFlour,
    });
  }
  const hasPoolish = tost.ferment.type === 'disc_poolish' && tost.ferment.flourPct > 0;
  if (tost.ferment.type === 'disc_no_ferment' && tost.ferment.flourPct > 0) {
    reviews.push(
      `TOST stores a ${tost.ferment.flourPct} % preferment with type "no ferment": not imported.`,
    );
  }
  if (hasPoolish) {
    const poolishFlour = (mainFlour * tost.ferment.flourPct) / 100;
    const yeastGrams = decisions.poolish.yeastGramsByRecipe[tost.id];
    components.push({
      id: 'poolish',
      kind: 'preferment',
      flourPct: pct(poolishFlour),
      flourBlend: [{ flour: mainId, sharePct: 100 }],
      hydrationPct: tost.ferment.hydration * 100,
      ...(yeastGrams === undefined
        ? {}
        : { allocations: [{ ingredient: decisions.yeast.id, bakerPct: pct(yeastGrams) }] }),
    });
    if (yeastGrams === undefined) {
      warnings.push('Yeast in the poolish unknown: TOST does not export it.');
    } else {
      warnings.push(
        `Yeast in the poolish: ${yeastGrams} g, from the owner's recollection (TOST does not export it).`,
      );
    }
  }
  if (tost.roundedFlourToAdd !== tost.flourPerPiece) {
    reviews.push(
      `TOST's flour to add (${round(tost.roundedFlourToAdd)} g) differs from its flour weight (${round(tost.flourPerPiece)} g).`,
    );
  }

  // --- Anchor ---------------------------------------------------------------------------------
  const dough =
    flourTotal + pureWater + salt + yeast + Object.values(extraGrams).reduce((s, g) => s + g, 0);
  const formula: Formula = {
    flours: [...flourGrams].map(([id, grams]) => ({ id, sharePct: pct(grams) })),
    ingredients,
    components,
    anchor: { kind: 'pieces', count: n, gramsEach: dough / n },
  };
  assumptions.push(
    'Anchor: pieces × grams each, so that the flour to weigh stays the one TOST gave; the piece weight now includes salt and yeast.',
  );

  // --- Process --------------------------------------------------------------------------------
  const steps: ProcessStep[] = [];
  const decision = { kind: 'userDecision' } as const;
  if (hasPoolish) {
    steps.push({
      id: 'poolish',
      operation: 'preferment',
      dependsOn: [],
      schedule: 'asap',
      ...hours(tost.ferment.hours, 'poolish', reviews),
      conditions: { location: 'counter', temperatureC: tost.ferment.temperatureC },
    });
  }
  if (tangzhongMass > 0) {
    steps.push({
      id: 'tangzhong',
      operation: 'scald',
      dependsOn: [],
      schedule: 'asap',
      endCriterion: decision,
    });
  }
  steps.push({
    id: 'mix',
    operation: 'mix',
    dependsOn: steps.map((s) => s.id),
    schedule: 'asap',
    endCriterion: decision,
  });
  const then = (step: Omit<ProcessStep, 'dependsOn' | 'schedule'>) => {
    const previous = steps.at(-1);
    steps.push({ ...step, dependsOn: previous ? [previous.id] : [], schedule: 'asap' });
  };
  then({
    id: 'bulk',
    operation: 'bulk',
    ...hours(tost.hours.bulkWarm, 'bulk', reviews),
    conditions: { location: 'counter', temperatureC: tost.temperaturesC.bulkWarm },
  });
  const hasCold = tost.hours.bulkCold > 0;
  if (tost.shapeBeforeCold && hasCold)
    then({ id: 'shape', operation: 'shape', endCriterion: decision });
  if (hasCold) {
    then({
      id: 'retard',
      operation: 'retard',
      plannedDurationS: Math.round(tost.hours.bulkCold * H),
      conditions: { location: 'fridge', temperatureC: tost.temperaturesC.bulkCold },
    });
  }
  if (!steps.some((s) => s.id === 'shape')) {
    then({ id: 'shape', operation: 'shape', endCriterion: decision });
  }
  then({
    id: 'proof',
    operation: 'proof',
    ...hours(tost.hours.proof, 'proof', reviews),
    conditions: { location: 'counter', temperatureC: tost.temperaturesC.proof },
  });
  then({ id: 'bake', operation: 'bake', endCriterion: decision });
  const process: Process = { steps };
  assumptions.push(
    'Mix, shape and bake have no duration in TOST: they end when the baker says so (#32).',
  );

  // --- Options TOST stores without an equivalent here -----------------------------------------
  const raw = tost.raw;
  if (raw.S_OPTION_OVEN_TYPE === 'no_cooking') reviews.push('TOST oven mode is "no cooking".');
  dropped.push(
    `Target dough temperature ${tost.temperaturesC.dough} °C, ambient ${tost.temperaturesC.ambient} °C (no field yet).`,
    `Kneading ${String(raw.S_OPTION_KNEADING)}, mixer ${String(raw.S_OPTION_TYPE_ROBOT)}, folds ${String(raw.B_OPTION_FOLD_DOUGH)}, autolysis ${String(raw.B_OPTION_AUTOLYSIS)} (#32).`,
    `Oven mode ${String(raw.S_OPTION_OVEN_TYPE)}, shape ${String(raw.S_BREAD_SHAPE)} (#28).`,
  );
  if (tost.ferment.type !== 'disc_poolish' && tost.ferment.flourPct === 0) {
    dropped.push('Starter settings of TOST (no preferment in this recipe).');
  }
  const extraReviews = decisions.reviews[tost.id];
  if (Array.isArray(extraReviews)) reviews.push(...(extraReviews as string[]));

  // --- Revision -------------------------------------------------------------------------------
  const note = tost.notes[0];
  const date = note ? parseNoteDate(note.text, decisions.timeZone) : undefined;
  const createdAt = (date?.instant ?? decisions.source.exportedAt) as Instant;
  if (!date) warnings.push('No creation date in the TOST notes: export date used.');
  const text = [date?.rest, ...tost.notes.slice(1).map((n) => n.text.trim())]
    .filter((t): t is string => !!t)
    .join('\n');
  const recipeId = `${decisions.recipeIdPrefix}${tost.id}`;
  const family = decisions.families.find((f) => f.members.includes(tost.id));

  // --- Engine validation ----------------------------------------------------------------------
  const boundary = parseFormula(formula);
  if (!boundary.ok) {
    throw new MigrationError(`${tost.id}: boundary refused ${JSON.stringify(boundary.issues)}`);
  }
  const valid = validateRecipe(formula, process);
  if (!valid.ok) throw new MigrationError(`${tost.id}: ${JSON.stringify(valid.error)}`);
  const projected = projectProcess(process, { mode: { kind: 'startAt', at: createdAt } });
  if (!projected.ok) throw new MigrationError(`${tost.id}: ${JSON.stringify(projected.error)}`);
  const resolved = resolveFormula(formula);
  if (!resolved.ok) throw new MigrationError(`${tost.id}: ${JSON.stringify(resolved.error)}`);
  const r = resolved.value;
  if (Math.abs(r.flourTotal - flourTotal) > 1e-6 * flourTotal) {
    throw new MigrationError(`${tost.id}: flour total drifted to ${r.flourTotal}`);
  }
  const engine = engineNotes(r);
  const blockers = [
    ...new Set(Object.values(projected.value.steps).flatMap((s) => s.unknownAfter)),
  ].sort();
  if (blockers.length > 0) {
    engine.push(
      `Planned times after ${blockers.join(', ')} are unknown until those steps get a duration.`,
    );
  }

  const status: Status =
    reviews.length > 0
      ? 'needs-review'
      : warnings.length > 0
        ? 'converted-with-warning'
        : 'converted';

  return {
    recipe: {
      id: recipeId,
      name: tost.name,
      ...(family ? { familyId: family.id } : {}),
      // The qualification travels with the recipe: the app shows it until the owner checks it.
      ...(status === 'converted'
        ? {}
        : {
            review: {
              level: status === 'needs-review' ? ('review' as const) : ('warning' as const),
              reasons: [...reviews, ...warnings],
            },
          }),
      revisions: [
        {
          recipeId,
          version: 1,
          formula,
          process,
          createdAt,
          note: [`TOST ${tost.id}`, text].filter(Boolean).join('\n'),
        },
      ],
    },
    report: {
      legacyId: tost.id,
      recipeId,
      name: tost.name,
      status,
      anchor: `${n} × ${round(dough / n, 1)} g`,
      createdAt,
      ...(family ? { family: family.name } : {}),
      flours: flourNotes,
      assumptions,
      warnings,
      reviews,
      dropped,
      engine,
      comparison: {
        tost: {
          mainFlour: round(mainFlour),
          tangzhong: round(tangzhongMass),
          water: round(weighedWater),
          salt: round(salt),
          yeast: round(yeast),
          extras: Object.fromEntries(Object.entries(extraGrams).map(([k, v]) => [k, round(v)])),
          dough: round(tost.doughPerPiece * n),
          hydrationPct: round(tost.hydrationPct),
          doughResidualPerPiece: round(doughResidualPerPiece),
        },
        flourprint: {
          flourTotal: round(r.flourTotal),
          pureWater: round(r.pureWaterTotal),
          finalMixWater: round(r.finalMixWater),
          doughWeight: round(r.doughWeight),
          pureWaterPct: round(r.pureWaterPct),
          totalWaterPct: round(r.totalWaterPct),
          totalWaterComplete: r.totalWater.completeness === 'complete',
          ...(r.totalFatPct === undefined ? {} : { totalFatPct: round(r.totalFatPct) }),
          ...(r.totalSugarPct === undefined ? {} : { totalSugarPct: round(r.totalSugarPct) }),
          components: Object.fromEntries(
            Object.entries(r.components).map(([id, c]) => [
              id,
              { flour: round(c.flour), water: round(c.water) },
            ]),
          ),
        },
      },
    },
  };
};

/** A fermentation duration, or no duration with a review reason when TOST's value is unusable. */
const hours = (
  value: number,
  step: string,
  reviews: string[],
): { plannedDurationS?: number; endCriterion?: { kind: 'userDecision' } } => {
  if (value > 0) return { plannedDurationS: Math.round(value * H) };
  reviews.push(`TOST ${step} duration is ${value} h: left without a duration.`);
  return { endCriterion: { kind: 'userDecision' } };
};

const engineNotes = (r: ResolvedFormula): string[] => {
  const notes: string[] = [];
  const incomplete = (what: string, ids: readonly string[]) =>
    ids.length > 0 && notes.push(`${what} incomplete: unknown for ${ids.join(', ')}.`);
  incomplete('Total water', r.totalWater.unknownContributors);
  if (r.totalFat) incomplete('Fat total', r.totalFat.unknownContributors);
  if (r.totalSugar) incomplete('Sugar total', r.totalSugar.unknownContributors);
  return notes;
};
