import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CENTRAL,
  CORNERS,
  coreTemperatureC,
  guggenheim,
  personalCorrection,
  progressPerHour,
  SELF_HEATING_K,
  semenovPsi,
  simulate,
  thermalBand,
  thermalLag,
  twoPointTauH,
  type Band3,
  type FermentationParameters,
  type Segment,
  type SegmentLag,
  type ThermalInputs,
  type ThermalProfile,
} from '../src/domain/index.js';

/**
 * Cases of docs/contracts/fixtures/thermal, computed outside the engine (generate.py). Each one is
 * checked within the tolerance the fixture states.
 */
interface Case {
  name: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  tolerance: Record<string, number>;
}
const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../docs/contracts/fixtures/thermal/cases.json', import.meta.url)),
    'utf8',
  ),
) as { model: { id: string; version: string }; cases: Case[] };

const letter = (l: string): Case => {
  const found = file.cases.find((c) => c.name.startsWith(`${l}:`));
  if (!found) throw new Error(`no fixture case ${l}`);
  return found;
};

interface FixtureThermal {
  geometry: ThermalInputs['geometry'];
  container?: { material: ThermalInputs['material']; cover: ThermalInputs['cover'] };
  environment: ThermalInputs['environment'];
  porosity: ThermalInputs['porosity'];
  pieces?: number;
}
const inputsOf = (t: FixtureThermal): ThermalInputs => ({
  geometry: t.geometry,
  material: t.container?.material ?? 'glass',
  cover: t.container?.cover ?? 'film',
  liner: false,
  environment: t.environment,
  porosity: t.porosity,
  pieces: t.pieces ?? 1,
});
const kg = (massG: number, t: FixtureThermal) => massG / (t.pieces ?? 1) / 1000;

const close = (actual: number, expected: number, tolerance: number, what: string) =>
  expect(Math.abs(actual - expected), `${what}: ${actual} vs ${expected}`).toBeLessThanOrEqual(
    tolerance,
  );
const ratio = (actual: number, expected: number, tolerance: number, what: string) =>
  expect(Math.abs(actual / expected - 1), `${what}: ${actual} vs ${expected}`).toBeLessThanOrEqual(
    tolerance,
  );

const NO_HEATING: Band3 = { low: 0, central: 0, high: 0 };
const fixed = (tau: number): Band3 => ({ low: tau, central: tau, high: tau });
/** Self-heating off: the isolated lag cases of the fixtures. */
const lagOf = (tauH: Band3): SegmentLag => ({ tauH, heatingK: NO_HEATING });
const path = (p: FermentationParameters['path'], base = CENTRAL): FermentationParameters => ({
  ...base,
  path: p,
});

/** Progress F at the end of a path of segments, 1 % fresh yeast, central kinetic parameters. */
const progress = (
  p: FermentationParameters['path'],
  startC: number,
  segments: readonly Segment[],
): number => {
  const run = simulate(path(p), { freshPct: 1, startC, segments });
  if (run.kind !== 'progress') throw new Error(`no progress: ${run.kind}`);
  return run.progress;
};

describe('thermal fixtures: isolated cooling (cases a and b)', () => {
  for (const l of ['a', 'b']) {
    const c = letter(l);
    it(c.name, () => {
      const { massG, thermal, startC, ambientC, evaluatedAtHours } = c.input as {
        massG: number;
        thermal: FixtureThermal;
        startC: number;
        ambientC: number;
        evaluatedAtHours: number[];
      };
      const e = c.expected as Record<string, number | number[]>;
      const band = thermalBand(kg(massG, thermal), inputsOf(thermal));
      const lag = band.central;
      const tolerance = c.tolerance as { hours: number; temperatureC: number; ratio: number };
      for (const [key, value] of [
        ['ua', lag.ua],
        ['ueff', lag.ueff],
        ['r0', lag.r0],
        ['bi', lag.bi],
        ['gamma_core', lag.gammaCore],
        ['v_m3', lag.volumeM3],
        ['aw_m2', lag.awM2],
        ['at_m2', lag.atM2],
      ] as const) {
        ratio(value, e[key] as number, tolerance.ratio, key);
      }
      close(lag.tauLumpedS / 3600, e.tau_lumped_h as number, tolerance.hours, 'tau lumped');
      close(lag.tauEffH, e.tau_eff_h as number, tolerance.hours, 'tau eff');
      const [lo, hi] = e.tauBandH as number[];
      close(band.tauH.low, lo as number, tolerance.hours, 'band low');
      close(band.tauH.high, hi as number, tolerance.hours, 'band high');
      for (const t of evaluatedAtHours) {
        // The mean temperature comes out of the simulation, the core out of gamma_core.
        const run = simulate(CENTRAL, {
          freshPct: 1,
          startC,
          segments: [{ hours: t, ambientC, lag: lagOf(fixed(lag.tauEffH)) }],
        });
        if (run.kind !== 'progress') throw new Error('no progress');
        const mean = run.ends[0]?.doughC as number;
        close(mean, e[`meanC@${t}h`] as number, tolerance.temperatureC, `mean at ${t} h`);
        close(
          coreTemperatureC(startC, ambientC, mean, lag.gammaCore),
          e[`coreC@${t}h`] as number,
          tolerance.temperatureC,
          `core at ${t} h`,
        );
      }
    });
  }

  it('the 1 + Bi/(p+2) closure stays within 1.5 % of the exact first eigenvalue for Bi <= 1', () => {
    // The sphere of the contract (class ball) with the same conductance on both halves: the exact
    // first eigenvalue solves 1 - mu cot(mu) = Bi, bisected here, apart from the engine.
    const mu1 = (bi: number) => {
      let lo = 1e-9;
      let hi = Math.PI - 1e-9;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (1 - mid / Math.tan(mid) - bi > 0) hi = mid;
        else lo = mid;
      }
      return (lo + hi) / 2;
    };
    for (const massKg of [0.1, 0.25, 0.5, 1]) {
      const inputs: ThermalInputs = {
        geometry: 'ball',
        material: 'steel',
        cover: 'none',
        liner: false,
        environment: 'roomStill',
        porosity: 'unproofed',
        pieces: 1,
      };
      const lag = thermalLag(massKg, inputs, { hExt: 5, gShelf: 0, rCover: 0, cp: 2800 });
      if (lag.bi > 1) continue;
      const radius = lag.r0; // p V / A = R for a sphere
      const alpha = 0.38 / (1100 * 2800);
      const exact = (radius * radius) / (alpha * mu1(lag.bi) ** 2) / 3600;
      ratio(lag.tauEffH, exact, 0.015, `tau eff at ${massKg} kg (Bi ${lag.bi.toFixed(2)})`);
    }
  });

  it('reproduces the lumped time of the GPT cross-check (sphere, h 3.5, cp 2700, no container)', () => {
    const cross = file.cases.find((c) => c.name.startsWith('cross-check: GPT'));
    if (!cross) throw new Error('no cross-check');
    const tolerance = cross.tolerance as { tauH: number };
    // A ball in a thin steel wall is the sphere of the report to within 0.02 %.
    for (const [key, massG] of [
      ['A', 250],
      ['B', 2000],
      ['D', 500],
    ] as const) {
      const lag = thermalLag(
        massG / 1000,
        {
          geometry: 'ball',
          material: 'steel',
          cover: 'none',
          liner: false,
          environment: 'roomStill',
          porosity: 'unproofed',
          pieces: 1,
        },
        { hExt: 3.5, gShelf: 0, rCover: 0, cp: 2700 },
      );
      const expected = (cross.expected as Record<string, { tauLumpedH: number }>)[key];
      close(lag.tauLumpedS / 3600, expected?.tauLumpedH as number, tolerance.tauH, `lumped ${key}`);
    }
  });
});

describe('thermal fixtures: self-heating (cases c and f)', () => {
  const c = letter('c');
  const thermal = (c.input as { thermal: FixtureThermal }).thermal;
  const band = thermalBand(2, inputsOf(thermal));
  const tau = band.central.tauEffH;
  const e = c.expected as Record<string, number | Record<string, number>>;
  const tolerance = c.tolerance as { temperatureC: number; hours: number };

  it('the lag, the rate and beta of the case', () => {
    close(tau, e.tauEffH as number, tolerance.hours, 'tau eff');
    close(progressPerHour(CENTRAL, 1, 24), e.rate24PerH as number, 1e-5, 'rate at 24 C');
    close(CENTRAL.eaJ / (8.314462618 * 297.15 ** 2), e.betaPerK as number, 1e-5, 'beta');
  });

  for (const [label, heat] of [
    ['low0.6', 0.6],
    ['central0.85', 0.85],
    ['high1.2', 1.2],
  ] as const) {
    it(`${label}: psi, and the full integration against the coupled-linearised closed form`, () => {
      const ref = e[label] as Record<string, number>;
      close(
        semenovPsi(CENTRAL.eaJ, 24, tau, heat, progressPerHour(CENTRAL, 1, 24)),
        ref.psi as number,
        1e-3,
        'psi',
      );
      const run = simulate(CENTRAL, {
        freshPct: 1,
        startC: 24,
        segments: [{ hours: 2, ambientC: 24, lag: { tauH: fixed(tau), heatingK: fixed(heat) } }],
      });
      if (run.kind !== 'progress') throw new Error('no progress');
      const x = (run.ends[0]?.doughC as number) - 24;
      // The contract's reference is the linearised coupling; the simulation integrates the full
      // equation, which differs from it by second order only.
      close(x, ref.x_t_cpl as number, tolerance.temperatureC, 'x(2 h)');
      expect(x).toBeGreaterThan(ref.x_t_unc as number);
    });
  }

  it('reproduces the Argon F3 closed form of the collation with its own activation energy', () => {
    const argon = file.cases.find((x) => x.name.startsWith('cross-check: Argon'));
    if (!argon) throw new Error('no cross-check');
    const input = argon.input as { S0KPerH: number; tauH: number; EaJPerMol: number };
    const expected = argon.expected as { psi: number; meanAt2hC: number };
    const p: FermentationParameters = { ...CENTRAL, eaJ: input.EaJPerMol };
    const rate24 = progressPerHour(p, 1, 24);
    const heat = input.S0KPerH / rate24;
    close(semenovPsi(p.eaJ, 24, input.tauH, heat, rate24), expected.psi, 1e-3, 'psi');
    const run = simulate(p, {
      freshPct: 1,
      startC: 24,
      segments: [
        { hours: 2, ambientC: 24, lag: { tauH: fixed(input.tauH), heatingK: fixed(heat) } },
      ],
    });
    if (run.kind !== 'progress') throw new Error('no progress');
    close(run.ends[0]?.doughC as number, expected.meanAt2hC, 0.01, 'mean at 2 h');
  });

  it('f: psi above 1/e is not integrated and says why', () => {
    const f = letter('f');
    const fx = f.input as {
      massG: number;
      thermal: FixtureThermal;
      ambientC: number;
      freshDosePct: number;
    };
    const lag = thermalBand(fx.massG / 1000, inputsOf(fx.thermal)).central;
    const ex = f.expected as { psi: number; limit: number; reason: string };
    const psi = semenovPsi(
      CENTRAL.eaJ,
      fx.ambientC,
      lag.tauEffH,
      SELF_HEATING_K.central,
      progressPerHour(CENTRAL, fx.freshDosePct, fx.ambientC),
    );
    close(psi, ex.psi, (f.tolerance as { psi: number }).psi, 'psi');
    expect(psi).toBeGreaterThan(ex.limit);
    const run = simulate(CENTRAL, {
      freshPct: fx.freshDosePct,
      startC: fx.ambientC,
      segments: [
        {
          hours: 2,
          ambientC: fx.ambientC,
          lag: { tauH: fixed(lag.tauEffH), heatingK: SELF_HEATING_K },
        },
      ],
    });
    expect(run).toEqual({ kind: 'unbounded', reason: 'self_heating_unbounded' });
    // The contrast case of the fixture is in domain.
    expect(
      simulate(CENTRAL, {
        freshPct: 1,
        startC: 24,
        segments: [{ hours: 2, ambientC: 24, lag: { tauH: fixed(tau), heatingK: SELF_HEATING_K } }],
      }).kind,
    ).toBe('progress');
  });

  it('never integrates a runaway: the 35 C gate stops a dough that heats past it', () => {
    // psi stays below 1/e (about 0.2) but the equilibrium (about 35.4 C) is above the gate.
    const run = simulate(CENTRAL, {
      freshPct: 0.3,
      startC: 33.5,
      segments: [{ hours: 60, ambientC: 33.5, lag: { tauH: fixed(3), heatingK: SELF_HEATING_K } }],
    });
    expect(run).toEqual({ kind: 'unbounded', reason: 'temperature_outside_domain' });
  });
});

describe('thermal fixtures: calibration estimators (case d)', () => {
  const d = letter('d');
  const input = d.input as {
    tauModelH: number;
    readings_argon: { tH: number; C: number }[];
    readings_exact: { tH: number; C: number }[];
    ambientC: number;
  };
  const e = d.expected as {
    guggenheimArgon: { tauH: number; tInfC: number; factor: number };
    twoPointArgonKnownAmbient4C: { tauH: number; factor: number };
    guggenheimExact: { tauH: number; tInfC: number; factor: number };
  };
  const tol = d.tolerance as { tauH: number; temperatureC: number };
  const [a1, a2, a3] = input.readings_argon.map((r) => ({ tH: r.tH, c: r.C }));
  const [x1, x2, x3] = input.readings_exact.map((r) => ({ tH: r.tH, c: r.C }));

  it('the model tau of the case', () => {
    const t = (d.input as { key: unknown; tauModelH: number }).tauModelH;
    const band = thermalBand(0.5, {
      geometry: 'bulk',
      material: 'glass',
      cover: 'lid',
      liner: false,
      environment: 'fridgeStatic',
      porosity: 'unproofed',
      pieces: 1,
    });
    close(band.central.tauEffH, t, 1e-4, 'tau eff of 500 g');
  });

  it('two points: the first and the last reading, ambient known', () => {
    const r = twoPointTauH(a1 as never, a3 as never, input.ambientC);
    if (!r.ok) throw new Error('refused');
    close(r.value, e.twoPointArgonKnownAmbient4C.tauH, tol.tauH, 'tau');
    close(r.value / input.tauModelH, e.twoPointArgonKnownAmbient4C.factor, 2e-3, 'factor');
  });

  it('Guggenheim: tau and the temperature the readings tend to', () => {
    const r = guggenheim(
      (a1 as { c: number }).c,
      (a2 as { c: number }).c,
      (a3 as { c: number }).c,
      1.5,
    );
    if (!r.ok) throw new Error('refused');
    close(r.value.tauH, e.guggenheimArgon.tauH, tol.tauH, 'tau');
    close(r.value.infinityC, e.guggenheimArgon.tInfC, tol.temperatureC, 'T inf');
    close(r.value.tauH / input.tauModelH, e.guggenheimArgon.factor, 2e-3, 'factor');
    const exact = guggenheim(
      (x1 as { c: number }).c,
      (x2 as { c: number }).c,
      (x3 as { c: number }).c,
      1.5,
    );
    if (!exact.ok) throw new Error('refused');
    close(exact.value.tauH, e.guggenheimExact.tauH, tol.tauH, 'exact tau');
    close(exact.value.infinityC, e.guggenheimExact.tInfC, tol.temperatureC, 'exact T inf');
  });

  it('rejects readings that are not a decay', () => {
    const flat = guggenheim(10, 10, 10, 1.5);
    expect(flat.ok).toBe(false);
    expect(!flat.ok && flat.error.code).toBe('readings_invalid');
    const growing = guggenheim(8, 12, 20, 1.5);
    expect(!growing.ok && growing.error.code).toBe('readings_invalid');
    const wrongSide = twoPointTauH({ tH: 1, c: 10 }, { tH: 2, c: 2 }, 4);
    expect(!wrongSide.ok && wrongSide.error.code).toBe('readings_invalid');
    const backwards = twoPointTauH({ tH: 2, c: 20 }, { tH: 1, c: 10 }, 4);
    expect(!backwards.ok && backwards.error.code).toBe('readings_invalid');
  });
});

describe('thermal fixtures: default lag (case e)', () => {
  it('a step without thermal inputs keeps tau 1.5 h within 0 to 3 h', () => {
    const e = letter('e');
    const ex = e.expected as {
      meanAt1hC: number;
      bandAt1hC: number[];
      tauCentralH: number;
      tauBandH: number[];
    };
    const at = (p: FermentationParameters['path']) => {
      const run = simulate(path(p), {
        freshPct: 1,
        startC: 24,
        segments: [{ hours: 1, ambientC: 4 }],
      });
      if (run.kind !== 'progress') throw new Error('no progress');
      return run.ends[0]?.doughC as number;
    };
    const tol = (e.tolerance as { temperatureC: number }).temperatureC;
    close(at('central'), ex.meanAt1hC, tol, 'central');
    // Cooling: the upper path keeps the dough warmest (tau 3 h), the lower follows at once (tau 0).
    close(at('upper'), ex.bandAt1hC[1] as number, tol, 'upper');
    close(at('lower'), ex.bandAt1hC[0] as number, tol, 'lower');
  });
});

describe('thermal fixtures: the envelope (cases g and h)', () => {
  const g = letter('g');
  const gx = g.expected as {
    progressCentral: number;
    progressBand: [number, number];
    sharedCornersBandWrong: [number, number];
  };
  const gTol = (g.tolerance as { progress: number }).progress;
  const segmentsG: Segment[] = [
    { hours: 2, ambientC: 4 },
    { hours: 2, ambientC: 24 },
  ];

  it('g: the default band is the per-instant envelope of a path that cools and warms', () => {
    close(progress('central', 24, segmentsG), gx.progressCentral, gTol, 'central');
    close(progress('lower', 24, segmentsG), gx.progressBand[0], gTol, 'lower path');
    close(progress('upper', 24, segmentsG), gx.progressBand[1], gTol, 'upper path');
    // The central value is inside its own band (it was not, with the shared corners of 0.20.0).
    expect(gx.progressCentral).toBeGreaterThan(gx.progressBand[0]);
    expect(gx.progressCentral).toBeLessThan(gx.progressBand[1]);
  });

  it('g: the shared corners of 0.20.0 are reproduced only by a shared lag, and are never returned', () => {
    // Harness check: a lag held at the same value on every step gives the fixture's wrong band.
    const shared = [0, 3].map((tau) =>
      progress(
        'central',
        24,
        segmentsG.map((s) => ({ ...s, lag: lagOf(fixed(tau)) })),
      ),
    );
    close(Math.min(...shared), gx.sharedCornersBandWrong[0], gTol, 'shared low');
    close(Math.max(...shared), gx.sharedCornersBandWrong[1], gTol, 'shared high');
    // The envelope the engine returns never equals it: it is strictly wider on both sides.
    const lower = progress('lower', 24, segmentsG);
    const upper = progress('upper', 24, segmentsG);
    expect(lower).toBeLessThan(gx.sharedCornersBandWrong[0] - 10 * gTol);
    expect(upper).toBeGreaterThan(gx.sharedCornersBandWrong[1] + 10 * gTol);
  });

  const h = letter('h');
  const hx = h.expected as {
    tauEffBandH: [number, number][];
    progressCentral: number;
    progressBand: [number, number];
    sharedCornersBandWrong: [number, number];
  };
  const hTol = h.tolerance as { progress: number; tauEffH: number };
  const steps = (
    h.input as {
      steps: { hours: number; ambientC: number; massG: number; thermal: FixtureThermal }[];
    }
  ).steps;
  const bands = steps.map((s) => thermalBand(kg(s.massG, s.thermal), inputsOf(s.thermal)).tauH);
  const segmentsH: Segment[] = steps.map((s, i) => ({
    hours: s.hours,
    ambientC: s.ambientC,
    lag: lagOf(bands[i] as Band3),
  }));

  it('h: the thermal band of each step (container change, divided dough, room return)', () => {
    for (const [i, expected] of hx.tauEffBandH.entries()) {
      close(bands[i]?.low as number, expected[0], hTol.tauEffH, `step ${i + 1} low`);
      close(bands[i]?.high as number, expected[1], hTol.tauEffH, `step ${i + 1} high`);
    }
  });

  it('h: the envelope takes each step at the end that keeps the dough warmest or coldest', () => {
    close(progress('central', 25, segmentsH), hx.progressCentral, hTol.progress, 'central');
    close(progress('lower', 25, segmentsH), hx.progressBand[0], hTol.progress, 'lower path');
    close(progress('upper', 25, segmentsH), hx.progressBand[1], hTol.progress, 'upper path');
    // Using the low or the high end of every band at once would be narrower: never returned.
    const allLow = progress(
      'central',
      25,
      segmentsH.map((s, i) => ({ ...s, lag: lagOf(fixed(bands[i]?.low as number)) })),
    );
    const allHigh = progress(
      'central',
      25,
      segmentsH.map((s, i) => ({ ...s, lag: lagOf(fixed(bands[i]?.high as number)) })),
    );
    close(Math.min(allLow, allHigh), hx.sharedCornersBandWrong[0], hTol.progress, 'shared low');
    close(Math.max(allLow, allHigh), hx.sharedCornersBandWrong[1], hTol.progress, 'shared high');
    expect(progress('lower', 25, segmentsH)).toBeLessThan(hx.sharedCornersBandWrong[0] - 0.01);
    expect(progress('upper', 25, segmentsH)).toBeGreaterThan(hx.sharedCornersBandWrong[1] + 0.01);
  });

  it('the paths bound every lag chosen freely step by step (comparison principle)', () => {
    const lower = progress('lower', 25, segmentsH);
    const upper = progress('upper', 25, segmentsH);
    // Every combination of the ends of the three bands, one lag per step.
    for (const a of ['low', 'high'] as const)
      for (const b of ['low', 'high'] as const)
        for (const c of ['low', 'high'] as const) {
          const value = progress(
            'central',
            25,
            segmentsH.map((s, i) => ({
              ...s,
              lag: lagOf(fixed((bands[i] as Band3)[[a, b, c][i] as 'low' | 'high'])),
            })),
          );
          expect(value).toBeGreaterThanOrEqual(lower - 1e-9);
          expect(value).toBeLessThanOrEqual(upper + 1e-9);
        }
  });
});

describe('thermal fixtures: the personal factor (case i)', () => {
  const i = letter('i');
  const ix = i.expected as Record<
    string,
    { sets?: number[]; factor: number; tauBandH: [number, number]; inconsistent: boolean }
  > & { tauEffH: number };
  const tolerance = (i.tolerance as { tauEffH: number }).tauEffH;
  const thermal = (i.input as { thermal: FixtureThermal }).thermal;
  const band = thermalBand(0.5, inputsOf(thermal));
  const key = { material: 'glass', cover: 'lid', environment: 'fridgeStatic' } as const;
  const profileOf = (factors: number[]): ThermalProfile => ({
    id: 'personal',
    version: 1,
    updatedAt: '2026-10-25T08:00:00.000Z' as never,
    factors:
      factors.length === 0
        ? []
        : [
            {
              ...key,
              sets: factors.map((factor, n) => ({
                factor,
                massG: 500,
                geometry: 'bulk',
                readings: 3,
                basis: { bakeId: `bake-${n}`, stepId: 'retard', eventIds: ['a', 'b', 'c'] },
              })),
            },
          ],
  });

  it('the model tau', () => {
    close(band.central.tauEffH, ix.tauEffH, tolerance, 'tau eff');
  });

  for (const label of ['none', 'one', 'two', 'inconsistent'] as const) {
    it(`${label} set${label === 'none' ? 's' : ''}: factor and band`, () => {
      const expected = ix[label];
      const sets = expected?.sets ?? [];
      const correction = personalCorrection(
        sets.length === 0 ? undefined : profileOf(sets),
        key,
        band.central.tauEffH,
        band.tauH,
      );
      close(correction.factor, expected?.factor as number, 1e-4, 'factor');
      close(correction.tauH.low, expected?.tauBandH[0] as number, tolerance, 'band low');
      close(correction.tauH.high, expected?.tauBandH[1] as number, tolerance, 'band high');
      // The central lag is the calibrated one and lies inside its band.
      close(correction.tauH.central, correction.factor * band.central.tauEffH, 1e-9, 'central');
      expect(correction.tauH.central).toBeGreaterThanOrEqual(correction.tauH.low);
      expect(correction.tauH.central).toBeLessThanOrEqual(correction.tauH.high);
      const text = correction.assumptions.join(' ');
      expect(text.includes('thermal_factor_inconsistent')).toBe(expected?.inconsistent);
      expect(text.includes('thermal_band_calibrated')).toBe(label === 'two');
      expect(correction.assumptions.length === 0).toBe(label === 'none');
    });
  }

  it('an unmatched key is silent: factor 1, the thermal band, no assumption', () => {
    const other = personalCorrection(
      profileOf([1.2]),
      { material: 'plastic', cover: 'lid', environment: 'fridgeStatic' },
      band.central.tauEffH,
      band.tauH,
    );
    expect(other).toEqual({
      factor: 1,
      tauH: { low: band.tauH.low, central: band.central.tauEffH, high: band.tauH.high },
      assumptions: [],
    });
  });
});

describe('the band corners of the envelope', () => {
  it('keeps 64 combinations per dose: 16 kinetic, 2 paths, 2 ends of the readiness band', () => {
    expect(CORNERS.length).toBe(32);
    // No corner carries a lag of its own: the lag is read from the step at every instant.
    expect(CORNERS.every((p) => !('tauH' in p))).toBe(true);
    expect(CORNERS.filter((p) => p.path === 'upper').length).toBe(16);
    expect(CORNERS.filter((p) => p.path === 'lower').length).toBe(16);
    expect(
      new Set(CORNERS.map((p) => `${p.aH}/${p.k}/${p.eaJ}/${p.freshPerGram.instant}`)).size,
    ).toBe(16);
  });
});
