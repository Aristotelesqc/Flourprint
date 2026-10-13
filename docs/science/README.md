# Science

This directory holds the scientific basis of Flourprint's models: the evidence behind each
coefficient, how it was obtained, and where it stops being valid.

## How it relates to `docs/contracts`

|               | `docs/contracts/`                                  | `docs/science/`                                                         |
| ------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| Answers       | What ships: equations, parameters, domains, units. | Why: the evidence, the fits, the alternatives and their limits.         |
| Authority     | An implementation that contradicts it is wrong.    | Justifies a contract. It never overrides one.                           |
| Changes via   | A dedicated pull request, before dependent code.   | A pull request that cites the source, the provenance label and the fit. |
| Numbers in it | The ones the engine uses.                          | All numbers considered, including those rejected or research-only.      |

A coefficient that appears in a contract must have a provenance entry here. A candidate that is
only documented here is not adopted. Promotion needs the gates listed in
[fermentation-model.md](fermentation-model.md#open-questions-and-promotion-gates), then a contract
pull request.

## Contents

- [fermentation-model.md](fermentation-model.md): the fermentation model, its evidence, its limits
  and its changelog by model version.
- [ingredient-values.md](ingredient-values.md): proposed typical composition values and citations
  for the built-in ingredient entries (`docs/contracts/ingredients.md`), with read status and
  unknowns.
- `data/`: transcribed source tables (CSV) with a metadata file each (source, DOI, formula,
  endpoint, what the temperature means, who transcribed it, read status, `source_verified`).
- `data/style-guides.md` and `.json`: consensus ranges and starting points per template style,
  with sources, read through web-search excerpts only (`source_verified: false`): a reference for
  template versions, not a contract.
- `scripts/`: small reproducible scripts that recompute fits from `data/`. They import nothing
  from the application and are not engine code.

## Provenance labels

Every number in this directory carries exactly one of these labels, stated or evident from its
table.

| Label            | Meaning                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| MEASURED         | A value reported by a primary source for its own experiment, with its protocol and basis.                                                    |
| DERIVED / FITTED | Computed by us (or by a named reviewer) from other numbers. The note says who fitted it, on what data, and with which method.                |
| ASSUMED          | A convenience value or engineering prior with no source.                                                                                     |
| EXTRAPOLATED     | A model applied outside the domain where it was calibrated.                                                                                  |
| MODEL OUTPUT     | The output of a third-party model (for example Craig's yeast table). It is not data about dough, even when it looks like a table of results. |

A second, separate field gives the **read status**: full text read (by whom), abstract only, or
secondary (a transcription or a citing text). A label is never upgraded by a source we could not
read: a MEASURED value known only through a secondary transcription stays marked as such, and
`source_verified=false` in the data files.

## Rules

- Issues are the discussion log. The repository holds the canonical scientific state. A
  conclusion reached in an issue thread is not part of the model until it is written here with its
  provenance.
- Where sources disagree, later audits override earlier reports. The record of arbitration is the
  issue #33 thread (the Gemini research report, the GPT audit, then the Codex synthesis).
- Fitted values are not measurements. A fit's output is never presented with the authority of its
  inputs.
- No invented ranges, error bands or multipliers. A domain that was not measured is
  EXTRAPOLATED, and its error is "unknown".
- Reference data and fits are computed outside the engine and never regenerated from engine or CLI
  output.
- Before changing fermentation equations, parameters, domains or end-point semantics, read
  [fermentation-model.md](fermentation-model.md) and `docs/contracts/fermentation.md`.
