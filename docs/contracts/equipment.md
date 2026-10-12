# Contract: equipment and cooking settings

Status: **draft for Alpha** (#28, N1 + N2; `capability-levels.md`). Related issues: #5, #21, #26,
#28, #29.

A recipe says how each stage is cooked or held: the appliance, its mode and setting, the support
and vessel, covered or not, what was preheated, steam, rack and load. A Preparation runs and
records it. This contract covers **representation, execution, persistence and resumption**. It
predicts nothing: no duration, temperature or end point is derived from a mode, a material or a
vessel (N3, later, in a thermal module of #29 with its own sources and validation).

Three things stay apart (#28, owner direction of 2026-10-11):

1. **Recipe intent**: a documented Flourprint mode and its settings, portable to any kitchen.
2. **Appliance mapping**, optional: which button of a real oven comes closest, and how sure that
   is.
3. **Actual execution**: what was used during a Preparation, deviations included.

**No profile is ever required.** The built-in modes and items are enough to write, plan and run any
recipe; a saved appliance profile is a convenience that never gates anything.

## Settings of a step

```ts
interface ProcessStep {
  // … (process.md)
  equipment?: StepEquipment;
}

interface StepEquipment {
  appliance?: ApplianceKind;
  profile?: EquipmentRef; // an appliance profile (below), optional
  mode?: OvenMode; // oven only: a Flourprint mode (below)
  nativeMode?: string; // the appliance's own label for this step, as read on it
  setpointC?: number; // temperature setpoint: oven, fryer oil, proofer
  level?: { value: number; of?: number }; // power level where there is no setpoint: broil 3 of 5, burner 7 of 10
  fan?: 'on' | 'off' | 'unknown'; // cooking-air fan, when the mode leaves it open
  steam?: { source: 'function' | 'manual' | 'none'; detail?: string }; // detail: "ice cubes in a tray"
  support?: { item: EquipmentRef }; // stone, steel, sheet, rack…
  vessel?: { item: EquipmentRef; cover: 'open' | 'covered' | 'closed' | 'unknown' };
  preheated?: { appliance?: Preheat; support?: Preheat; vessel?: Preheat };
  rack?: string; // open code: 'bottom', 'middle', 'top', '2/5'
  load?: { pieces?: number; massG?: number }; // what goes in at the start of the step
}

type ApplianceKind = 'oven' | 'stovetop' | 'grill' | 'steamer' | 'fryer' | 'proofer' | 'other';
type Preheat = 'hot' | 'cold' | 'unknown';
interface EquipmentRef {
  id: string;
  version: number;
}
```

- Every field is optional. An absent field is **unknown**, never a default: no temperature is
  invented for a broil set by level, no fan state for a mode that does not say.
- `mode` needs `appliance: 'oven'`. `setpointC` is finite. `level.value` ≥ 0; with `of`, `of` > 0
  and `value` ≤ `of`. `load.pieces` is an integer ≥ 1; `load.massG` > 0. `cover` other than
  `unknown` needs a `vessel`. An item reference must resolve to an entry of the matching kind
  (`support`, `vessel`, appliance `profile`). Anything else is `InvalidProcess`.
- `equipment` may sit on any step: a cooking step (bake-session.md), a `preheat` step (what is
  heated), a fermentation step held in an appliance (`proof` in an oven's Proof mode, a `retard` in
  a fridge), a `cool` step on a rack. **The operation says what happens to the dough; the
  equipment never does.** An oven step is not a cooking stage unless its operation is a cooking
  operation (process.md).
- `cover: 'closed'` is a lid locked shut (a closed Pullman), `covered` a lid or cloche resting on.
  Neither proves a seal or a known humidity.
- The fermentation model reads `conditions.temperatureC` (process.md), never `equipment`: an oven
  Proof setpoint is the dough's ambient only when the recipe also says so in its conditions.

### Stages, phases and time

- **One phase, one step.** Removing the lid, changing the mode, lowering the setpoint or moving the
  pan from the stovetop to the oven starts a new step that depends on the previous one. Two steps
  with the same mode stay two steps; nothing merges them.
- A step's planned duration counts from its own start: the loading for the first cooking stage,
  the phase change for the next ones. An end on an observation (core temperature, colour) is its
  `endCriterion` (process.md).
- A **cold start** is a cooking step whose `preheated.appliance` (or `vessel`) is `cold`: the
  warm-up is part of that step's time, and no preheating is assumed at loading.
- Preheating while the dough proofs is an `alap` `preheat` step beside the proof; the first
  cooking stage depends on both. The scheduler already plans them in parallel, without adding their
  durations (process.md).
- The same vessel or support across stages (a skillet from the stovetop into the oven) is the same
  `EquipmentRef` on both steps.

## Flourprint oven modes

A recipe names one of these modes. Each is documented in the app at the point of choice (message
keys `mode.<code>.name`, `mode.<code>.help`): what it does, which elements and fan it usually
involves and which may vary, how to find the closest setting on a home oven, and how it differs
from its neighbours. Commercial names (Bake, Convection Bake, True or European Convection,
Convection Roast…) appear in that help as examples, never as definitions.

| Code         | Meaning                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `still`      | heat without forced circulation (no cooking-air fan); elements may vary     |
| `fan`        | a fan circulates heat from the oven's other elements                        |
| `convection` | a fan with its own rear or ring element; other elements may also run        |
| `broil`      | direct heat from the top element, set by level or temperature               |
| `fanBroil`   | broil with the fan circulating air                                          |
| `steam`      | the oven's steam function alone                                             |
| `steamHeat`  | a dry-heat mode with the steam function (`fan` says whether air is fanned)  |
| `proof`      | a low-temperature proofing program: a fermentation environment, not cooking |
| `custom`     | a mode with no Flourprint match; `nativeMode` names it                      |

- No conversion between modes is applied or suggested: a recipe in `convection` is never rewritten
  as `still` with another temperature.
- `broil` is the oven's grill (Gril in French) and differs from the `grill` operation (a barbecue
  or open grate, process.md); the interface names them so they cannot be confused.
- The French names (Chaleur sans ventilation, Chaleur brassée, Chaleur pulsée, Gril, Gril ventilé,
  Vapeur, Chaleur avec vapeur, Étuve, Autre) are message texts, changed without a contract change.

## Equipment entries

Supports, vessels and appliance profiles are versioned entries, like flours (flours.md):

```ts
interface EquipmentEntry {
  id: string;
  version: number; // immutable once written
  kind: 'support' | 'vessel' | 'appliance';
  builtIn: boolean;
  name?: string; // a personal entry's name; a built-in one is named by message key
  // support and vessel
  shape?:
    | 'pullman'
    | 'loafPan'
    | 'dutchOven'
    | 'cloche'
    | 'skillet'
    | 'pot'
    | 'roundPan'
    | 'sheet'
    | 'stone'
    | 'steel'
    | 'rack'
    | 'other';
  material?: Material; // the body
  coating?: 'none' | 'nonStick' | 'silicone' | 'enamel' | 'seasoning' | 'other' | 'unknown';
  lid?: { material: Material }; // a vessel that has one
  interior?: { lengthMm?: number; widthMm?: number; heightMm?: number; diameterMm?: number };
  volumeMl?: PropertyValue; // useful volume, measured or computed, with its source
  thicknessMm?: PropertyValue;
  // appliance
  appliance?: ApplianceKind;
  modes?: Array<{
    native: string; // the label on the appliance
    flourprint?: OvenMode; // closest Flourprint mode
    mapping: 'documented' | 'approximate' | 'unknown';
    source?: SourceRef; // the manual, or the baker
    heaters?: Array<'top' | 'bottom' | 'rear' | 'other'>; // known nominal elements
    fan?: 'on' | 'off' | 'cycling' | 'unknown';
    steam?: boolean;
    control?: 'setpoint' | 'level' | 'both';
  }>;
  basedOn?: EquipmentRef;
  notes?: string;
  archived: boolean;
  createdAt: Instant;
}

type Material =
  | 'castIron'
  | 'enamelledCastIron'
  | 'carbonSteel'
  | 'stainlessSteel'
  | 'aluminizedSteel'
  | 'aluminium'
  | 'ceramic'
  | 'stoneware'
  | 'cordierite'
  | 'glass'
  | 'silicone'
  | 'other'
  | 'unknown';
```

- A silicone coating on steel is `material: 'carbonSteel', coating: 'silicone'`, never a silicone
  pan; aluminized steel and solid aluminium stay distinct.
- Dimensions are interior, in millimetres; volume in millilitres (values-and-units.md). Nothing
  derives a dough mass from a volume: scaling to a pan goes through an explicit anchor (#3, #19).
- An appliance profile may be minimal: one native mode and its closest Flourprint mode. A
  `documented` mapping names its source and still claims nothing about equal heat delivery;
  `approximate` is the baker's best match; `unknown` keeps a native mode without a match.
- A step's `profile` lets the Preparation show both names ("Convection · Convection Bake"). A mode
  the profile does not map stays the recipe's requirement until the baker picks an alternative;
  nothing is substituted silently, and a profile without `steam` never gains it.
- Versions, archiving and customizing a built-in follow flours.md: editing writes a new version;
  recipes and Preparations keep the version they reference.

### Built-in entries

Generic items, no brand, every property `unknown` except shape and material:

| id                     | kind    | shape     | material          | lid               |
| ---------------------- | ------- | --------- | ----------------- | ----------------- |
| `baking-stone`         | support | stone     | cordierite        |                   |
| `baking-steel`         | support | steel     | carbonSteel       |                   |
| `aluminium-sheet`      | support | sheet     | aluminium         |                   |
| `oven-rack`            | support | rack      | stainlessSteel    |                   |
| `dutch-oven-cast-iron` | vessel  | dutchOven | enamelledCastIron | enamelledCastIron |
| `pullman-steel`        | vessel  | pullman   | aluminizedSteel   | aluminizedSteel   |
| `pullman-aluminium`    | vessel  | pullman   | aluminium         | aluminium         |
| `loaf-pan-steel`       | vessel  | loafPan   | carbonSteel       |                   |
| `loaf-pan-silicone`    | vessel  | loafPan   | silicone          |                   |
| `loaf-pan-ceramic`     | vessel  | loafPan   | ceramic           |                   |
| `loaf-pan-glass`       | vessel  | loafPan   | glass             |                   |
| `cast-iron-skillet`    | vessel  | skillet   | castIron          |                   |
| `pot`                  | vessel  | pot       | stainlessSteel    | stainlessSteel    |

There is no built-in appliance: the Flourprint modes are the default. The equipment registry
(`equipment` table, below) holds personal entries only, like flours.

## During a Preparation

- `StartBake` snapshots the process with its `equipment`, and `BakeStartedPayload.equipment` copies
  every entry version the process references (history.md), built-in or personal. Snapshots written
  before `0.12.0` have none.
- `AdjustStep` (bake-session.md) also takes `equipment`: the whole `StepEquipment` actually used on
  a step not completed (another setpoint, the lid off sooner, another vessel). It is recorded as
  `OverrideApplied { stepId, field: 'equipment', value }`; the snapshot keeps the plan. An entry
  newly referenced by the override is copied into the event.
- A change in the middle of a running stage that the baker wants dated (the lid removed after
  20 min) is a phase: complete the step and insert the next one (`InsertStepAfter`), whose
  `equipment` says what changed.
- Measured temperatures (an oven thermometer, the crumb's core) are `Observation`s
  (`AddObservation`), never a change of the setpoint.
- Replay, restart, backup and export keep all of it; a later edit of an entry never changes an
  earlier Preparation.

## Persistence

SQLite gains `equipment (id TEXT NOT NULL, version INTEGER NOT NULL, kind TEXT NOT NULL, archived
INTEGER NOT NULL, schema_version INTEGER NOT NULL, document TEXT NOT NULL, created_at TEXT NOT
NULL, PRIMARY KEY (id, version))`, written like `flours`. A full backup carries every personal
entry version (`equipment`, optional so older backups restore); restoring validates them.

## Acceptance examples

Each runs with **no appliance profile** unless it says otherwise, then survives a restart.

1. Loaf in a Dutch oven: preheat oven and pot (`preheat`, `alap`, beside the proof), `bake`
   `still` 250 °C pot `covered`, then `bake` `still` 230 °C pot `open`. Two stages, one vessel ref.
2. Cold start: one `bake` step, `preheated: { appliance: 'cold', vessel: 'cold' }`, no `preheat`
   step; its duration includes the warm-up.
3. Owner's pizza: `panCook` on `stovetop`, `level 7 of 10`, `cast-iron-skillet`; then `bake` `broil`
   `level` only (no setpoint), same skillet ref. Two cooking stages, one result.
4. Bagels: `boil` on `stovetop` in `pot`, then `bake` `fan` 220 °C on `aluminium-sheet`.
5. Oven Proof: `proof` with `appliance: 'oven'`, `mode: 'proof'`, `setpointC` 35, then `bake`.
   The proof is not a cooking stage (bake-session.md).
6. Pullman: `pullman-steel` `closed`, then a second recipe with `pullman-aluminium` `open`; the
   recipe kind does not change, only the vessel and cover.
7. With a profile: an oven mapping "Convection Bake" to `fan` (`documented`, manual as source)
   and "Steam Bake" to `steamHeat`; a second oven mapping its own "Convection" to `convection`. The
   same recipe shows each oven's label; a third oven without steam keeps the recipe's `steamHeat`
   as an unmet requirement, never a silent `fan`.
8. Deviation: during the uncovered stage, `AdjustStep` sets 220 °C instead of 230 °C; replay shows
   the plan (230) and what was used (220).
9. A support edited after a Preparation: the Preparation still shows the version it used.
