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
at the end. Three owner decisions of 2026-11-13 (UTC), given in chat, relax the coefficient rule
(section 5), add the principle of computed uncertainty (section 8) and let craft knowledge set an
uncertainty range ([craft-knowledge.md](craft-knowledge.md#craft-knowledge-and-uncertainty-ranges));
they are listed as decided at the end, with a fourth decision of 2026-11-14 (UTC) on `Ea`.

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
| `abstract only` | The abstract, as printed on the publisher's page or in an index record, and nothing more.                                                                  |
| `not read`      | Nothing beyond bibliographic data or an index page. A source known only through another text (a review, a transcription, a relayed reading) is `not read`. |

A reading cell names the parts actually read (pages, tables, figures), who read them and the UTC
date, so that a verifier can retrace it. A reading made outside the repository and relayed is
not a reading here: it is a lead (section 6).

**Proposal (items 4 and 10).** The class is taken from the reader's own record. A part the record names as not read makes the
source `partial`. A record that names only some sections of a paper makes the source `partial`;
each unnamed section needs a reason from section 2, or is `not finished`. A `full` reading whose
record names no pages, tables or figures is written `full`, per the named agent's record of the UTC
date; pages and tables not recorded (**Proposal**, item 8).

**Proposal (item 4).** Legacy labels in the index tables map as follows: `full` stays `full`; `abstract` is `abstract only`;
`secondary` is `not read` plus a workaround route (section 6); `external` is `not read` here, the
relayed reading being a lead; "full text available, skimmed" is `partial` plus a reason.

## 2. Reason for an incomplete reading

Every unread part of a `partial`, `abstract only` or `not read` source has exactly one reason from
this closed list, with the parts missing and what would complete the reading.

| Reason                    | Use it when                                                                                                                                                                                           | What completes it                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `access refused`          | The site blocks automated requests, the text is behind a paywall, or the session's network policy refuses the host; the refusal is recorded with its UTC date and HTTP result (**Proposal**, item 8). | A legitimately obtained copy, or an allowed host.                 |
| `out of scope, justified` | The rest was at least skimmed, its content is named, it does not bear on the model, and the reason is written. All four conditions are needed.                                                        | Nothing, unless the model's scope changes.                        |
| `unreadable`              | A poor scan, or a figure without printed values, makes the part unusable as it is.                                                                                                                    | A better copy, or the authors' data.                              |
| `not finished`            | The agent stopped. This is a debt, not a resting state.                                                                                                                                               | Reading the part, or establishing one of the other three reasons. |

A `full` reading may also record that some parts it read are out of scope for the model, with
the reason: that is a statement about use, not an incomplete reading (**Proposal**, item 8).

**Merge rule (owner decision, 2026-11-12 (UTC)).** No source may be left `not finished` in a pull
request that is ready to merge: finish it, or establish one of the other three reasons.
`out of scope, justified` must be earned; otherwise it is `not finished`. The sources that carry
`not finished` are listed in [sources.md](sources.md#open-reading-debts).

## 3. Soundness of the measurements

A short factual statement and a three-level label, `sound`, `limited` or `weak`. There is no
numeric score: a single number would be false precision. The label is assigned only to the parts
actually read. **Proposal (item 1):** the five questions below, the rule that "not recorded" counts as
"no", and the thresholds of the three labels are agent-authored and wait for the owner's
confirmation. The label rests on five questions, each answered yes, no or not recorded:

1. **Replication.** Is the replication real (separate mixes or batches), not portions of one mix?
2. **Dough temperature.** Is a dough temperature reported, not only a chamber or set temperature?
3. **Tabulated.** Are the values printed in a table or in the text, not read from a figure?
4. **Sample and spread.** Are the sample size and the spread printed?
5. **Consistent.** Is the source free of an unresolved inconsistency in the figures used?

**Proposal (item 1).** An answer "not recorded" counts as "no", so a label can rise when the record is completed and
cannot fall unseen. Labels follow from the count of answers other than yes: `sound` for at most
one, `limited` for two or three, `weak` for four or five. The statement names the failed
questions and says what each does to the use of the data. A source that was not read in the part
concerned is `not assessed`, and the cell says what is missing.

## 4. Scope

Where the source stands relative to the model's domain: lean dough, low yeast dose, home
conditions. Three classes, always with the reason (a scope cell without its reason is incomplete).
**Proposal (item 2):** the operational definition in the table below ("exactly one", "two or
more" of the three axes) is agent-authored and waits for the owner's confirmation.

| Class       | Meaning                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `in domain` | Formulation, dose and conditions all lie in the domain.                                                             |
| `adjacent`  | Exactly one of the three lies outside (for example an enriched formulation, or a dose above the contract's gate).   |
| `outside`   | Two or more lie outside, or the system is not fermenting dough (a liquid culture, a fridge wall, a model's output). |

The gates themselves are those of [fermentation.md](../contracts/fermentation.md); this file does
not restate them.

**Proposal: home conditions.** The conditions of a source lie outside the domain when the dough
temperature lies outside the contract's temperature gate, or when the dough is fermented in a vessel or at a
mass that no home baker uses. A closed, weighted instrument chamber (a rheofermentometer or a
gas-assay jar), a sample of a few grams and an industrial vat are not home vessels; an open bowl, tin, tray,
beaker or incubator at a temperature inside the gate is. A source whose record does not state the
vessel, the mass or the dough temperature has its conditions `not recorded`, and the class says so. The
dose and the formulation are judged against the contract's own gates, so a dose range that crosses a gate counts
as outside for the part above it. For the thermal sub-model, the domain is a domestic fridge or room and a dough
mass; a source on heat transfer there is `adjacent` at best (**Proposal**, item 6; see the heat-transfer open question below).

**Decided: the class is judged per cell, with a salt tolerance (owner decision, 2026-11-13
(UTC), provisional, open to challenge by an independent review).**

1. **Salt tolerance.** A deviation of at most 0.2 point of salt from the contract's range is named
   in the scope cell but does not move the class. No tolerance is decided for water or for larger
   salt deviations: those stay as the rule is written, and the choice of a size for them is open.
2. **The class is assigned per cell (per measurement), not per source.** A cell at 2 % fresh
   yeast is inside the dose gate. A cell above the gate (4 and 6 %, and the Birch cells above
   3 %) is `adjacent` on the dose axis: usable to study the dose response, flagged as an
   extrapolation beyond the gate. A source row names its cell groups and gives the class of each.

Everything else in this section is unchanged. Where the rule is applied, the
[per-subset analysis](sources.md#role-versus-scope-the-subsets-behind-each-research-fit-or-hold-out)
gives the classes, the roles that stand and what a subset of in-gate doses can and cannot
identify. The home-conditions Proposal is applied as it stands: a dough temperature that is not
reported makes the conditions `not recorded`, and the class says so.

**Open questions on this section (owner decision needed; neither is decided or applied).**

1. **Heat-transfer scope.** The `outside` row above lists "a fridge wall", while the last
   sentence of the Proposal says a source on heat transfer in the thermal domain is `adjacent` at
   best. The two contradict each other for Williams 1994 and Laguerre 2010, which are
   `adjacent` in `sources.md` with a pending mark (the Lança candidate is `not recorded`: it
   was not read). Not chosen here: either a fridge wall is
   `outside` (the sentence goes), or such a source is `adjacent` (the list entry goes).
2. **A `not recorded` axis and the dough temperature after mixing.** Neither Izzreen nor Birch
   reports the dough temperature after mixing (19-min machine mix with 30 °C water); the chamber
   temperature, which is inside the gate, is reported. Under the Proposal, the conditions of every
   cell are therefore `not recorded`. The Proposal does not say how a `not recorded` axis counts
   in the class. This file keeps it as written: the axis is not counted as `outside`, and each
   cell carries the mark "conditions `not recorded`". Were it counted as `outside`, the cells
   above the dose gate (two axes) would become `outside` and the 2 % cells `adjacent`; the roles
   that need a source in or adjacent to the domain (`fit`, `independent validation`) would then
   hold only on the 2 % cells, which cannot identify a dose exponent (sources.md, Role versus
   scope).

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

**Coefficient rule (owner decision, 2026-11-12 (UTC); relaxed by owner decision, 2026-11-13
(UTC)).** A model coefficient may rest on:

1. measurements, from sources whose role is `fit` or `independent validation`. Two uses are kept
   apart: data used to **derive** a coefficient (a `fit`, or a borrowed model in item 2) and
   independent evidence used to **test** it (`independent validation`). The second must stay
   outside the calibration of that same coefficient; a source that calibrated a coefficient is a
   `fit` for it and cannot also validate it (**Proposal**: this clarifying wording); or
2. failing that, **another recognised model**, when no raw measurements exist for the doughs
   concerned. All four conditions are needed:
   - (a) the coefficient carries the visible label `model-derived`, so that it is never confused
     with a measured one;
   - (b) the record names which model, how it was reached (for example a third-party
     transcription) and why no measurements were available;
   - (c) the borrowed model passed a plausibility check against what the repository holds, and
     the record says which checks;
   - (d) measurements replace it as soon as sound ones exist.

   The four conditions are **assessed for each coefficient separately**; one coefficient meeting a
   condition does not carry another (**Proposal**: this clarifying wording).

Craft knowledge may never be a basis for a coefficient
([craft-knowledge.md](craft-knowledge.md)). A shipped coefficient that rests on neither basis is a
finding to list, never a reason to change the model in the same pull request; findings are in
[sources.md](sources.md#findings-shipped-coefficients-and-source-roles).

**`model-derived` in the vocabulary.** It is a label for the basis of a coefficient, not a source
role: the roles above say what a source may do, the label says what a coefficient rests on. The
source behind a `model-derived` coefficient keeps its own role, so the Craig table stays `none`
(it is a model's output, neither a fit nor a validation). A coefficient without the label rests on
sources of role `fit` or `independent validation`. The label is given only to a coefficient that
actually comes from a model; an ASSUMED value or a vendor ratio does not become `model-derived`
by this rule. The provenance labels of [README.md](README.md#provenance-labels) still describe
the number (a coefficient fitted by Flourprint to a third-party table is DERIVED / FITTED; the
table is MODEL OUTPUT).

**Applied to the shipped 0.1.0 coefficients (owner decision, 2026-11-13 (UTC); `Ea` decision,
2026-11-14 (UTC)).** `A` 3.43 h, `k` 0.729 and `Ea` 98.3 kJ/mol are `model-derived` (from the
Craig table), provisional and not validated. Assessed per coefficient (the record and the checks
found are in [sources.md](sources.md#findings-shipped-coefficients-and-source-roles)):

| Coefficient | (a) label | (b) model, how, why | (c) plausibility check                                                 | (d) replacement |
| ----------- | --------- | ------------------- | ---------------------------------------------------------------------- | --------------- |
| `A`         | met       | met                 | met, weakly: one secondary transcription at one temperature, one curve | recorded        |
| `k`         | met       | met                 | met: Finney 1976 (order of magnitude), Calvel transcription            | recorded        |
| `Ea`        | met       | met                 | **not met**                                                            | recorded        |

For `A` and `k` item 2 therefore applies. For `Ea` condition (c) is **not met**: no check in the
repository bears on 98.3, and the evidence available points lower. **Owner decision, 2026-11-14
(UTC), given in chat:** `Ea` is kept as an **approved provisional exception**, "in the absence of
better data, the imperfection is accepted". It is not claimed to satisfy the rule, and it is to be
replaced when sound measurements allow. The experiment of 2026-11-14 (UTC) (research only,
[fermentation-model.md, section 15](fermentation-model.md#temperature-sensitivity-base-speed-and-readiness-target-against-the-published-schedules-research-2026-11-14-utc))
found that on the published schedules a lower `Ea` does not reduce the disagreement, that the free
estimate is about 85 kJ/mol with a wide bootstrap interval (65 to 110), and that almost all recipe
temperatures are assumed; this plausibility check neither supports nor contradicts 98.3. No `fit`
label is given to the Craig table, and no constant changes.

**Proposal.** A source whose soundness is `weak` cannot hold `fit` or `independent validation`.

**Proposal.** The conditions on `fit` in the table above: the source is in or adjacent to the
domain, and was read by route 1 or in the original (item 9). The first condition is judged per cell, by the
owner decision recorded in section 4.

## 6. Workarounds

An alternative route to a source's content. Each is recorded with its link, what it allowed to be
read, and the routes not tried. Five kinds, in order of trust:

| Route | Kind                                                                             | Trust                                                                                                          |
| ----- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1     | Same author, other medium (thesis, preprint, repository copy)                    | Equivalent to the original if the differences found are noted (for example Birch and Verheyen through theses). |
| 2     | Another article reproducing the data                                             | Good for the reproduced figures only (for example the AACC schedule printed in Finney 1984).                   |
| 3     | Publisher abstract obtained through a third-party index (for example Europe PMC) | Conclusions only. No number from it is usable for a coefficient. (**Proposal**, item 7: the narrowing.)        |
| 4     | Literature review or third-party citation                                        | A lead to confirm.                                                                                             |
| 5     | Unauthenticated transcription: retyped or re-set text (for example a forum post) | A lead only, never "verified".                                                                                 |

Rules:

- The original's reading class does not rise because a workaround was read.
- A **page-image copy** of the published pages (the journal layout, with its page numbers) is the
  original for the purpose of reading, whatever host it came from: it is read and classified as
  the source itself, not as a workaround (owner decision, 2026-11-13 UTC). Its record says that the
  copy was not the publisher file. Route 5 covers retyped or re-set text only. The repository still
  links only to the publisher or the DOI, and stores no copy.
- An abstract read on the publisher's own page is `abstract only` with no route entry; the same
  abstract obtained through a third-party index is `abstract only` and route 3.
- A number obtained through a workaround keeps that label until it is compared with the original.
- **Proposal (item 9).** Only route 1 may support `fit` or `independent validation`. A route 1 reading whose equivalence
  to the original was not checked says so (`not assessed`) in its record.

## 7. Where each fact is written

| Fact                                                     | Place                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| The vocabulary and the rules above                       | This file only.                                                                                    |
| One classification row per source                        | [sources.md](sources.md#classification-of-evidence), keyed by the source name of the index tables. |
| Parts read, parts missing, workarounds, routes not tried | The records under that table, in the same file.                                                    |
| Sources left `not finished`                              | [sources.md](sources.md#open-reading-debts).                                                       |
| The `model-derived` label and the conditions for it      | This file only (section 5).                                                                        |
| Shipped coefficients, their basis and the checks behind  | [sources.md](sources.md#findings-shipped-coefficients-and-source-roles).                           |
| Which quantity of a forecast is what kind of thing       | This file only (section 8).                                                                        |
| Table values and what a temperature means                | The `data/` file of the source, as before.                                                         |

## 8. Computed uncertainty

Owner decision, 2026-11-13 (UTC). **Principle:** everything that can be computed is computed, and
each computed quantity states what kind of thing it is, so that nothing is presented as more than
it is. The uncertainty of a forecast has four origins, each computed differently, and they are not
merged into one number without saying so:

| Origin                                                                   | Computed by                                                                                                                                                                                                                                                                                                                                                                                                             | What it is                                                                                                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| (i) The baker's inputs (for example room temperature to within a degree) | Propagation through the model                                                                                                                                                                                                                                                                                                                                                                                           | An exact sensitivity of the forecast to the input                                                                            |
| (ii) The model's coefficients                                            | Varying them within their bounds                                                                                                                                                                                                                                                                                                                                                                                        | A possible range, not a probability                                                                                          |
| (iii) The model's own error                                              | Comparing forecasts with records. What exists at this commit is the root-mean-square disagreement with prescribed published schedules (×1.89 on 50 scored recipes in 39 source groups, from a collection of 89; [fermentation-model.md, section 15](fermentation-model.md#15-predictive-uncertainty-research-2026-11-03-rerun-2026-11-06)). An observed error margin exists only once the user's own bakes are recorded | At this commit: a disagreement with published practice (craft-knowledge data). With recorded bakes: an observed error margin |
| (iv) The definition of "ready"                                           | Per definition: each readiness profile gives its own end point                                                                                                                                                                                                                                                                                                                                                          | The difference between definitions, not an error                                                                             |

A probability is shown only when it rests on real observations, that is, for origin (iii) and
only as far as recorded bakes go. The ×1.89 is **not** such a record: it is a disagreement with
prescribed published schedules, not an observed error of dough-readiness forecasts, and not a
probability distribution (its coverage is partly fitted, by construction; fermentation-model.md,
section 15). The recipes (50 scored of 89 collected) are craft-knowledge data
([craft-knowledge.md](craft-knowledge.md)): used as a plausibility check, they neither fit nor
validate a coefficient. This section is a documentation principle; the engine and interface
work is tracked in issue #287.

## Proposals beyond the owner's decision

Each waits for the owner's confirmation; none changes a model.

1. The five soundness questions, the rule that "not recorded" counts as "no", and the thresholds
   of the three labels (section 3).
2. The operational definition of the three scope classes (section 4).
3. The cap that a `weak` source cannot hold `fit` or `independent validation` (section 5).
4. The mapping of the legacy read-status labels (section 1) and the token `not assessed`.
5. The "Findings" and "Open reading debts" subsections of `sources.md` as the places where the
   coefficient rule and the merge rule are made visible.
6. The definition of home conditions (section 4), including the treatment of a closed instrument
   chamber as outside and the thermal-domain sentence (heat-transfer sources `adjacent` at best).
7. The narrowing of route 3 to an abstract obtained through a third-party index (section 6).
8. Three wordings of the reading rules: the form for a `full` reading whose record names no parts
   (section 1), the extension of `access refused` to a host the session's network policy refuses
   (section 2), and the sentence that a `full` reading may record parts read and out of scope
   (section 2).
9. The conditions on the role `fit`: in or adjacent to the domain, and read by route 1 or in the
   original (section 5); the same conditions applied to `independent validation` (the verifier's reading, applied in
   section 4).
10. The rules for taking the reading class from the reader's record (section 1: the class follows
    the record, a part named as not read makes a source `partial`, an unnamed section needs a
    reason).
11. The clarifying wording of the coefficient rule (section 5), added after the independent review
    of PR #276 (comment 6871622211): the distinction between data used to derive a coefficient
    and independent evidence used to test it, and the assessment of the four conditions for each
    coefficient separately. The decisions it restates are unchanged.

## Decided

Owner decisions of 2026-11-13 (UTC) (items 1 to 4) and 2026-11-14 (UTC) (item 5), given in chat.
Each is written once, where it is linked.

1. **The coefficient rule is relaxed** (section 5): a coefficient may rest on `fit` or
   `independent validation` sources, or, when no raw measurements exist, on another recognised
   model under four conditions, with the label `model-derived`. This settles the former open
   question on the shipped model: `A`, `k` and `Ea` of 0.1.0 are `model-derived`, provisional
   and not validated; conditions are assessed per coefficient, and `Ea` is item 5. The Proposal to read the rule as governing promotions
   only (grandfathering 0.1.0) is settled by this decision.
2. **Computed uncertainty** (section 8): four origins, each computed and labelled for what it is;
   a probability only on real observations.
3. **Craft knowledge may set an uncertainty range**, never fit or validate a coefficient
   ([craft-knowledge.md](craft-knowledge.md#craft-knowledge-and-uncertainty-ranges)).
4. **Scope is judged per cell, with a salt tolerance** (section 4; owner decision, 2026-11-13
   (UTC), provisional, open to challenge by an independent review). This settles the former
   open question on the formulation and dose tolerance (the strict reading, "option A", and the
   tolerance, "option B") and the question whether a class belongs to a source or to its cells.
   The size of a tolerance for water or for larger salt deviations is not decided.
5. **`Ea` 98.3 kJ/mol is kept as an approved provisional exception** (section 5; owner decision,
   2026-11-14 (UTC), given in chat): condition (c) is not met, the value stays "in the absence of
   better data, the imperfection is accepted", it is not claimed to satisfy the rule, and it is
   replaced when sound measurements allow. No constant changes.

## Open questions for the owner

Nothing below is decided. Each is also recorded where it arises.

1. **Not recorded dough temperature** (section 4, second open question): how a `not recorded`
   axis counts in the class of a cell, given that no cell of the Izzreen or Birch matrices reports
   the dough temperature after mixing.
2. **Heat-transfer scope** (section 4, first open question): is a fridge wall `outside` or `adjacent`
   for Williams 1994, Laguerre 2010 and, if it is read, the Lança candidate?
3. **The two Gélinas 2010 papers.** Confirm that Europe PMC records 33467828 (patents on baker's
   yeast manufacture) and 20653548 (baker's yeast storage and activation) are the papers the
   source-access guide calls 2010a and 2010b. The match is an inference from an index search.
4. **Lança et al. 2025.** The repository records only the name and year. A candidate citation
   (_Energies_ 18(23):6280, DOI 10.3390/en18236280) was proposed by the independent reviewer; its
   identity with the paper the #176 reports cited is **not established**, and it could not be
   read (publisher host refused, HTTP 403 on CONNECT, 2026-11-13 (UTC); sources.md). Confirm or
   reject the candidate, or supply the intended citation or a copy. It is no longer a
   `not finished` source; it is `access refused` for the candidate.
5. **Blind calibration of the craft-knowledge grid.** The two ratings so far were not blind
   ([craft-knowledge.md](craft-knowledge.md#calibration)); a blind one needs an agent that has not been
   shown any level.
6. **Workaround rules.** Section 6 lists four rules; confirm that they match the owner's decision
   (the verifier could not match the count).
7. **Walker, Quail and McMaster 1996** (_Cereal Foods World_ 41(3):127-133) is `not read`,
   `access refused` (publisher HTTP 403 Forbidden, 2026-11-13T15:40Z UTC; sources.md): a copy
   supplied by the owner would let it be read.
8. **Back-links from the ADRs to the science domains** (suggested by the independent review of
   PR #276, comment 6871622211; **not done**). A small "Affects: science domains ..." line in each
   governing ADR would give the reverse traceability that
   [dough-behavior.md](dough-behavior.md#architecture-decision-records) gives forward. ADR files
   were not edited and no ADR changes status. Should it be added, in what form, or left out?
