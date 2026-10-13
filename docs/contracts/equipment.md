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
  heat?: HeatSource[]; // custom mode only: the heat sources it uses
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
type OvenMode =
  | 'bottom'
  | 'topBottom'
  | 'convection'
  | 'trueConvection'
  | 'convectionRoast'
  | 'broil'
  | 'convectionBroil'
  | 'steam'
  | 'proof'
  | 'custom'; // Flourprint oven modes, below
type HeatSource = 'top' | 'bottom' | 'rear' | 'fan';
type Preheat = 'hot' | 'cold' | 'unknown';
interface EquipmentRef {
  id: string;
  version: number;
}
```

- Every field is optional. An absent field is **unknown**, never a default: no temperature is
  invented for a broil set by level, no fan state for a mode that does not say.
- `mode` needs `appliance: 'oven'`. A `profile` does not need `appliance`; the profile's own
  `appliance` is shown beside it, and nothing compares the two. `setpointC` is finite.
  `level.value` ≥ 0; with `of`, `of` > 0 and `value` ≤ `of`. `load.pieces` is an integer ≥ 1;
  `load.massG` > 0. An item reference must resolve to an entry of the matching kind (`support`,
  `vessel`, appliance `profile`). Validating a process (save, import, the process of `StartBake`)
  refuses anything else with `InvalidProcess`; in a bake command, an equipment value or a reference
  that the command's copies do not resolve is `InvalidCommand`, with the path in `field`.
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
- Preheating while the dough proofs is a `preheat` step with `schedule: 'beforeTarget'`
  (process.md, Steps before a target): its `target` is the cooking step it heats for, it starts
  `requiredWarmupS` before that step (or after its dependencies, by explicit choice), no step waits
  for it, and `equipment` on it says what is heated. Recipes written before it use an `alap`
  `preheat` step beside the proof, a hard prerequisite of the first cooking stage; it keeps its
  meaning.
- The same vessel or support across stages (a skillet from the stovetop into the oven) is the same
  `EquipmentRef` on both steps.

## Flourprint oven modes

Owner decision of 2026-10-13: a mode is defined by the oven's **heat sources**, not by a
manufacturer's name, because names differ between brands and regions (Québec "Convection" is
the bottom element with the fan; the same word elsewhere means a rear element). Each mode has a
canonical set of heat sources; the app draws it as a small oven pictogram beside the name, so the
method reads the same whatever the label (a presentation concern, ADR 0009). Names are message
texts (`mode.<code>.name`, `mode.<code>.help`) and change without a contract change.

| Code              | Heat sources       | French name (Québec usage) |
| ----------------- | ------------------ | -------------------------- |
| `bottom`          | bottom             | Cuisson traditionnelle     |
| `topBottom`       | top, bottom        | Éléments du haut et du bas |
| `convection`      | bottom, fan        | Convection                 |
| `trueConvection`  | rear, fan          | Convection européenne      |
| `convectionRoast` | top, bottom, fan   | Rôtissage par convection   |
| `broil`           | top                | Griller                    |
| `convectionBroil` | top, fan           | Griller par convection     |
| `steam`           | the steam function | Vapeur                     |
| `proof`           | low heat (program) | Levée du pain              |
| `custom`          | as the step states | Autre (with `nativeMode`)  |

- Steam added to a dry mode is the step's `steam` (`source: 'function'` for the oven's steam,
  `manual` for a tray or ice cubes), never a separate mode: a combination steam program is its
  dry mode plus `steam`.
- `custom` may state its heat sources (`heat?: HeatSource[]` on `StepEquipment`); for every other
  mode `heat` is absent and the table above applies.
- An appliance profile maps each of the baker's oven labels to a mode, or to its own heat sources
  (`heaters`, `fan`), set from the same pictogram: the baker shows which elements and fan the
  label turns on (Settings, later UI).
- No conversion between modes is applied or suggested: a recipe in `convection` is never rewritten
  as `bottom` with another temperature.
- `broil` (Griller) is the oven's top element and differs from the `grill` operation (a barbecue
  or open grate, process.md); the interface names them so they cannot be confused.
- Codes of 0.12.0 (`still`, `fan`, `fanBroil`, `steamHeat`) were never released (dev builds only)
  and are refused when read; `CONTRACT_VERSION` 0.14.0 carries this set. The built-in rows changed
  on 2026-10-13 (the Dutch oven's material, the baguette tray) keep version 1 for the same reason.

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
    | 'baguetteTray'
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
- A `documented` mapping names its closest Flourprint mode and a `source`; an `approximate` one
  names its mode; an `unknown` one names none.
- Versions, archiving and customizing a built-in follow flours.md: editing writes a new version;
  recipes and Preparations keep the version they reference. An archived version still resolves:
  archiving hides an entry from pickers, never from a recipe that references it.
- A built-in entry is referenced as version `1`. Changing a built-in row below ships it as a new
  version; the earlier one stays resolvable, so older recipes and Preparations keep it.

### Built-in entries

Generic items, no brand, every property `unknown` except shape and material (owner decisions of
2026-10-13: "Plaque d'acier" for the baking steel, a cast-iron Dutch oven whatever its enamel, a
perforated baguette tray):

| id                     | kind    | shape        | material        | lid             |
| ---------------------- | ------- | ------------ | --------------- | --------------- |
| `baking-stone`         | support | stone        | cordierite      |                 |
| `baking-steel`         | support | steel        | carbonSteel     |                 |
| `aluminium-sheet`      | support | sheet        | aluminium       |                 |
| `oven-rack`            | support | rack         | stainlessSteel  |                 |
| `dutch-oven-cast-iron` | vessel  | dutchOven    | castIron        | castIron        |
| `pullman-steel`        | vessel  | pullman      | aluminizedSteel | aluminizedSteel |
| `pullman-aluminium`    | vessel  | pullman      | aluminium       | aluminium       |
| `loaf-pan-steel`       | vessel  | loafPan      | carbonSteel     |                 |
| `loaf-pan-silicone`    | vessel  | loafPan      | silicone        |                 |
| `loaf-pan-ceramic`     | vessel  | loafPan      | ceramic         |                 |
| `loaf-pan-glass`       | vessel  | loafPan      | glass           |                 |
| `cast-iron-skillet`    | vessel  | skillet      | castIron        |                 |
| `baguette-tray`        | support | baguetteTray | aluminium       |                 |
| `pot`                  | vessel  | pot          | stainlessSteel  | stainlessSteel  |

There is no built-in appliance: the Flourprint modes are the default. The equipment registry
(`equipment` table, below) holds personal entries only, like flours.

## During a Preparation

- `StartBake` snapshots the process with its `equipment`, and `BakeStartedPayload.equipment` copies
  every entry version the process references (history.md), built-in or personal. Snapshots written
  before `0.12.0` have none. The application resolves those versions from the code (built-ins) and
  the registry (personal) and passes them as `StartBake.equipment`; the domain has no registry and
  checks only that the copies cover every reference, with the matching kind. A built-in copy must
  equal its definition. A reference that resolves nowhere refuses the start (`InvalidCommand`).
- `AdjustStep` (bake-session.md) also takes `equipment`: the whole `StepEquipment` actually used on
  a step not completed (another setpoint, the lid off sooner, another vessel). It is recorded as
  `OverrideApplied { stepId, field: 'equipment', value }`; the snapshot keeps the plan. An entry
  newly referenced by the override is copied into the event (`OverrideApplied.equipment`, as in
  `BakeStartedPayload`). `InsertStepAfter` likewise copies the entries its new step references that
  the session does not hold yet (`StepInserted.equipment`). Each command carries those copies in
  its own `equipment` field. The equipment override carries no `unit`: its value is a whole `StepEquipment`.
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

1. Loaf in a Dutch oven: preheat oven and pot (`preheat`, `beforeTarget`, `requiredWarmupS` 1800, `target` the first `bake`), `bake`
   `still` 250 °C pot `covered`, then `bake` `still` 230 °C pot `open`. Two stages, one vessel ref.
2. Cold start: one `bake` step, `preheated: { appliance: 'cold', vessel: 'cold' }`, no `preheat`
   step; its duration includes the warm-up.
3. Owner's pizza: `panCook` on `stovetop`, `level 7 of 10`, `cast-iron-skillet`; then `bake` `broil`
   `level` only (no setpoint), same skillet ref. Two cooking stages, one result.
4. Bagels: `boil` on `stovetop` in `pot`, then `bake` `convection` 220 °C on `aluminium-sheet`.
5. Oven Proof: `proof` with `appliance: 'oven'`, `mode: 'proof'`, `setpointC` 35, then `bake`.
   The proof is not a cooking stage (bake-session.md).
6. Pullman: `pullman-steel` `closed`, then a second recipe with `pullman-aluminium` `open`; the
   recipe kind does not change, only the vessel and cover.
7. With a profile: a Québec oven mapping its "Convection" to `convection` (`documented`, manual
   as source) and its "Steam Bake" to `convection` with `steam`; a European oven mapping its own
   "Convection" to `trueConvection`. The same recipe shows each oven's label and the same
   pictogram; a third oven without a steam function keeps the recipe's steam as an unmet
   requirement, never silently dropped.
8. Deviation: during the uncovered stage, `AdjustStep` sets 220 °C instead of 230 °C; replay shows
   the plan (230) and what was used (220).
9. A support edited after a Preparation: the Preparation still shows the version it used.
