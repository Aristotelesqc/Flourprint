# Classification of evidence: the vocabulary for scientific sources

This file is the one authoritative place for the closed vocabulary used to classify a scientific
source. Other files link here and never copy the definitions. The classification of each source
is recorded in [sources.md](sources.md#classification-of-evidence); the separate scheme for
craft knowledge (practitioner claims) is in [craft-knowledge.md](craft-knowledge.md).

**Authority.** Owner decision, 2026-11-12 (UTC), recorded by PR #276 (issue #231): every
scientific document gets a written classification with a fixed vocabulary, in two parts (this
file for sources, craft-knowledge.md for practitioner knowledge). It is documentation only: it
changes no model, coefficient, equation, contract, engine or screen. Anything this file adds
beyond that decision is marked **Proposal** and waits for the owner's confirmation; the list is
at the end.

**Two schemes, never mixed.**

| Scheme                   | Applies to                                        | Labels                                                               | Lives in                                 |
| ------------------------ | ------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| Classification of source | Every scientific document in `sources.md`         | reading, reason, soundness, scope, role, workarounds (this file)     | this file; filled in `sources.md`        |
| Craft-knowledge level    | Claims by practitioners (books, courses, recipes) | level A, B or C per claim, with a separate description of the source | [craft-knowledge.md](craft-knowledge.md) |

The provenance labels of [README.md](README.md#provenance-labels) (MEASURED, DERIVED / FITTED,
ASSUMED, EXTRAPOLATED, MODEL OUTPUT) describe a number and stay as they are. The classification
below describes the source behind a number.

## 1. Reading

How much of the source a Flourprint agent actually read. One class per source, closed list:

| Class           | Meaning                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`          | Every page, table and figure was looked at by a Flourprint agent. A figure need not be digitised: digitising is a separate fact in the data file.          |
| `partial`       | Some parts were read. The parts read and the parts not read are both named, and each unread part carries a reason (section 2).                             |
| `abstract only` | The abstract, or a publisher or index record of it, and nothing more.                                                                                      |
| `not read`      | Nothing beyond bibliographic data or an index page. A source known only through another text (a review, a transcription, a relayed reading) is `not read`. |

A reading cell names the parts actually read (pages, tables, figures), who read them and the UTC
date, so that a verifier can retrace it. A reading made outside the repository and relayed is
not a reading here: it is a lead (section 6).

The class is taken from the reader's own record. A part the record names as not read makes the
source `partial`; a record that says `full` and names only the sections that matter keeps `full`
until a verifier finds an unread part, and the classification says so.

Legacy labels in the index tables map as follows: `full` stays `full`; `abstract` is `abstract only`;
`secondary` is `not read` plus a workaround route (section 6); `external` is `not read` here, the
relayed reading being a lead; "full text available, skimmed" is `partial` plus a reason.

## 2. Reason for an incomplete reading

Every unread part of a `partial`, `abstract only` or `not read` source has exactly one reason from
this closed list, with the parts missing and what would complete the reading.

| Reason                    | Use it when                                                                                                                                    | What completes it                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `access refused`          | The site blocks automated requests or the text is behind a paywall, and the refusal is recorded.                                               | A legitimately obtained copy, or an allowed host.                 |
| `out of scope, justified` | The rest was at least skimmed, its content is named, it does not bear on the model, and the reason is written. All four conditions are needed. | Nothing, unless the model's scope changes.                        |
| `unreadable`              | A poor scan, or a figure without printed values, makes the part unusable as it is.                                                             | A better copy, or the authors' data.                              |
| `not finished`            | The agent stopped. This is a debt, not a resting state.                                                                                        | Reading the part, or establishing one of the other three reasons. |

A `full` reading may also record that some parts it read are out of scope for the model, with
the reason: that is a statement about use, not an incomplete reading.

**Merge rule (owner decision, 2026-11-12 (UTC)).** No source may be left `not finished` in a pull
request that is ready to merge: finish it, or establish one of the other three reasons.
`out of scope, justified` must be earned; otherwise it is `not finished`. The sources that carry
`not finished` are listed in [sources.md](sources.md#open-reading-debts).

## 3. Soundness of the measurements

A short factual statement and a three-level label, `sound`, `limited` or `weak`. There is no
numeric score: a single number would be false precision. The label is assigned only to the parts
actually read, and rests on five questions, each answered yes, no or not recorded:

1. **Replication.** Is the replication real (separate mixes or batches), not portions of one mix?
2. **Dough temperature.** Is a dough temperature reported, not only a chamber or set temperature?
3. **Tabulated.** Are the values printed in a table or in the text, not read from a figure?
4. **Sample and spread.** Are the sample size and the spread printed?
5. **Consistent.** Is the source free of an unresolved inconsistency in the figures used?

An answer "not recorded" counts as "no", so a label can rise when the record is completed and
cannot fall unseen. Labels follow from the count of answers other than yes: `sound` for at most
one, `limited` for two or three, `weak` for four or five. The statement names the failed
questions and says what each does to the use of the data. A source that was not read in the part
concerned is `not assessed`, and the cell says what is missing.

## 4. Scope

Where the source stands relative to the model's domain: lean dough, low yeast dose, home
conditions. Three classes, always with the reason:

| Class       | Meaning                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `in domain` | Formulation, dose and conditions all lie in the domain.                                                             |
| `adjacent`  | Exactly one of the three lies outside (for example an enriched formulation, or a dose above the contract's gate).   |
| `outside`   | Two or more lie outside, or the system is not fermenting dough (a liquid culture, a fridge wall, a model's output). |

The gates themselves are those of [fermentation.md](../contracts/fermentation.md); this file does
not restate them. For the thermal sub-model, the domain is a domestic fridge or room and a dough
mass; a source on heat transfer there is `adjacent` at best.

## 5. Role for the model

The highest use the classification supports for a source, from a closed list:

| Role                       | May do                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fit`                      | Calibrate a coefficient: it measures what the coefficient predicts, in or adjacent to the domain, and was read by route 1 or in the original (section 6). |
| `independent validation`   | Test a coefficient fitted on other data (another flour, protocol or laboratory); never calibrate it.                                                      |
| `order-of-magnitude check` | Show that a value has the right size or shape. No number is taken from it.                                                                                |
| `mechanism`                | Explain a direction or a cause. No number is taken from it.                                                                                               |
| `method only`              | Supply a protocol, an assay or an estimator. No number is taken from it.                                                                                  |
| `none`                     | No use: a lead, a source out of scope, or a model's output.                                                                                               |

**Coefficient rule (owner decision, 2026-11-12 (UTC)).** A model coefficient may rest only on
sources whose role is `fit` or `independent validation`. Craft knowledge may never be one
([craft-knowledge.md](craft-knowledge.md)). A shipped coefficient that rests on any other source is
a finding to list, never a reason to change the model in the same pull request; findings are in
[sources.md](sources.md#findings-shipped-coefficients-and-source-roles).

**Proposal.** A source whose soundness is `weak` cannot hold `fit` or `independent validation`.

## 6. Workarounds

An alternative route to a source's content. Each is recorded with its link, what it allowed to be
read, and the routes not tried. Five kinds, in order of trust:

| Route | Kind                                                                           | Trust                                                                                                          |
| ----- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 1     | Same author, other medium (thesis, preprint, repository copy)                  | Equivalent to the original if the differences found are noted (for example Birch and Verheyen through theses). |
| 2     | Another article reproducing the data                                           | Good for the reproduced figures only (for example the AACC schedule printed in Finney 1984).                   |
| 3     | Publisher abstract                                                             | Conclusions only. No number from it is usable for a coefficient.                                               |
| 4     | Literature review or third-party citation                                      | A lead to confirm.                                                                                             |
| 5     | Unauthenticated transcription (for example a forum or a document-sharing copy) | A lead only, never "verified".                                                                                 |

Rules:

- The original's reading class does not rise because a workaround was read.
- A number obtained through a workaround keeps that label until it is compared with the original.
- Only route 1 may support `fit` or `independent validation`. A route 1 reading whose equivalence
  to the original was not checked says so (`not assessed`) in its record.

## 7. Where each fact is written

| Fact                                                     | Place                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| The vocabulary and the rules above                       | This file only.                                                                                    |
| One classification row per source                        | [sources.md](sources.md#classification-of-evidence), keyed by the source name of the index tables. |
| Parts read, parts missing, workarounds, routes not tried | The records under that table, in the same file.                                                    |
| Sources left `not finished`                              | [sources.md](sources.md#open-reading-debts).                                                       |
| Shipped coefficients resting on a source of another role | [sources.md](sources.md#findings-shipped-coefficients-and-source-roles).                           |
| Table values and what a temperature means                | The `data/` file of the source, as before.                                                         |

## Proposals beyond the owner's decision

Each waits for the owner's confirmation; none changes a model.

1. The five soundness questions, the rule that "not recorded" counts as "no", and the thresholds
   of the three labels (section 3).
2. The operational definition of the three scope classes (section 4).
3. The cap that a `weak` source cannot hold `fit` or `independent validation` (section 5).
4. The mapping of the legacy read-status labels (section 1) and the token `not assessed`.
5. The "Findings" and "Open reading debts" subsections of `sources.md` as the places where the
   coefficient rule and the merge rule are made visible.
