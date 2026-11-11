# Science

This directory holds the scientific basis of Flourprint's models: the evidence behind each
coefficient, how it was obtained, and where it stops being valid.

## Start here

[dough-behavior.md](dough-behavior.md) is the canonical entry point. It lists, for each domain of
fermented dough behavior (yeast, temperature, gas, readiness, humidity, ingredients, salt, enzymes,
flour, hydration, preferments, process, geometry, rheology, baking interface, calibration,
uncertainty), ten separate facts at a stated commit and date: the science, the open issues, the
contracts and ADRs, the conformance, the engine code, the screens, the pull requests and branches,
the validation, and the project's chosen direction with its authority. The specialist documents
below hold the evidence; this directory's other files do not repeat each other.

## Authority boundaries and precedence

|               | `docs/contracts/`                                                | `docs/science/`                                                         | `dough-behavior.md`                                                       |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Answers       | What the program must do: equations, parameters, domains, units. | Why: the evidence, the fits, the alternatives and their limits.         | Where each fact stands today: code, screen, branch, validation, decision. |
| Authority     | An implementation that contradicts it is wrong.                  | Justifies a contract. It never overrides one.                           | None of its own: it links, and states what is checked and when.           |
| Changes via   | A dedicated pull request, before dependent code.                 | A pull request that cites the source, the provenance label and the fit. | Any pull request that changes a domain it describes (maintenance rule).   |
| Numbers in it | The ones the engine uses.                                        | All numbers considered, including those rejected or research-only.      | None, except pointers.                                                    |

- **Contracts** say what the program is contractually supposed to do. A contract is not evidence
  that the code conforms, nor that the biology is right.
- **Science** explains why, on what evidence and with what limits. A research candidate is not a
  shipping model; a scientific assumption does not become a contract or a decision by appearing
  in a report.
- **ADRs** (`docs/adr/`) record architecturally consequential choices, alternatives and
  supersession. A proposed ADR is not accepted authority, and an accepted ADR does not prove
  implementation, UI wiring or validity.
- **Project decisions** are the owner's: a dated owner statement, an accepted ADR, or a contract
  the owner approved. An agent's suggestion, a roadmap or an unmerged proposal is not a decision.
  `dough-behavior.md` records each decision's authority; "no recorded decision" is never "rejected".
- **Precedence on conflict.** Verified evidence and explicit supersession decide, not the rank of
  whoever wrote it. A later document that says it supersedes an earlier one, with the reason and
  the evidence, replaces it as the current position; the earlier one stays as history. Between
  documents: the contract governs what ships, the science document governs what is known about it,
  and a disagreement is logged in the "Known inconsistencies" section of `dough-behavior.md`
  until a pull request resolves it. Issues are the discussion log; the repository holds the
  canonical state, and a supported conclusion is moved into it before its issue closes.

A coefficient that appears in a contract must have a provenance entry here. A candidate that is
only documented here is not adopted. Promotion needs the gates listed in
[fermentation-model.md](fermentation-model.md#12-open-questions-and-promotion-gates), then a contract
pull request.

## Contents

- [dough-behavior.md](dough-behavior.md): the canonical map from science to issues, ADRs,
  contracts, conformance, backend, frontend, pull requests, validation and project decisions.
- [fermentation-model.md](fermentation-model.md): the fermentation model, its evidence, its limits
  and its changelog by model version. The specialist account of the shipped kinetic law, the
  physical temperature approximation, alternative fits, gates and open questions.
- [home-measurements.md](home-measurements.md): the measurements the owner's bakes can make to
  calibrate the weakest points (fridge cooling, cold end, end point), with what to record.
- [sources.md](sources.md): the index of every source considered, with legal access links, read
  status and use. No PDFs are stored in the repository.
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
- Where sources disagree, the verified evidence and the explicit, dated supersession decide, not
  a fixed ranking of the agents who wrote them. The first reports on issue #33 (a Gemini research
  report, a GPT audit, a Codex synthesis) are history: where a later primary-source check or audit
  corrected them, the correction stands and says so. The discussion record is issues #33 and #231.
- Fitted values are not measurements. A fit's output is never presented with the authority of its
  inputs.
- No invented ranges, error bands or multipliers. A domain that was not measured is
  EXTRAPOLATED, and its error is "unknown".
- Reference data and fits are computed outside the engine and never regenerated from engine or CLI
  output.
- Before changing fermentation equations, parameters, domains or end-point semantics, read
  [fermentation-model.md](fermentation-model.md) and `docs/contracts/fermentation.md`.
