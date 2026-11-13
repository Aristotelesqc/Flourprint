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
mass; a source on heat transfer there is `adjacent` at best (**Proposal**, item 6; see open question 2 below).

**Open questions on this section (owner decision needed; neither is decided or applied).**

1. **Scope of the role-bearing rows (formulation and dose tolerance).** The rule as written judges
   the dose and the formulation against the contract's own gates: dose 0.01 to 3 % fresh-equivalent,
   salt 1.5 to 3 % (values in [fermentation.md](../contracts/fermentation.md), Domain table).
   Under it, both Izzreen rows (salt 1.4 % of flour; doses 4 and 6 %) and Birch Papers I, II and
   III (salt 1.3 %; doses 4 and 6 % in II, 20 to 120 g/kg in I, 20 to 40 g/kg in III) have two axes
   outside, so each is `outside`. Those five rows carry the only `fit` (Izzreen _Food Chem._) and
   the only `independent validation` (Birch Paper II), and `fit` needs the source in or adjacent
   to the domain (section 5); section 5 does not say whether `independent validation` needs the same
   condition, and the verifier's reading is that it does. Applying the rule as written therefore
   removes both roles.
   - **Option A.** Apply the rule as written: re-class the five rows `outside`; their roles drop
     to `none` or `order-of-magnitude check`.
   - **Option B.** Add a tolerance on the formulation axes (salt, water): a small deviation is named
     in the cell but does not move the class, and each `adjacent` cell names its one outside axis
     (for example the dose). The sizes are for the owner to choose; the verifier's 0.5 point of salt
     and 5 points of water are placeholders that show the effect, not a decision. This is a choice
     of policy with arguments on both sides, not a device to keep a role. _For:_ the contract itself treats salt and water outside their
     ranges as extrapolation flags (`ok` with `extrapolations`), not as a refusal, and says that
     salt, sugar, fat and water only gate the domain and do not change the rate (Domain table), so
     it does not treat a shortfall of 0.1 to 0.2 point of salt as a ground for refusing an estimate; the two lean
     matrices are otherwise close to the formulation the model targets. _Against:_ salt strongly
     changes gas production over 0 to 3 % (Belz 2017, Boudrag 2026), and no source in the index
     measures what 0.2 point near 1.3 to 1.5 % does to the times, so the tolerance is an assumed
     size, not a measured equivalence; any cut falls somewhere arbitrary; it would be chosen after
     seeing which rows it keeps, which the owner can avoid by fixing the size without reference to
     these rows; and it leaves the dose axis untouched, so the 4 and 6 % cells stay above the gate
     either way.

   A **per-subset analysis** of the cells that each research fit or hold-out actually uses (which
   cells, their salt, dose, temperatures, end point and container, the class of each group under
   each option, and the subset restricted to doses inside the gate) is in
   [sources.md](sources.md#role-versus-scope-the-subsets-behind-each-research-fit-or-hold-out).
   Its finding in brief: the 2 % cells (3 per matrix) are `adjacent` under A and `in domain` under
   B, but three cells at one dose cannot identify a dose exponent or run the hold-out.

   Until the owner decides, the five scope cells in [sources.md](sources.md#classification-of-evidence)
   name the axes that are outside, with their values, and say "class pending the owner's decision
   on the formulation tolerance"; the roles of those rows carry the same mark.

   **Question 1a (also the owner's).** The rule is applied to a source as a whole, one class per
   row. Whether a row may be split by group of cells, or carries the class of its worst cell, is not
   decided; it changes which roles survive option A (sources.md, Role versus scope).

2. **Heat-transfer sources.** The `outside` row above lists "a fridge wall", while the last
   sentence of the Proposal says a source on heat transfer in the thermal domain is `adjacent` at
   best. The two contradict each other for Williams 1994 and Laguerre 2010, which are
   `adjacent` in `sources.md` with the same pending mark (the Lança candidate is `not recorded`: it
   was not read). Not chosen here: either a fridge wall is
   `outside` (the sentence goes), or such a source is `adjacent` (the list entry goes).

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

**Application to the shipped 0.1.0 coefficients: undecided (open question 7).** The shipped
`A` 3.43 h, `k` 0.729 and `Ea` 98.3 kJ/mol come from a fit to a third-party model-output table
(Craig, MODEL OUTPUT; source role `none`), and no source in the index supports 98.3. Whether the
coefficient rule reaches them is not decided here. Two readings: (i) the rule governs **future
coefficient promotions**, and 0.1.0 is recorded as provisional and unvalidated (grandfathered),
its sources' roles listed as findings; (ii) the rule requires a **separate owner action on 0.1.0**
(a re-derivation, a relabelling or a replacement, each a contract change of its own). **Proposal:**
reading (i): the contract already carries 0.1.0 as `provisional`, and the findings list makes the
gap visible without touching a constant. It is a proposal only. No `fit` label is given to the
Craig table, and no constant changes here.

**Proposal.** A source whose soundness is `weak` cannot hold `fit` or `independent validation`.

**Proposal.** The conditions on `fit` in the table above: the source is in or adjacent to the
domain, and was read by route 1 or in the original (item 9). The first condition depends on open
question 1 of section 4.

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
6. The definition of home conditions (section 4), including the treatment of a closed instrument
   chamber as outside and the thermal-domain sentence (heat-transfer sources `adjacent` at best).
7. The narrowing of route 3 to an abstract obtained through a third-party index (section 6).
8. Three wordings of the reading rules: the form for a `full` reading whose record names no parts
   (section 1), the extension of `access refused` to a host the session's network policy refuses
   (section 2), and the sentence that a `full` reading may record parts read and out of scope
   (section 2).
9. The conditions on the role `fit`: in or adjacent to the domain, and read by route 1 or in the
   original (section 5); the same conditions applied to `independent validation` (section 4, open
   question 1, is the verifier's reading).
10. The rules for taking the reading class from the reader's record (section 1: the class follows
    the record, a part named as not read makes a source `partial`, an unnamed section needs a
    reason).
11. The reading of the coefficient rule as governing future coefficient promotions only, with the
    shipped 0.1.0 coefficients recorded as provisional and unvalidated (section 5; open question 7).

## Open questions for the owner

Nothing below is decided. Each is also recorded where it arises.

1. **Formulation and dose tolerance** (section 4, open question 1): option A (apply the rule as
   written; five rows `outside`; the only `fit` and the only `independent validation` drop) or
   option B (a tolerance; small salt or water deviations are named but do not move the class).
2. **Heat-transfer scope** (section 4, open question 2): is a fridge wall `outside` or `adjacent`
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
7. **Application of the coefficient rule to the shipped model** (section 5): (i) the rule governs
   future coefficient promotions and 0.1.0 is recorded as provisional and unvalidated
   (grandfathered; the agent's proposal), or (ii) it requires a separate owner action on 0.1.0.
8. **Walker, Quail and McMaster 1996** (_Cereal Foods World_ 41(3):127-133) is `not read` and
   `not finished` (sources.md, open reading debts): the owner may supply a copy or accept a
   justified status.
