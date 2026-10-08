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
  | { status: 'ok'; value: T; range?: [T, T]; model: ModelRef; assumptions: string[] }
  | {
      status: 'unsupported' | 'out_of_domain' | 'insufficient_data';
      model?: ModelRef;
      missing?: string[];
      reason: string;
    };

type PropertyValue =
  | {
      status: 'known' | 'estimated';
      value: number | boolean | string; // composition, pH, density, enzyme activity, organic…
      unit?: Unit;
      basis?: 'per100g' | 'perServing' | 'dryMatter';
      source: SourceRef;
      uncertainty?: number;
    }
  | { status: 'unknown' };

interface ModelRef {
  id: string;
  version: string;
}
```

- Uncertainty appears only where it is meaningful: `Observation`, `Estimate`, `PropertyValue`.
- Model parameters are versioned, immutable data, shipped with the app and exported with any bake
  that references them. A hash, if any, only checks integrity.
- A computed suggestion (`Estimate`) never becomes an observation (`Observation`).
- `assumptions`, `reason` and `missing` hold stable codes or English developer text; the UI
  localizes them (ADR 0009).
