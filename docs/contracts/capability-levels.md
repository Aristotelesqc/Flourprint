# Contract: capability levels and milestones (D4, D5)

Status: **approved** (issue #30), amended by ADR 0010 (fermentation model in Alpha). Related issues: #9, #17, #26, #27, #28, #29.

- **N1**: representable in the data model.
- **N2**: executable, persisted, resumable after the app is closed.
- **N3**: predicted quantitatively by a versioned model validated within a declared domain.

Formula calculation is exact and deterministic: it is outside this scale and **complete in
Alpha**.

| Capability                                  | Dogfood Alpha                                                                                                | Engine MVP                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Formula (#3, #4, #19)                       | complete                                                                                                     | —                                                       |
| Rich process + DAG (#5)                     | N1 + N2                                                                                                      | —                                                       |
| Bake / session / history (#6, #7, #20, #21) | N1 + N2                                                                                                      | —                                                       |
| Manual ingredient registry (#26)            | N1 + N2, barcode scan out of Alpha                                                                           | —                                                       |
| Equipment / baking (#28)                    | N1 + N2: phases are process steps, user profiles + a few presets                                             | —                                                       |
| Interactions (#27)                          | N1; optional qualitative analyses, sourced and tested, never blocking                                        | —                                                       |
| Fermentation (#9, #29)                      | **first N3 domain** (ADR 0010): forward + inverse dose ↔ duration; `unsupported` / `out_of_domain` elsewhere | more domains, temperature and plan solvers, calibration |

## Data Alpha must collect for calibration

Yeast type and dose (split between preferment and final mix), measured dough temperatures,
condition temperatures, actual times, observed end criterion.

## Simulator (#29)

- A single `simulate()`; inverse solvers (dose ↔ duration) reuse it and re-simulate.
- Narrow, declared domain; elsewhere `unsupported`, `out_of_domain` or `insufficient_data`.
- The first domain, its equations, parameters and validation data are described in a dedicated
  contract before the code (ADR 0010).
