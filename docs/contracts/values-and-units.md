# Contract: values, units, observations, estimates (D6)

Status: **approved** (issue #30). Related issues: #6, #9, #26, #27, #28, #29.

## Canonical units in persisted documents

| Quantity    | Unit         | Convention                                                      |
| ----------- | ------------ | --------------------------------------------------------------- |
| mass        | gram         | `number`                                                        |
| temperature | °C           | `number`                                                        |
| duration    | second       | `number`, fields suffixed `S` (`plannedDurationS`)              |
| instant     | ISO 8601 UTC | string ending in `Z` (`Instant`), a real calendar date and time |
| percentage  | **points**   | 70 = 70 %, fields suffixed `Pct`; no 0–1 fraction is persisted  |

0–1 fractions exist only inside calculations. `Quantity { value, unit }` is used only at
boundaries: input in another unit, product labels, imports. Display units and number formats are
a UI concern (ADR 0009).

### Temperature display units

The baker chooses °C or °F for three contexts, a device preference that is never written into a
document, a backup or an export:

| Context   | Temperatures shown                                                    |
| --------- | --------------------------------------------------------------------- |
| `oven`    | steps with operation `bake`, `preheat` or `boil`, or location `oven`  |
| `cold`    | steps with location `fridge` or `freezer`, or operation `retard`      |
| `ambient` | every other temperature: room, proofer, dough, water, flour, friction |

A value typed in °F is converted to °C before it is stored (`(F − 32) × 5 / 9`), and shown back
from °C; a friction is a difference and converts by `× 5 / 9` only.

## Provenance

No envelope around every number. The provenance of a planned value is carried by structure
(formula revision, override event, preset reference) and produced by `explain`.

## Types

```ts
interface Observation<T = number> {
  value: T;
  unit: Unit;
  observedAt: Instant;
  method?: 'measured' | 'reported';
  uncertainty?: number; // instrument precision, same unit
  note?: string;
}

type Estimate<T = number> =
  | {
      status: 'ok';
      value: T;
      range?: [RangeBound<T>, RangeBound<T>];
      model: ModelRef;
      assumptions: string[];
      extrapolations?: string[]; // outside the data the model was fitted on, still given
      calibration?: { id: string; version: string }; // readiness profile used (fermentation.md)
    }
  | {
      status: 'unsupported' | 'out_of_domain' | 'insufficient_data';
      model?: ModelRef;
      missing?: string[];
      reason: string;
    };

type RangeBound<T = number> =
  { kind: 'finite'; value: T } | { kind: 'beyondHorizon'; horizonS: number }; // never reached within the search horizon

type PropertyValue =
  | {
      status: 'known' | 'estimated';
      value: number | boolean | string; // composition, pH, density, enzyme activity, organic…
      unit?: Unit;
      basis?: 'per100g' | 'perServing' | 'dryMatter' | 'asIs' | 'moisture14'; // flours.md
      source: SourceRef;
      uncertainty?: number;
    }
  | { status: 'unknown' };

interface ModelRef {
  id: string;
  version: string;
}
```

- Units of a `PropertyValue` are the canonical ones, `%` (points) and the property units named by
  their contract: `'1e-4 J'` (alveograph W, `flours.md`), `'g/mL'` (density) and `'°L'`
  (Lintner, diastatic power) in `ingredients.md`. A composition of an ingredient is always in
  points of product mass with `basis: 'per100g'`.
- Uncertainty appears only where it is meaningful: `Observation`, `Estimate`, `PropertyValue`.
- Model parameters are versioned, immutable data, shipped with the app and exported with any bake
  that references them. A hash, if any, only checks integrity.
- A computed suggestion (`Estimate`) never becomes an observation (`Observation`).
- A `range` bound is never a raw number that could be `Infinity` (JSON turns it into `null`).
  `beyondHorizon` says the band's corner did not reach the end point within `horizonS` seconds.
  Snapshots written before `0.4.0` hold plain numbers; reading them upcasts each number to
  `{ kind: 'finite', value }` without changing its value (history.md).
- Every number of an `ok` estimate (value and finite bounds) is finite.
- `extrapolations` lists, as stable codes, each reason the estimate lies outside the model's
  fitted domain; the UI always shows them next to the value.
- `assumptions`, `extrapolations`, `reason` and `missing` hold stable codes or English developer text; the UI
  localizes them (ADR 0009).
