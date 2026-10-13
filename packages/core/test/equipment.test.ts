import { describe, expect, it } from 'vitest';
import { decodeProcess } from '../src/application/documents.js';
import { decodeEquipmentEntry, saveEquipmentEntry } from '../src/application/index.js';
import {
  BUILT_IN_EQUIPMENT,
  CONTRACT_VERSION,
  OVEN_MODES,
  OVEN_MODE_HEAT,
  builtInEquipment,
  customizeEquipment,
  equipmentCopiesProblem,
  equipmentUses,
  isCookingStep,
  newEquipmentEntry,
  nextEquipmentVersion,
  processEquipmentRefs,
  validateEquipmentEntry,
  validateProcess,
  type EquipmentEntry,
  type Instant,
  type Process,
  type ProcessStep,
  type StepEquipment,
} from '../src/domain/index.js';

const at = '2026-10-12T08:00:00.000Z' as Instant;

const stepOf = (equipment: StepEquipment | undefined, operation = 'bake'): ProcessStep => ({
  id: 'bake',
  operation,
  dependsOn: [],
  schedule: 'asap',
  plannedDurationS: 2400,
  ...(equipment === undefined ? {} : { equipment }),
});

/** The reason a process with these settings is invalid, as { path, reason }. */
const problemOf = (equipment: StepEquipment) => {
  const result = validateProcess({ steps: [stepOf(equipment)] });
  if (result.ok) return undefined;
  expect(result.error.code).toBe('InvalidProcess');
  return result.error.details as { path: string; reason: string };
};

describe('contract version', () => {
  it('is 0.14.0 with equipment', () => {
    expect(CONTRACT_VERSION).toBe('0.14.0');
  });
});

describe('step equipment (equipment.md)', () => {
  it('accepts every field absent, which stays unknown', () => {
    expect(validateProcess({ steps: [stepOf({})] }).ok).toBe(true);
    expect(validateProcess({ steps: [stepOf(undefined)] }).ok).toBe(true);
  });

  it('accepts a complete oven stage in a covered vessel', () => {
    const full: StepEquipment = {
      appliance: 'oven',
      profile: { id: 'my-oven', version: 1 },
      mode: 'steam',
      nativeMode: 'Steam Bake',
      setpointC: 250,
      fan: 'unknown',
      steam: { source: 'manual', detail: 'ice cubes in a tray' },
      support: { item: { id: 'baking-stone', version: 1 } },
      vessel: { item: { id: 'dutch-oven-cast-iron', version: 1 }, cover: 'covered' },
      preheated: { appliance: 'hot', support: 'hot', vessel: 'cold' },
      rack: '2/5',
      load: { pieces: 2, massG: 900 },
    };
    expect(validateProcess({ steps: [stepOf(full)] }).ok).toBe(true);
  });

  it('accepts a broil set by level only, with no setpoint invented', () => {
    const broil: StepEquipment = { appliance: 'oven', mode: 'broil', level: { value: 3, of: 5 } };
    expect(validateProcess({ steps: [stepOf(broil)] }).ok).toBe(true);
    expect(broil.setpointC).toBeUndefined();
  });

  it('gives each mode its canonical heat sources (equipment.md)', () => {
    expect(OVEN_MODES).toEqual([
      'bottom',
      'topBottom',
      'convection',
      'trueConvection',
      'convectionRoast',
      'broil',
      'convectionBroil',
      'steam',
      'proof',
      'custom',
    ]);
    expect(OVEN_MODE_HEAT).toEqual({
      bottom: ['bottom'],
      topBottom: ['top', 'bottom'],
      convection: ['bottom', 'fan'],
      trueConvection: ['rear', 'fan'],
      convectionRoast: ['top', 'bottom', 'fan'],
      broil: ['top'],
      convectionBroil: ['top', 'fan'],
      steam: [],
      proof: [],
    });
    expect(Object.keys(OVEN_MODE_HEAT)).toEqual(OVEN_MODES.filter((m) => m !== 'custom'));
  });

  it('accepts stated heat sources with the mode custom only', () => {
    const oven = { appliance: 'oven', setpointC: 200 } as const;
    expect(problemOf({ ...oven, mode: 'custom', heat: ['rear', 'fan'] })).toBeUndefined();
    expect(problemOf({ ...oven, mode: 'custom', heat: [] })).toBeUndefined();
    for (const mode of OVEN_MODES.filter((m) => m !== 'custom')) {
      expect(problemOf({ ...oven, mode, heat: ['top'] })).toEqual({
        path: 'steps[0].equipment.heat',
        reason: 'is only valid with the mode custom',
      });
    }
    expect(problemOf({ ...oven, heat: ['top'] })?.path).toBe('steps[0].equipment.heat');
    expect(problemOf({ ...oven, mode: 'custom', heat: ['side' as never] })?.path).toBe(
      'steps[0].equipment.heat[0]',
    );
    expect(problemOf({ ...oven, mode: 'custom', heat: ['top', 'fan', 'top'] })).toEqual({
      path: 'steps[0].equipment.heat[2]',
      reason: 'is a duplicate',
    });
  });

  it('refuses the codes of 0.12.0, never released', () => {
    for (const mode of ['still', 'fan', 'fanBroil', 'steamHeat']) {
      expect(problemOf({ appliance: 'oven', mode: mode as never })).toEqual({
        path: 'steps[0].equipment.mode',
        reason: 'is not a known mode',
      });
    }
  });

  it('refuses a mode without the appliance oven', () => {
    expect(problemOf({ mode: 'convection' })).toEqual({
      path: 'steps[0].equipment.mode',
      reason: 'needs the appliance oven',
    });
    expect(problemOf({ appliance: 'stovetop', mode: 'bottom' })?.path).toBe(
      'steps[0].equipment.mode',
    );
    expect(problemOf({ appliance: 'oven', mode: 'turbo' as never })?.reason).toBe(
      'is not a known mode',
    );
  });

  it('refuses a setpoint that is not a finite number', () => {
    expect(problemOf({ setpointC: Number.POSITIVE_INFINITY })?.path).toBe(
      'steps[0].equipment.setpointC',
    );
    expect(problemOf({ setpointC: Number.NaN })?.path).toBe('steps[0].equipment.setpointC');
    expect(validateProcess({ steps: [stepOf({ setpointC: -18 })] }).ok).toBe(true);
  });

  it('checks the ranges of a level', () => {
    expect(problemOf({ level: { value: -1 } })?.path).toBe('steps[0].equipment.level.value');
    expect(problemOf({ level: { value: 3, of: 0 } })?.path).toBe('steps[0].equipment.level.of');
    expect(problemOf({ level: { value: 6, of: 5 } })?.path).toBe('steps[0].equipment.level.value');
    expect(validateProcess({ steps: [stepOf({ level: { value: 0 } })] }).ok).toBe(true);
    expect(validateProcess({ steps: [stepOf({ level: { value: 5, of: 5 } })] }).ok).toBe(true);
  });

  it('checks the ranges of a load', () => {
    expect(problemOf({ load: { pieces: 0 } })?.path).toBe('steps[0].equipment.load.pieces');
    expect(problemOf({ load: { pieces: 1.5 } })?.path).toBe('steps[0].equipment.load.pieces');
    expect(problemOf({ load: { massG: 0 } })?.path).toBe('steps[0].equipment.load.massG');
    expect(problemOf({ load: { massG: -10 } })?.path).toBe('steps[0].equipment.load.massG');
    expect(validateProcess({ steps: [stepOf({ load: { pieces: 1, massG: 0.5 } })] }).ok).toBe(true);
  });

  it('needs a vessel for a cover: a bare cover is not a field', () => {
    expect(problemOf({ cover: 'covered' } as never)).toEqual({
      path: 'steps[0].equipment.cover',
      reason: 'is not a known field',
    });
    expect(
      problemOf({ vessel: { item: { id: 'pot', version: 1 }, cover: 'lidded' as never } })?.path,
    ).toBe('steps[0].equipment.vessel.cover');
  });

  it('refuses unknown enumerations, references and fields', () => {
    expect(problemOf({ appliance: 'microwave' as never })?.path).toBe(
      'steps[0].equipment.appliance',
    );
    expect(problemOf({ fan: 'maybe' as never })?.path).toBe('steps[0].equipment.fan');
    expect(problemOf({ steam: { source: 'jet' as never } })?.path).toBe(
      'steps[0].equipment.steam.source',
    );
    expect(problemOf({ preheated: { vessel: 'warm' as never } })?.path).toBe(
      'steps[0].equipment.preheated.vessel',
    );
    expect(problemOf({ support: { item: { id: 'baking-stone', version: 0 } } })?.path).toBe(
      'steps[0].equipment.support.item.version',
    );
    expect(problemOf({ profile: { id: '__proto__', version: 1 } })?.path).toBe(
      'steps[0].equipment.profile.id',
    );
    expect(problemOf({ rack: ' ' })?.path).toBe('steps[0].equipment.rack');
    expect(problemOf({ colour: 'red' } as never)?.path).toBe('steps[0].equipment.colour');
  });

  it('may sit on any step, and the operation alone says what is cooked', () => {
    const proof = stepOf({ appliance: 'oven', mode: 'proof', setpointC: 35 }, 'proof');
    const bake = { ...stepOf({ appliance: 'oven', mode: 'bottom', setpointC: 250 }), id: 'b' };
    expect(validateProcess({ steps: [proof, { ...bake, dependsOn: ['bake'] }] }).ok).toBe(true);
    expect(isCookingStep(proof)).toBe(false);
    expect(isCookingStep(bake)).toBe(true);
  });

  it('lists the references with the kind each must resolve to', () => {
    const settings: StepEquipment = {
      profile: { id: 'oven', version: 2 },
      support: { item: { id: 'baking-stone', version: 1 } },
      vessel: { item: { id: 'pot', version: 1 }, cover: 'open' },
    };
    expect(equipmentUses(settings).map((u) => [u.ref.id, u.kind])).toEqual([
      ['baking-stone', 'support'],
      ['pot', 'vessel'],
      ['oven', 'appliance'],
    ]);
    const process: Process = { steps: [stepOf(settings), { ...stepOf(settings), id: 'again' }] };
    expect(processEquipmentRefs(process).map((r) => `${r.id}@${r.version}`)).toEqual([
      'baking-stone@1',
      'pot@1',
      'oven@2',
    ]);
  });

  it('checks that references resolve to an entry of the matching kind', () => {
    const uses = equipmentUses({
      vessel: { item: { id: 'baking-stone', version: 1 }, cover: 'open' },
    });
    const stone = builtInEquipment('baking-stone') as EquipmentEntry;
    expect(equipmentCopiesProblem(uses, [], [])?.reason).toContain('does not resolve');
    expect(equipmentCopiesProblem(uses, [], [stone])?.reason).toBe(
      'baking-stone is a support, not a vessel',
    );
    const pot = builtInEquipment('pot') as EquipmentEntry;
    expect(
      equipmentCopiesProblem(equipmentUses({ vessel: { item: pot, cover: 'open' } }), [], [pot]),
    ).toBeUndefined();
    expect(
      equipmentCopiesProblem(
        equipmentUses({ vessel: { item: pot, cover: 'open' } }),
        [],
        [pot, stone],
      )?.reason,
    ).toContain('not referenced');
  });

  it('is decoded structurally from a document', () => {
    const doc = { steps: [stepOf({ appliance: 'oven', mode: 'convection', setpointC: 220 })] };
    expect(() => decodeProcess(doc, 'process')).not.toThrow();
    expect(() =>
      decodeProcess({ steps: [stepOf({ appliance: 'oven', extra: 1 } as never)] }, 'process'),
    ).toThrow(/unknown field extra/);
    for (const mode of ['still', 'fan', 'fanBroil', 'steamHeat']) {
      expect(() =>
        decodeProcess({ steps: [stepOf({ appliance: 'oven', mode } as never)] }, 'process'),
      ).toThrow(/mode must be one of/);
    }
    expect(() =>
      decodeProcess(
        { steps: [stepOf({ appliance: 'oven', mode: 'custom', heat: ['rear', 'fan'] })] },
        'process',
      ),
    ).not.toThrow();
    expect(() =>
      decodeProcess(
        { steps: [stepOf({ appliance: 'oven', mode: 'custom', heat: ['side'] } as never)] },
        'process',
      ),
    ).toThrow(/heat/);
    expect(() =>
      decodeProcess({ steps: [stepOf({ setpointC: '250' } as never)] }, 'process'),
    ).toThrow(/not a number/);
    expect(() =>
      decodeProcess(
        { steps: [stepOf({ vessel: { item: { id: 'pot', version: 1 } } } as never)] },
        'p',
      ),
    ).toThrow(/no cover/);
  });
});

describe('built-in equipment (equipment.md)', () => {
  it('has the fourteen generic entries of the contract, version 1, no appliance', () => {
    expect(
      BUILT_IN_EQUIPMENT.map((e) => [e.id, e.kind, e.shape, e.material, e.lid?.material]),
    ).toEqual([
      ['baking-stone', 'support', 'stone', 'cordierite', undefined],
      ['baking-steel', 'support', 'steel', 'carbonSteel', undefined],
      ['aluminium-sheet', 'support', 'sheet', 'aluminium', undefined],
      ['oven-rack', 'support', 'rack', 'stainlessSteel', undefined],
      ['dutch-oven-cast-iron', 'vessel', 'dutchOven', 'castIron', 'castIron'],
      ['pullman-steel', 'vessel', 'pullman', 'aluminizedSteel', 'aluminizedSteel'],
      ['pullman-aluminium', 'vessel', 'pullman', 'aluminium', 'aluminium'],
      ['loaf-pan-steel', 'vessel', 'loafPan', 'carbonSteel', undefined],
      ['loaf-pan-silicone', 'vessel', 'loafPan', 'silicone', undefined],
      ['loaf-pan-ceramic', 'vessel', 'loafPan', 'ceramic', undefined],
      ['loaf-pan-glass', 'vessel', 'loafPan', 'glass', undefined],
      ['cast-iron-skillet', 'vessel', 'skillet', 'castIron', undefined],
      ['baguette-tray', 'support', 'baguetteTray', 'aluminium', undefined],
      ['pot', 'vessel', 'pot', 'stainlessSteel', 'stainlessSteel'],
    ]);
    for (const entry of BUILT_IN_EQUIPMENT) {
      expect(entry).toMatchObject({ version: 1, builtIn: true, archived: false });
      expect(entry.name).toBeUndefined();
      expect(validateEquipmentEntry(entry).ok).toBe(true);
    }
  });

  it('leaves every property but shape and material unknown', () => {
    const skillet = builtInEquipment('cast-iron-skillet') as EquipmentEntry;
    expect(skillet.volumeMl).toEqual({ status: 'unknown' });
    expect(skillet.thicknessMm).toEqual({ status: 'unknown' });
    expect(skillet.coating).toBe('unknown');
    expect(skillet.interior).toBeUndefined();
    expect(skillet.lid).toBeUndefined();
  });

  it('resolves by id and version only', () => {
    expect(builtInEquipment('pot')?.version).toBe(1);
    expect(builtInEquipment('pot', 1)).toBeDefined();
    expect(builtInEquipment('pot', 2)).toBeUndefined();
    expect(builtInEquipment('my-pot')).toBeUndefined();
  });
});

describe('equipment entries (equipment.md)', () => {
  const skillet = (changes: Partial<EquipmentEntry> = {}): EquipmentEntry => ({
    ...newEquipmentEntry({ id: 'my-skillet', kind: 'vessel', name: 'My skillet', createdAt: at }),
    shape: 'skillet',
    material: 'carbonSteel',
    coating: 'silicone',
    ...changes,
  });
  const invalidField = (entry: EquipmentEntry) => {
    const result = validateEquipmentEntry(entry);
    return result.ok ? undefined : result.error.details?.field;
  };

  it('starts with every property unknown and validates', () => {
    const entry = newEquipmentEntry({ id: 'x', kind: 'support', name: 'X', createdAt: at });
    expect(entry).toEqual({
      id: 'x',
      version: 1,
      kind: 'support',
      name: 'X',
      builtIn: false,
      archived: false,
      createdAt: at,
    });
    expect(validateEquipmentEntry(entry).ok).toBe(true);
  });

  it('keeps a silicone coating on steel distinct from a silicone pan', () => {
    const entry = skillet();
    expect(entry).toMatchObject({ material: 'carbonSteel', coating: 'silicone' });
    expect(validateEquipmentEntry(entry).ok).toBe(true);
  });

  it('checks identity, enumerations, dimensions and sizes', () => {
    expect(invalidField((({ name: _name, ...rest }) => rest)(skillet()) as EquipmentEntry)).toBe(
      'name',
    );
    expect(invalidField(skillet({ id: 'pot' }))).toBe('id');
    expect(invalidField(skillet({ version: 0 }))).toBe('version');
    expect(invalidField(skillet({ kind: 'gadget' as never }))).toBe('kind');
    expect(invalidField(skillet({ shape: 'bowl' as never }))).toBe('shape');
    expect(invalidField(skillet({ material: 'wood' as never }))).toBe('material');
    expect(invalidField(skillet({ coating: 'wax' as never }))).toBe('coating');
    expect(invalidField(skillet({ lid: { material: 'wood' as never } }))).toBe('lid');
    expect(invalidField(skillet({ interior: { diameterMm: 0 } }))).toBe('interior.diameterMm');
    expect(invalidField(skillet({ interior: { depthMm: 3 } as never }))).toBe('interior.depthMm');
    expect(
      invalidField(
        skillet({ volumeMl: { status: 'known', value: -1, source: { kind: 'personal' } } }),
      ),
    ).toBe('volumeMl');
    expect(
      invalidField(
        skillet({
          volumeMl: { status: 'known', value: 500, unit: 's', source: { kind: 'personal' } },
        }),
      ),
    ).toBe('volumeMl');
    expect(invalidField(skillet({ thicknessMm: { status: 'known', value: 3 } as never }))).toBe(
      'thicknessMm',
    );
    expect(
      validateEquipmentEntry(
        skillet({
          interior: { diameterMm: 260, heightMm: 50 },
          volumeMl: {
            status: 'estimated',
            value: 2200,
            uncertainty: 100,
            source: { kind: 'personal', detail: 'computed' },
          },
          thicknessMm: { status: 'unknown' },
        }),
      ).ok,
    ).toBe(true);
  });

  it('checks the native modes of an appliance profile', () => {
    const oven = (modes: EquipmentEntry['modes']): EquipmentEntry => ({
      ...newEquipmentEntry({ id: 'oven-1', kind: 'appliance', name: 'Oven', createdAt: at }),
      appliance: 'oven',
      ...(modes === undefined ? {} : { modes }),
    });
    const manual = { kind: 'reference', detail: 'manual p. 14' } as const;
    expect(
      validateEquipmentEntry(
        oven([
          {
            native: 'Convection Bake',
            flourprint: 'convection',
            mapping: 'documented',
            source: manual,
            heaters: ['top', 'bottom', 'rear'],
            fan: 'on',
            steam: false,
            control: 'setpoint',
          },
          { native: 'Steam Bake', flourprint: 'steam', mapping: 'approximate' },
          { native: 'Pizza', mapping: 'unknown' },
        ]),
      ).ok,
    ).toBe(true);
    const bad = (mode: NonNullable<EquipmentEntry['modes']>[number]) => invalidField(oven([mode]));
    expect(bad({ native: ' ', mapping: 'unknown' })).toBe('modes[0].native');
    expect(bad({ native: 'A', mapping: 'documented', flourprint: 'convection' })).toBe(
      'modes[0].source',
    );
    expect(bad({ native: 'A', mapping: 'documented', source: manual })).toBe('modes[0].flourprint');
    expect(bad({ native: 'A', mapping: 'approximate' })).toBe('modes[0].flourprint');
    expect(bad({ native: 'A', mapping: 'unknown', flourprint: 'convection' })).toBe(
      'modes[0].flourprint',
    );
    expect(bad({ native: 'A', mapping: 'guessed' as never })).toBe('modes[0].mapping');
    expect(bad({ native: 'A', mapping: 'unknown', fan: 'high' as never })).toBe('modes[0].fan');
    expect(bad({ native: 'A', mapping: 'unknown', heaters: ['side' as never] })).toBe(
      'modes[0].heaters',
    );
    expect(bad({ native: 'A', mapping: 'unknown', control: 'knob' as never })).toBe(
      'modes[0].control',
    );
  });

  it('writes a new version on an edit and keeps the old one', () => {
    const v1 = skillet();
    const v2 = nextEquipmentVersion(
      v1,
      { notes: 'reseasoned' },
      '2026-10-13T08:00:00.000Z' as Instant,
    );
    expect(v2.ok && v2.value).toMatchObject({ version: 2, notes: 'reseasoned', kind: 'vessel' });
    expect(v1.version).toBe(1);
    expect(v1.notes).toBeUndefined();
    const stone = builtInEquipment('baking-stone') as EquipmentEntry;
    expect(nextEquipmentVersion(stone, { notes: 'x' }, at).ok).toBe(false);
  });

  it('customizes a built-in into a personal entry based on its version', () => {
    const mine = customizeEquipment(builtInEquipment('pullman-steel') as EquipmentEntry, {
      id: 'my-pullman',
      name: 'My Pullman',
      createdAt: at,
    });
    expect(mine).toMatchObject({
      id: 'my-pullman',
      version: 1,
      builtIn: false,
      name: 'My Pullman',
      shape: 'pullman',
      basedOn: { id: 'pullman-steel', version: 1 },
    });
    expect(validateEquipmentEntry(mine).ok).toBe(true);
  });

  it('is decoded from untrusted JSON with the domain checks', () => {
    const entry = skillet({ interior: { diameterMm: 260 } });
    expect(decodeEquipmentEntry(JSON.parse(JSON.stringify(entry)))).toEqual(entry);
    expect(() => decodeEquipmentEntry({ ...entry, extra: 1 })).toThrow(/unknown field extra/);
    expect(() => decodeEquipmentEntry({ ...entry, interior: { widthMm: 'a' } })).toThrow(
      /not valid/,
    );
    expect(() => decodeEquipmentEntry({ ...entry, createdAt: 'yesterday' })).toThrow(/createdAt/);
    expect(() =>
      decodeEquipmentEntry({ ...entry, volumeMl: { status: 'known', value: 1 } }),
    ).toThrow(/source/);
    expect(() => decodeEquipmentEntry({ ...entry, modes: [{ native: 'A', extra: 1 }] })).toThrow(
      /unknown field extra/,
    );
  });

  it('refuses a null or malformed basedOn as a validation problem', () => {
    const entry = skillet({});
    for (const basedOn of [null, 'pot', 3]) {
      const result = validateEquipmentEntry({ ...entry, basedOn } as never);
      expect(result).toMatchObject({
        ok: false,
        error: { code: 'InvalidEquipmentEntry', details: { field: 'basedOn' } },
      });
    }
  });

  it('refuses to store a built-in entry', async () => {
    const registry = {} as never;
    const result = await saveEquipmentEntry(registry, builtInEquipment('pot') as EquipmentEntry);
    expect(result).toMatchObject({ ok: false, error: { code: 'InvalidEquipmentEntry' } });
  });
});
