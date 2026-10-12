# Contract impact questions

Select questions relevant to the proposed change. Record concrete affected paths and acceptance,
rather than checking every item mechanically. Follow the current contract if this reference and
that contract diverge.

## Formula, process and values

Consult `docs/contracts/formula.md`, `process.md`, `values-and-units.md` and `drafts.md`.
Which anchor/invariant remains fixed? Is allocation still conserved? How are unknown and estimated
properties represented? Does an empty/invalid draft remain editable without being mistaken for a
valid saved revision? Are planned timing and actual step facts kept distinct? Do UI/CLI commands
express the same choice explicitly, without baking calculations leaking into clients?

## Events, snapshots and persistence

Consult `bake-session.md`, `history.md`, `persistence.md`, `flours.md` and ADRs 0003/0004/0007.

- Does the change require new typed commands/events or only a representation upcast? Are command
  identity, optimistic version checks, atomic append and corrections still coherent?
- Can old events replay structurally without recomputing historical quantities? Are committed
  outputs/provenance and referenced immutable versions retained?
- What old-data case has no truthful answer? Preserve explicit unknowns; do not infer cooking,
  success, measurements or material properties from the presence of a legacy row.
  Use an already accepted unknown representation where available; otherwise propose it in the
  contract PR before adding schema/upcaster code. Preserving uncertainty does not authorize a
  new persisted field or manufacture facts about the old session.
- Which schema/document migration, index/cache, backup/import/export and restore paths change?
  Include memory and SQLite adapters, and native/desktop persistence evidence where applicable.
  Specify the supported reader/writer compatibility; do not assume downgrades work.
- Does a deleted/archived catalogue entry or equipment profile remain sufficient to reconstruct
  an existing revision/session? Does the export include its required dependencies?

## Biological/thermal models and capabilities

Consult `fermentation.md`, `capability-levels.md`, `docs/science/README.md` and the scientific model
document before altering equations, coefficients, domains or endpoint meaning. Use the
`flourprint-science` skill for evidence work. Model IDs/parameters, uncertainty, unsupported
inputs and direct/inverse consistency belong in acceptance. Representing/recording equipment or
ingredients (N1/N2) is distinct from a validated prediction (N3).

## A compact handoff

State the accepted before/after semantics, touched contracts/versions and consumers, independent
examples, old-data treatment, required migrations/tests, open owner choices and what implementation
must wait. This is a PR/issue handoff, not another project tracking file.
