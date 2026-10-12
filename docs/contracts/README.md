# Data contracts

Source of truth for the **semantics** of Flourprint data and calculations. Code, CLI, UI and
fixtures conform to them. Architecture choices live in `../adr/`.

| Contract                                     | Decision | Content                                                     |
| -------------------------------------------- | -------- | ----------------------------------------------------------- |
| [formula.md](formula.md)                     | D1, D2   | anchors, edit commands, components, water quantities        |
| [values-and-units.md](values-and-units.md)   | D6       | canonical units, `Observation`, `Estimate`, `PropertyValue` |
| [process.md](process.md)                     | D3       | step graph, `asap`/`alap`, projection                       |
| [bake-session.md](bake-session.md)           | D7       | commands, events, idempotency, corrections                  |
| [history.md](history.md)                     | D8       | snapshots, committed values, export                         |
| [persistence.md](persistence.md)             | —        | recipes, revisions, bake summaries, SQLite schema           |
| [fermentation.md](fermentation.md)           | D4, D5   | provisional commercial-yeast model, water temperature       |
| [drafts.md](drafts.md)                       | —        | free drafts, recipe checks, templates                       |
| [flours.md](flours.md)                       | —        | flour registry, built-in flours, flour refs in bakes        |
| [ingredients.md](ingredients.md)             | —        | ingredient registry, built-in ingredients, entry pins       |
| [capability-levels.md](capability-levels.md) | D4, D5   | N1/N2/N3, Alpha and Engine MVP                              |
| [fixtures/](fixtures/README.md)              | —        | reference cases computed outside the engine                 |

Origin: issue #30 (arbitration approved on 2026-10-06). Any change goes through a pull request
editing these files, not through an issue comment. `CONTRACT_VERSION`
(`@flourprint/core/contracts`) is bumped on every change to a persisted contract.
