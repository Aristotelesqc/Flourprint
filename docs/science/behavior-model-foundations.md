# Behavior model: foundations for predicting how a dough handles and what it becomes

This document lays the foundations of a second model: the **behavior model**. The fermentation
model ([fermentation-model.md](fermentation-model.md)) predicts _when_ a dough is ready. The
behavior model is meant to predict _how the dough handles and what it becomes_: how firm or slack
it is, how well it keeps its gas, what the crumb and crust will be like. This file holds concepts,
vocabulary, rules and open questions. It is not an implementation and not a filled knowledge base:
where the repository holds nothing, it says "no entry yet".

**Authority.** The direction comes from the owner (chat, 2026-11-13 UTC); it is listed under
[Decided](#9-decided-proposals-and-open-questions) and nothing else in this file is decided. Every
other statement is a **Proposal** for the owner, or a pointer to a rule recorded elsewhere. The
file is documentation only: it changes no model, coefficient, equation, contract, engine or screen,
and it creates no contract (`docs/contracts/` is untouched).

**As of 2026-11-13T16:35Z (UTC).** Written against PR #276 at head `2ff4631`. The issue bodies
read for section 7 are those of #27, #32, #231, #243, #275 and #287 as they stood on
2026-11-13 (UTC).

**Why this file name.** [dough-behavior.md](dough-behavior.md) already exists and uses "dough
behavior" for something wider: the map, domain by domain, of everything known about fermented
dough, including timing. This file is a model, a sibling of `fermentation-model.md`, and is named
for what it is: the foundations of the behavior model. In `dough-behavior.md` "behavior" means all
of it; in this file "behavior" is the narrower part that is not timing. The two link to each other
([the pointer in dough-behavior.md](dough-behavior.md#how-this-file-relates-to-the-behavior-model)).

## Contents

1. [Two models, two questions](#1-two-models-two-questions)
2. [Two kinds of knowledge](#2-two-kinds-of-knowledge)
3. [How they combine](#3-how-they-combine)
4. [Vocabulary of the behavior model](#4-vocabulary-of-the-behavior-model)
5. [Epistemic honesty in outputs](#5-epistemic-honesty-in-outputs)
6. [What this means in the app](#6-what-this-means-in-the-app)
7. [Relation to existing issues and documents](#7-relation-to-existing-issues-and-documents)
8. [Roadmap](#8-roadmap)
9. [Decided, proposals and open questions](#9-decided-proposals-and-open-questions)

## 1. Two models, two questions

|                        | Fermentation (timing) model                                                                                                                                                                              | Behavior model (this file)                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Question               | When is the dough ready?                                                                                                                                                                                 | How does the dough handle, and what does it become?                                                                                                         |
| Takes as input         | The yeast dose and form, the dough temperature history, the thermal situation, the readiness profile ([fermentation.md](../contracts/fermentation.md)). Water, fat, sugar and salt only gate its domain. | The formula by ingredient family and composition, the flour, and the process: mixing, order of incorporation, autolyse, folds, rest, temperature, time.     |
| Gives as output        | A time range and an end point under a stated readiness definition.                                                                                                                                       | Statements about observable properties of the dough and of the loaf: a direction and a range or an ordinal step, each with its basis and scope (section 4). |
| Evidence and contracts | Shipped, provisional, not validated; contract and engine on `dev` ([dough-behavior.md](dough-behavior.md#overview), domains 1 to 4).                                                                     | No contract, no engine, no screen. Research direction only ([14](dough-behavior.md#d14-rheology-and-structure-over-time): "long-term selected; deferred").  |
| Uncertainty            | Four computed origins ([evidence-classification.md](evidence-classification.md#8-computed-uncertainty)), a possible range and an observed error factor.                                                  | Not computed. Section 5 proposes how it is expressed.                                                                                                       |

**Where the two meet.** Most drivers act on both, and the two outputs must stay distinct:

- An enriched dough is slower and also softer. The driver (fat, milk, eggs) is the same; the
  timing effect belongs to the fermentation model and #287 section 2, the handling effect to the
  behavior model. Neither output is derived from the other.
- Gas is the shared quantity. Production of gas is timing; **retention** of gas is behavior.
  [Domain 3](dough-behavior.md#d03-co2-production-retention-and-volume) and #27 already require
  production, retention, incorporated air and baking expansion to be kept separate, and the
  salt datasets show why: production and retained gas move differently (section 3, illustration 2).
- The baker's readiness cues (poke, feel, bubbles; [domain 4b](dough-behavior.md#d04b-cues-ranges-and-live-forecast))
  are observations of behavior properties used to decide a timing question.

**Constraint from the owner's long-term direction.** The one owner direction on structure is an
integrated dough and bread state model with shared state, not independent black-box predictors
([domain 14](dough-behavior.md#d14-rheology-and-structure-over-time), owner decision of
2026-10-09). The recorded guardrails there are also binding on this file: hydration is not
mapped directly to "open crumb", and fermentation, stickiness and crumb are not independent
factors. The statements of section 4 are therefore not per-outcome multipliers. They are keyed
on shared drivers and are meant to be absorbed by a shared state, not to multiply into one
figure (section 5).

## 2. Two kinds of knowledge

Measured science and craft knowledge are both used, and both are kept apart. Each has one
authoritative place for its rules; this table contrasts them and links, it does not restate.

|                  | Measured science                                                                                                                                                                                           | Craft knowledge                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What it is       | Measurements reported by a primary source for its own experiment, with protocol and basis.                                                                                                                 | What bakers, books, courses and manufacturers say about dough ([craft-knowledge.md](craft-knowledge.md)).                                                                                                                                       |
| Good at          | Mechanism, direction under controlled conditions, numbers with a protocol, a stated error.                                                                                                                 | What the hand and eye perceive; long-fermentation and home practice; handling, taste and texture, where published science says little.                                                                                                          |
| Typical weakness | Measures one flour, one yeast, one temperature, mostly in instruments and high-dose doughs; mostly silent on handling at home doses.                                                                       | Vague quantities, one voice copied many times, no stated conditions, popular errors.                                                                                                                                                            |
| Vocabulary       | Instrument quantities and units: gas volume, retention coefficient, complex modulus, loss factor, network length.                                                                                          | What is perceived: tight, slack, springy, sticky, stretches thin, holds its shape.                                                                                                                                                              |
| How it is graded | The classification of a source: reading class, soundness, scope and role ([evidence-classification.md](evidence-classification.md)).                                                                       | Level A, B or C per claim, with the source described apart ([craft-knowledge.md](craft-knowledge.md#level-a-b-or-c)).                                                                                                                           |
| May do           | Calibrate or validate a coefficient when its role is `fit` or `independent validation` ([coefficient rule](evidence-classification.md#5-role-for-the-model)); supply a mechanism.                          | Check plausibility, give a readiness criterion, suggest a hypothesis, supply a starting value, set the direction and width of an uncertainty range as a hypothesis ([register rules](craft-knowledge.md#what-the-register-may-and-may-not-do)). |
| May never do     | Be presented with more authority than its source: a fit never carries the authority of its inputs, and a label is never upgraded by a source that was not read ([README.md](README.md#provenance-labels)). | Fit or validate a coefficient; carry a scientific role; be presented as a measurement.                                                                                                                                                          |

The two schemes are never merged into one grade: a craft statement keeps its level A, B or C, a
measured one keeps its source classification, and a statement in the behavior model carries
which of them it rests on (section 4).

## 3. How they combine

The rules below are **Proposals** unless a link says they are recorded. The decisions they
extend are the ones already in force: measurements take precedence where they exist, craft
knowledge may set the direction and width of a range as a hypothesis, and nothing from craft
knowledge fits or validates a coefficient ([craft-knowledge.md](craft-knowledge.md#craft-knowledge-and-uncertainty-ranges),
[evidence-classification.md](evidence-classification.md#5-role-for-the-model)).

1. **Measurement first, within its scope.** Where the index holds measurements of an effect, they
   set the direction and the range, within the conditions they cover (recorded rule). Outside
   those conditions the measurement is extrapolated and says so.
2. **Craft fills gaps as a hypothesis.** Where no measurement exists, craft knowledge may supply a
   direction and a range, labelled a hypothesis, with the level of each claim used (recorded
   rule). A level C claim never reaches a baker as guidance ([ceiling of use](craft-knowledge.md#level-a-b-or-c), a Proposal there).
3. **A conflict is recorded, not averaged.** When a measurement and a craft statement disagree,
   or two measurements do, the behavior statement lists both with their conditions and is marked
   as in conflict. No value between them is invented. The same holds between two measurement
   sets under different protocols.
4. **Convergence and mechanism raise the grade of a craft statement, through the grid that
   exists.** Independent craft sources that agree under comparable conditions raise the
   convergence criterion; a source whose role is `mechanism` and that explains the same direction
   raises the justification criterion ([the claim grid](craft-knowledge.md#the-claim-what-is-said)).
   The level may rise where the grid's rules allow (level A also needs precision and observable
   criteria `strong`). It never turns the statement into a
   measurement, and a mechanism source gives no number
   ([role `mechanism`](evidence-classification.md#5-role-for-the-model)). Copies are not
   convergence.
5. **A model-derived value is labelled as such.** A size taken from another recognised model, not
   from measurements or craft, carries the label `model-derived`. The four conditions of the
   [coefficient rule](evidence-classification.md#5-role-for-the-model) (label, named model and
   reason, plausibility check, replacement by measurements) are proposed to apply by analogy to
   the size of a behavior statement. No such statement exists.
6. **Nothing is silently zero.** An effect that the repository does not hold is "no entry yet",
   never "no effect". A source that found none says exactly that ("no effect detected in that
   protocol", [fermentation-model.md](fermentation-model.md#7-other-ingredient-and-process-evidence-short)),
   which is not a neutral factor of 1.0.

### Three illustrations, from what the repository records

**1. Sugar: measurements exist for gas, nothing for handling.**
Timmermans et al. 2022 measured 3-hour gas in a pastry dough at 30 °C with sucrose at 0, 6, 12
and 18 % of flour: more gas at 6 and 12 %, less at 18 %, relative to 0 %
([fermentation-model.md, section 6](fermentation-model.md#6-sugar-timmermans-2022)).
Gélinas and McKinnon 2018 (abstract only) report, in a 3-hour gas assay at 38 °C, 10 to 30 %
less gas with 6 % sucrose than without, depending on water content
([domain 6b](dough-behavior.md#d06b-effects-of-enriched-and-complex-ingredients)). Under rule 1
the measurements set the range for the gas, each within its conditions. Under rule 3 they are
not pooled: the protocols differ (dose, temperature, flour, water), and the repository does not
record whether they conflict. That is gas production, the timing model's quantity. The effect of
sugar on handling, crumb or crust has **no entry yet**, measured or craft.

**2. Salt: production and retention are different quantities, and gluten has no entry.**
Belz et al. 2017 measured total gas at 0.71 and 0.44 of the salt-free value at 1.72 and 2.87 %
of flour, and retained gas at 0.93 and 0.66. Boudrag et al. 2026 measured total gas at 0.87 to
0.91 of the salt-free value at 1.2 % of the recipe, with retention barely moving
([fermentation-model.md, section 8](fermentation-model.md#8-salt-boudrag-2026)). The two
datasets are about 2.2 to 2.4 times apart on the fall of total gas and differ in retention of the
salt-free dough (a 36 % loss against under 1 %): under rule 3 both are kept, with their
conditions, and a statement about retained gas is marked in conflict, not summarised. That
production and retention move differently is itself a finding of the measurements, and it is
why the behavior model keeps them apart. The owner's example that salt tightens the gluten is a
craft-type statement for which the register holds **no entry yet**. The repository records that
Boudrag also measured gluten aggregation (GlutoPeak) and water absorption (Farinograph),
read and judged out of scope for the fermentation model
([sources.md](sources.md#classification-of-evidence)); no values are transcribed. Transcribing
them would be a measured basis for a gluten statement; until then there is none.

**3. Fat: no measurement in the index for handling, a craft direction only.**
The only fat evidence in the index is that Timmermans found no significant effect of margarine on
sugar release or gas in the pastry experiment, "no effect detected in that protocol", and that
Gao 2025 measured dough mechanics at 0 and 3 % lipid, reported as secondary and with a title the
audit called inexact ([fermentation-model.md, section 7](fermentation-model.md#7-other-ingredient-and-process-evidence-short)).
No usable measurement on gluten formation is recorded. The direction that fat limits gluten
formation is the owner's example, and the register holds **no entry yet**. Under rule 2 a
craft entry could set a direction and a range, labelled a hypothesis with its level; under rule 1
a measurement would take precedence as soon as one is read and transcribed.

## 4. Vocabulary of the behavior model

This section is a **Proposal**. The definitions are plain-language drafts for the owner and the
craft register to correct. Where a property can also be measured by an instrument, the
correspondence between the perceived word and the instrument quantity is itself knowledge to be
recorded with a source: **no entry yet**.

### 4a. Observable properties

A baker can perceive each of these without an instrument. "How to observe at home" names a gesture
or a look, not a measurement.

| Property                   | Plain definition                                                                  | How to observe at home                                                                                |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Strength (tenacity)        | How much the dough resists being stretched or pushed.                             | Pull a piece slowly; press it with a finger.                                                          |
| Extensibility              | How far the dough stretches before it tears.                                      | Stretch a small piece; see how thin it gets.                                                          |
| Elasticity                 | How quickly and how fully the dough springs back after being pushed or stretched. | Poke it and watch the dent; release a stretched piece.                                                |
| Stickiness                 | How much the dough clings to hands, bench and tools.                              | Touch with a dry hand and see what stays on the skin.                                                 |
| Gas retention              | How well the dough keeps its gas, so that it holds its height and bubbles.        | Watch the dome and the bubbles; see whether the dough keeps its height or flattens when handled.      |
| Tolerance to over-proofing | How long past the ready point the dough still holds and still bakes well.         | Poke and watch at intervals past the expected time; note when it no longer springs back or collapses. |
| Loaf volume                | How large the loaf is after baking, for its weight.                               | Compare loaves of the same weight; compare heights.                                                   |
| Crumb openness             | How large and how even the holes of the crumb are.                                | Cut the loaf; photograph the crumb.                                                                   |
| Crust                      | Colour, thickness and crispness of the crust.                                     | Look and tap; note how it eats after cooling.                                                         |

Recording is free text: the observation categories `crumb`, `crust`, `handling` and
`volume` exist and are not consumed ([domain 14](dough-behavior.md#d14-rheology-and-structure-over-time)).
The structured capture of dough scales, loaf, crumb and crust observations is on the research
direction of #231 with no owner yet.

### 4b. Drivers

A driver is something the baker chooses or the dough contains that may change a property.

| Family      | Drivers                                                                                                                                                                                | What the repository holds as data today                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ingredients | Salt, sugar, fat, dairy, eggs, acids, malt and enzymes, fruit, nuts and seeds, inclusions: the closed family list of [ingredients.md](../contracts/ingredients.md).                    | Water, fat and sugar contents are consumed by the balances; protein, fibre, salt, pH and diastatic power are recorded, not consumed. |
| Flour       | Protein quantity and quality, whole grain or bran content, falling number, damaged starch, water absorption ([domain 9](dough-behavior.md#d09-flour-properties)).                      | The flour registry records them; no model consumes them.                                                                             |
| Water       | Hydration, arithmetic versus effective ([domain 10](dough-behavior.md#d10-effective-hydration-and-water-binding)).                                                                     | Arithmetic water is computed; effective hydration is undecided.                                                                      |
| Process     | Mixing intensity and time, order of incorporation, autolyse, folds, degassing, rest, temperature, time ([domain 12b](dough-behavior.md#d12b-mixing-autolyse-folds-degassing-shaping)). | Recorded as technique data; no duration, end or dough state is predicted ([process.md](../contracts/process.md)).                    |

Order of incorporation needs a stage-conditioned reading. Version 1 of the interactions contract
reads the formula only and says that claims conditioned on a stage need an extension and
their own contract ([interactions.md](../contracts/interactions.md#scope-of-version-1)). It is not
represented as a driver anywhere.

### 4c. The form of a behavior statement

A behavior statement is one record with these fields. This is the template to be drafted as a
contract proposal (section 8); it is not a schema.

```text
Statement: <short title>
- Driver: the ingredient family, flour property, or process variable, and the change
  (more, less, present, absent, earlier, later), with units as recorded
- Condition: the dose or level, the dough, the stage, the temperature, as stated
- Property: one of section 4a
- Direction: higher, lower, depends on the condition, none detected, or unknown
- Size: a range of ordinal steps or of the measured quantity; "not sized" when nothing supports one
- Basis: measured | craft (level A, B or C) | model-derived | hypothesis
- Scope: the doughs, flours, doses and conditions the sources cover; "outside" where extrapolated
- Sources: entries of sources.md and of the craft register
- Conflicts: the other sources that disagree, with their conditions
- Checked: UTC date (ISO), and who (a role, not a model family)
```

A range whose width is set by craft knowledge carries the basis `hypothesis`, as the owner
decision requires, and records the levels of the claims used. A direction supported by craft
claims alone carries the basis `craft` with its level.

**Example built only from repository content (a measured statement in conflict).**

```text
Statement: Salt and retained gas in a rheofermentometer dough
- Driver: sodium chloride, more
- Condition: Belz 2017: 30 °C, 2 % yeast on flour, no sugar or oil, 1.72 and 2.87 % of flour;
  Boudrag 2026: 30 °C, 2 % instant yeast, 2 % sugar, 3.2 % oil, 0 to 1.2 % of the recipe
- Property: gas retention
- Direction: lower in Belz 2017; barely changed in Boudrag 2026
- Size: not sized. Belz: retained gas 0.93 and 0.66 of the salt-free value; Boudrag: retention
  99.5 to 99.9 % at every salt level
- Basis: measured (two datasets, one flour each, one yeast, one temperature, one end point)
- Scope: those doughs only; no transfer to home doses and flours is claimed
- Sources: Belz 2017, Boudrag 2026 (sources.md); fermentation-model.md section 8
- Conflicts: the two datasets, with their conditions, are the conflict; no value between them
- Checked: not applicable: an illustration written for this file, 2026-11-13
```

**Illustrative placeholder, not knowledge.** Every value in brackets below is a placeholder to
show the fields. Nothing here is recorded by the repository or asserted.

```text
Statement: [driver] and [property]
- Driver: [ingredient family or process variable], [change]
- Condition: [dose, dough, stage, temperature]
- Property: [one of section 4a]
- Direction: [higher | lower | depends | none detected | unknown]
- Size: [a range of ordinal steps, or "not sized"]
- Basis: [hypothesis; craft level A, B or C of each claim used]
- Scope: [what the sources cover]
- Sources: [craft register entries; none yet]
- Conflicts: [none recorded | the disagreeing entries]
- Checked: [UTC date, role]
```

## 5. Epistemic honesty in outputs

The principle is already decided: everything that can be computed is computed, and each computed
quantity says what kind of thing it is ([Computed uncertainty](evidence-classification.md#8-computed-uncertainty)).
For the behavior model, the following **Proposals** apply it.

- **Ordinal steps and ranges, not invented numbers.** A prediction is a direction and a short,
  ordered scale defined by observation (for example "clearly tighter, slightly tighter, no clear
  change"), or a range of steps. A number appears only where a source measured it, with its
  conditions. The number of steps and their names are an open question.
- **A probability only from observations.** As for timing, a probability is shown only when it
  rests on recorded observations of that very property. No behavior observation is recorded in
  structured form, so none is shown. A craft-set width is a hypothesis, never a probability.
- **Two uncertainties, never merged.** The timing forecast keeps its four origins. A behavior
  prediction has its own: the basis of the statement (measured, craft level, model-derived,
  hypothesis), the disagreement between sources, the drivers the model does not represent, and
  how the property is defined (what "tight" means). They are shown apart, never summed into one
  band. A baker can read a time range and a handling cue without either being derived from the
  other.
- **No net figure from several drivers.** When several drivers act on one property (salt and
  fat on strength), the model lists the directions and the ranges per driver. #27 warns that
  independent multipliers can count one mechanism twice. No rule combines them; combining is an
  open question.
- **Silence is not "no effect".** A property with no statement shows no cue and says nothing about
  absence, as [interactions.md](../contracts/interactions.md#rules) requires for its coverage
  ("silence is never shown as all good").

## 6. What this means in the app

This section gives **principles for the UI owners**, not a screen design. Screens, components
and wording belong to the UI owners and to mockups accepted by the owner
([requirements.md](../ux/requirements.md), AGENTS.md); nothing here is a specification of them.
The owner's direction is that the display stays simple, with no data provenance thrown at someone
making a baguette, and detail available on demand, for example a bottom drawer opened from a
time range with a fan chart (#287 section 3).

- **The main flow stays simple.** The time range is as it is; no provenance, no basis label, no
  level, no source name in the main flow.
- **Behavior cues appear where they are useful,** as one short plain sentence at the moment the
  baker acts: in the step where the dough is mixed, folded, shaped or checked. A cue is shown only
  for a statement whose basis allows it: level C craft claims are never shown as guidance
  ([ceiling of use](craft-knowledge.md#level-a-b-or-c)).
- **The basis and the range are on demand.** One tap from the cue opens the detail: the range,
  and in plain words what kind of knowledge it rests on (measured, a baker's practice, a model, a
  hypothesis). Whether the sources themselves may be named there is an open question: #287 lists
  on-screen source provenance as out of scope for its own work.
- **Wording rules, as rules for copy.** No jargon. No provenance label in the main flow. Every
  string goes through message keys (L2, ADR 0009). French UI text never addresses the user:
  neither "tu" nor "vous"; instructions use the infinitive and explanations an impersonal voice
  (L1). This file contains no French UI text.
- **Estimates are not facts.** The principle of L145 and L146 holds for behavior: a cue is a
  guide, the baker's own judgement comes first, and a recorded observation overrides the model.
- **Feedback loops.** Readiness cues (#243) are observations of behavior properties; if
  the baker records them in a structured form, they are the first observations the behavior model
  could be compared with. Personal measurements (#275: temperature and mixer friction)
  feed a personal layer and never a universal statement, in line with the decision that an N = 1
  bake never rewrites a constant ([domain 16a](dough-behavior.md#d16a-recording-personal-learning-and-global-refit)).
  Any such capture needs the owner's accepted mockup.

## 7. Relation to existing issues and documents

What each already covers, overlaps and leaves open, as found in the bodies read on 2026-11-13
(UTC).

| Issue | Already covers                                                                                                                                                                                                                                                                      | Gaps for the behavior model                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #27   | Ingredient interactions "beyond the water balance": fermentation, structure, incorporation, aeration, baking behavior. Three kinds of results (balances, qualitative analysis, quantitative predictions). Contract `interactions.md` (proposed, formula only, no process, no code). | No statement about handling properties. Version 1 reads no process. Its source records (`docs/science/interactions.md`) do not exist. Quantitative effects wait for gates. |
| #32   | Mixing and kneading as process knowledge: methods and parameters, suggested durations, end criteria (windowpane, target dough temperature), friction heat. Status backlog, later; "no contract change until the model is designed".                                                 | Process effects on the dough's properties (what mixing does to strength) are not stated; it names durations and end criteria, not behavior.                                |
| #287  | Computed uncertainty (read model, bands by origin), enriched families with a direction and a range on the forecast, the fan chart in a drawer, and section 4: dough behavior as a later direction, salt, fat and order of incorporation named.                                      | Section 4 states a goal and no structure: no vocabulary, statement form or combination rule. Backlog, later.                                                               |
| #231  | The research direction: rheology, crumb, flavour, proteolysis and baking outputs (owner: none yet); the shared-state rule; fidelity levels 1 to 4; the structured dogfood observation list (owner: none yet); the one owner direction of an integrated state model (2026-10-09).    | No owner for the structure work; items are "not owner-approved unless stated".                                                                                             |
| #243  | The live forecast and the readiness cues per step, as an estimate; L145 and L146. "Out: new engine work".                                                                                                                                                                           | Cues are about timing; no behavior cue and no structured capture of what the baker perceives.                                                                              |
| #275  | Personal calibration from Preparation measurements, mixer friction first; the personal layer.                                                                                                                                                                                       | Temperature and friction only; the interface for entering measurements is out of its scope; no behavior observation.                                                       |

**Overlap to flag: #287 against #27 and #32.** #287 section 2 (the effect of enriched families,
with a range) and section 4 (salt, fat, order of incorporation) cover ground that #27's
description already names ("structure, incorporation, aeration"), and the process drivers of
section 4 are #32's subject (mixing, autolyse, folds). The three issues do not say which one holds
the behavior statements.

**Proposed division of scope (a Proposal for the owner).**

- **#27** keeps the formula side: composition balances, model applicability, and the findings
  about which mechanisms may act on a given formula, with their source records. It is the natural
  home of the question "which behavior statements apply to this formula".
- **#32** keeps the process side: the methods, parameters, durations and end criteria, and the
  representation of the process drivers that a behavior statement reads (mixing intensity and
  time, order of incorporation), including the stage-conditioned extension that
  `interactions.md` says is needed.
- **#287** keeps the representation of uncertainty (the read model, bands by origin, the drawer)
  and the timing effect of enriched families. Its section 4 becomes a pointer to this file until
  the owner decides.
- **This file** holds what none of them defines: the vocabulary, the statement form, the
  combination rules and the honesty rules. Whether the statement schema and the register fill
  need an issue of their own is for the owner (open question 3).

### Mapping to the domains of dough-behavior.md

A Proposal, read from each domain's own definition in [dough-behavior.md](dough-behavior.md#domains).

| Role in the two models | Domains                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Timing                 | [1a](dough-behavior.md#d01a-yeast-dose-and-form), [1b](dough-behavior.md#d01b-yeast-strain-viability-lag-biomass), [2a](dough-behavior.md#d02a-kinetic-temperature-response), [2b](dough-behavior.md#d02b-cold-end-and-long-refrigeration), [2c](dough-behavior.md#d02c-dough-temperature-history-and-recording), [2d](dough-behavior.md#d02d-physical-dough-thermal-model-and-self-heating), [4a](dough-behavior.md#d04a-readiness-profiles-and-end-point), [12a](dough-behavior.md#d12a-water-temperature-and-friction), [13](dough-behavior.md#d13-geometry-vessel-and-core-versus-mean)                                                                                                                                                                                                                                    |
| Behavior               | [8](dough-behavior.md#d08-enzymes-and-substrates) (stickiness, crumb), [9](dough-behavior.md#d09-flour-properties), [10](dough-behavior.md#d10-effective-hydration-and-water-binding), [14](dough-behavior.md#d14-rheology-and-structure-over-time), [15](dough-behavior.md#d15-baking-transitions-interface)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Both                   | [3](dough-behavior.md#d03-co2-production-retention-and-volume) (production is timing, retention and volume are behavior), [4b](dough-behavior.md#d04b-cues-ranges-and-live-forecast), [5](dough-behavior.md#d05-humidity-evaporation-skin-and-water-activity) (water activity is timing, skin is behavior), [6a](dough-behavior.md#d06a-ingredient-composition-accounting), [6b](dough-behavior.md#d06b-effects-of-enriched-and-complex-ingredients), [7](dough-behavior.md#d07-salt), [11](dough-behavior.md#d11-preferments-levain-scald-soaker), [12b](dough-behavior.md#d12b-mixing-autolyse-folds-degassing-shaping), [16a](dough-behavior.md#d16a-recording-personal-learning-and-global-refit), [16b](dough-behavior.md#d16b-data-export), [17](dough-behavior.md#d17-intervals-provenance-out-of-domain-and-promotion) |

## 8. Roadmap

A Proposal: an order, not a schedule. Each step names what it produces and what it needs. Every
step that changes a contract goes through its own pull request, contract first.

1. **Fill the craft-knowledge register broadly** (books, courses, recipes). Produces entries
   under the existing [template](craft-knowledge.md#entry-template), each with a level and its
   subject. Needs: the copyright rule ([no long excerpts](craft-knowledge.md#copyright)), a list of
   sources chosen by the owner, access to them, independence of voices recorded, and a decision on
   whether the entry template gains a field for the property and the driver (open question 8).
   The levels depend on a grid that is itself awaiting the owner's confirmation.
2. **Draft the behavior-statement schema as a contract proposal.** Produces a proposed contract
   with independent hand-worked examples, following the contract-change workflow. Needs: the
   owner's answers to open questions 2, 4, 5 and 7, and the divided scope of section 7.
3. **Uncertainty and enriched ingredients (#287).** Produces the uncertainty read model and the
   effect of enriched families on the forecast, with ranges. Needs: the contract first, the
   mockup accepted by the owner, and the gates of
   [fermentation-model.md](fermentation-model.md#12-open-questions-and-promotion-gates) for any
   change to the model.
4. **First behavior statements.** Produces a first set, each with a basis and a range: the
   measured ones the repository can support (retained gas and salt; the effect of yeast on
   the dough modulus read in Verheyen, [domain 14](dough-behavior.md#d14-rheology-and-structure-over-time))
   and the craft ones the register will hold after step 1. Needs steps 1 and 2.
5. **Home observation capture.** Produces structured observations of the properties of section 4a
   from the baker's cues and from the loaf. Needs: the owner's accepted mockup, the #243 cues in
   the app, the personal layer of #275, and a contract for the observation record. Only these
   observations could ground a probability or an observed error for the behavior model.

## 9. Decided, proposals and open questions

### Decided

Owner direction, chat, 2026-11-13 (UTC), recorded here as such; and the decisions already
recorded elsewhere, linked and not restated.

1. Flourprint should predict a dough as well as an expert baker. Beyond when it is ready (the
   fermentation model), it should in the long term predict how the dough behaves: for example salt
   tightening the gluten, fat limiting gluten formation, the effect of the order of incorporation
   (owner direction, 2026-11-13 UTC).
2. A broad forecast that owns its uncertainty is preferred to a model with no useful predictive
   power. It is to be modelled even where the basis is not peer-reviewed science (owner direction,
   2026-11-13 UTC).
3. Compute as much as possible, with maximal epistemic honesty: each computed quantity states what
   kind of thing it is (owner direction, 2026-11-13 UTC; recorded in
   [evidence-classification.md](evidence-classification.md#8-computed-uncertainty)).
4. The display stays simple: no data provenance thrown at someone making a baguette; detail on
   demand, for example a bottom drawer opened from a time range with a fan chart (owner direction,
   2026-11-13 UTC; the mockup comes first, #287).
5. The review shows how craft knowledge and science interact, how they complement each other, how
   they are kept separate, and what this means in the app (owner direction, 2026-11-13 UTC).
6. Already recorded: craft knowledge may set the direction and width of an uncertainty range as a
   hypothesis, never fit or validate a coefficient, and measurements take precedence
   ([craft-knowledge.md](craft-knowledge.md#craft-knowledge-and-uncertainty-ranges)); a model
   coefficient may rest on measurements or, under four conditions, on another model
   ([coefficient rule](evidence-classification.md#5-role-for-the-model)); the integrated state
   model is the long-term direction and an N = 1 bake calibrates a personal layer only
   ([domain 14](dough-behavior.md#d14-rheology-and-structure-over-time),
   [16a](dough-behavior.md#d16a-recording-personal-learning-and-global-refit)); the app gives
   subjective readiness criteria and says what the model predicts
   ([decisions](dough-behavior.md#decisions-recorded-once-applying-to-every-domain)); French UI text
   never addresses the user ([AGENTS.md](../../AGENTS.md), L1).

### Proposals

All of this file other than the list above. In short:

- The file name and its place (top of this file).
- The combination rules 1 to 6 of section 3, in particular that convergence and a mechanism
  source raise a craft level through the existing grid, and that a conflict is recorded.
- The vocabulary of section 4: the observable properties, the driver families, the form of a
  behavior statement and its basis field.
- The expression of uncertainty in section 5: ordinal steps and ranges, probability only from
  observations, two uncertainties kept apart, no net figure from several drivers.
- The principles of section 6, as input for the UI owners.
- The division of scope between #27, #32 and #287, and the mapping to the domains of
  `dough-behavior.md`.
- The roadmap of section 8.

### Open questions for the owner

Nothing below is decided.

1. **The grade of a craft statement.** The grid that rates craft claims (levels A, B, C, the
   ceiling of use) is itself a set of Proposals awaiting confirmation, and its blind calibration
   has not been run ([craft-knowledge.md](craft-knowledge.md#calibration)). Confirm it before
   behavior statements rely on it, or accept the dependency.
2. **Where statements live.** A new contract file, or an extension of `interactions.md`, whose
   source records (`docs/science/interactions.md`) do not exist
   ([known inconsistency I-14](dough-behavior.md#known-inconsistencies-logged-not-fixed-here)).
3. **Who owns the behavior statements.** An extension of #27, a new issue for the schema and the
   register fill, or a section of #287 (section 7 gives a division of scope).
4. **The ordinal scale.** How many steps, and which names, so that a baker can tell them apart by
   observation.
5. **Source names on demand.** May the on-demand view name sources, or only the kind of basis
   (#287 puts on-screen source provenance out of its scope)?
6. **Several drivers on one property.** What may be shown when salt, fat and flour all act on
   strength, without counting one mechanism twice.
7. **Craft words and instrument quantities.** Whether and how the correspondence between a
   perceived property and an instrument quantity is recorded, with a source (no entry yet).
8. **The register template.** Whether entries about behavior need fields for the property and the
   driver, beyond the subject anchor of the template.
9. **Order of incorporation.** Whether the stage-conditioned extension of the interactions contract
   is the way to represent it, and who writes it (#27 or #32).
10. **When statements are absorbed.** How the statements of this file give way to the shared-state
    model of the long-term direction, and what happens to their records.
