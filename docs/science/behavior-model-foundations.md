# Behavior model: foundations for predicting how a dough handles and what it becomes

## Summary

- **Two models.** The fermentation model ([fermentation-model.md](fermentation-model.md)) says
  _when_ a dough is ready. The behavior model, laid out here, is meant to say _how the dough
  handles and what it becomes_: firm or slack, how well it keeps gas, crumb, crust. It has no
  contract, engine or screen yet.
- **Two kinds of knowledge.** Measured science (a source's own experiment, with protocol) and
  craft knowledge (what bakers and books say, graded A, B or C). Each keeps its own grading and
  rules; they are never merged into one grade or one number.
- **How they combine, in one sentence.** Measurements set direction and size within the
  conditions they cover, craft fills gaps as a labelled hypothesis, a disagreement is recorded and
  never averaged, and what the repository does not hold is "no entry yet", never "no effect".
- **The app principle.** The main flow stays simple and carries no provenance; the range and the
  kind of knowledge are one tap away; where no statement exists the app says so (section 6).
- **Status.** Only the owner direction in [section 9](#9-decided-proposals-and-open-questions) is
  decided; the rest is a **Proposal** or a pointer to a recorded rule. Documentation only: no
  model, contract, engine or screen changes.

**As of 2026-11-13T19:37Z (UTC).** Revised against PR #276 at head `df468c8`; the issue bodies read for
section 7 are those of #5, #26, #27, #28, #32, #231, #243, #275 and #287 as they stood on
2026-11-13 (UTC).

**File name.** [dough-behavior.md](dough-behavior.md) maps all of fermented dough, timing
included; here "behavior" is the part that is not timing. The role of each domain (timing,
behavior or both) is listed in
[dough-behavior.md](dough-behavior.md#roles-of-the-domains-in-the-two-models).

## Contents

1. [Two models, two questions](#1-two-models-two-questions)
2. [Two kinds of knowledge](#2-two-kinds-of-knowledge)
3. [How they combine](#3-how-they-combine)
4. [Vocabulary and the form of a statement](#4-vocabulary-and-the-form-of-a-statement)
5. [Epistemic honesty in outputs](#5-epistemic-honesty-in-outputs)
6. [What this means in the app](#6-what-this-means-in-the-app)
7. [Relation to existing issues and documents](#7-relation-to-existing-issues-and-documents)
8. [Roadmap](#8-roadmap)
9. [Decided, proposals and open questions](#9-decided-proposals-and-open-questions)

## 1. Two models, two questions

|             | Fermentation (timing) model                                                                                                   | Behavior model (this file)                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Question    | When is the dough ready?                                                                                                      | How does the dough handle, and what does it become?                                                                        |
| Input       | Yeast, temperature history, readiness profile ([fermentation.md](../contracts/fermentation.md)); other contents only gate it. | The formula by ingredient family, the flour, the process.                                                                  |
| Output      | A time range and an end point under a stated readiness definition.                                                            | Statements about observable properties: a direction and a range or ordinal step, with basis and scope (section 4).         |
| Status      | Shipped, provisional, not validated.                                                                                          | No contract, engine or screen; a research direction ([domain 14](dough-behavior.md#d14-rheology-and-structure-over-time)). |
| Uncertainty | Four computed origins ([evidence-classification.md](evidence-classification.md#8-computed-uncertainty)).                      | Not computed; section 5 proposes how it is expressed.                                                                      |

**Where the two meet.** A driver such as fat, milk or eggs may bear on both questions. The
repository records a craft direction for timing only (#287 section 2, a hypothesis, no entry in
the craft register) and nothing for handling (no entry yet). The timing effect belongs to the
fermentation model and #287 section 2, the handling effect to the behavior model; neither output
is derived from the other. Gas is the shared quantity: production is timing, **retention** is
behavior, and [domain 3](dough-behavior.md#d03-co2-production-retention-and-volume) and #27
require production, retention, incorporated air and baking expansion to be kept separate.

**Guardrails (Proposal: followed here).** The owner direction on structure is an integrated state
model ([domain 14](dough-behavior.md#d14-rheology-and-structure-over-time), 2026-10-09). The
guardrails recorded there come from an issue comment, not an owner decision: hydration is not
mapped directly to "open crumb", and fermentation, stickiness and crumb are not independent
factors. Statements here are keyed on shared drivers, not per-outcome multipliers.

## 2. Two kinds of knowledge

Each kind has one authoritative place for its rules; this table contrasts and links.

|                    | Measured science                                                                                                            | Craft knowledge                                                                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What it is         | A source's own measurements, with protocol and basis. Vocabulary: gas volume, retention coefficient, modulus.               | What bakers, books and manufacturers say ([craft-knowledge.md](craft-knowledge.md)). Vocabulary: tight, slack, springy, sticky.                                                                                                                         |
| Strength, weakness | Mechanism, controlled direction, stated error; but one flour and yeast, high doses, silent on handling at home.             | The hand and eye, home practice, handling; but vague quantities, copied voices, unstated conditions.                                                                                                                                                    |
| Graded by          | Reading class, soundness, scope, role ([evidence-classification.md](evidence-classification.md)).                           | Level A, B or C per claim ([craft-knowledge.md](craft-knowledge.md#level-a-b-or-c)).                                                                                                                                                                    |
| May do             | Calibrate or validate a coefficient when its role is `fit` or `independent validation`; supply a mechanism.                 | Check plausibility, give a readiness criterion, suggest a hypothesis, supply a starting value (last three: Proposals there), set the direction and width of a range as a hypothesis ([rules](craft-knowledge.md#what-the-register-may-and-may-not-do)). |
| May never do       | Carry more authority than its source: no label is upgraded by a source not read ([README.md](README.md#provenance-labels)). | Fit or validate a coefficient; carry a scientific role; be presented as a measurement.                                                                                                                                                                  |

A statement in the behavior model says which of the two it rests on (**Proposal**, section 4).

## 3. How they combine

Recorded already: measurements take precedence, craft may set the direction and width of a range
as a hypothesis, nothing from craft fits or validates a coefficient
([craft-knowledge.md](craft-knowledge.md#craft-knowledge-and-uncertainty-ranges),
[evidence-classification.md](evidence-classification.md#5-role-for-the-model)). The rules extend
them and are **Proposals** except where marked recorded.

1. **Measurement first, within its scope** (recorded). Outside its conditions it is extrapolated
   and says so.
2. **Craft fills gaps as a hypothesis** (recorded), with the level of each claim used. That a
   level C claim never reaches a baker as guidance is a Proposal in
   [craft-knowledge.md](craft-knowledge.md#level-a-b-or-c).
3. **A conflict is recorded, not averaged.** Both sources are listed with their conditions and
   the statement is marked in conflict; no value between them is invented. This holds between two
   measurement sets under different protocols as well.
4. **Convergence and mechanism raise a craft grade through the existing grid**
   ([claim grid](craft-knowledge.md#the-claim-what-is-said)). The statement never becomes a
   measurement, a mechanism source gives no number, and copies are not convergence. Keeping the
   statements keyed on shared drivers is what lets a later shared state absorb them.
5. **A model-derived size is labelled** `model-derived`, with the four conditions of the
   [coefficient rule](evidence-classification.md#5-role-for-the-model) applied by analogy. No such
   statement exists.
6. **Nothing is silently zero.** An effect not held is "no entry yet". A source that found none
   says exactly that ("no effect detected in that protocol",
   [fermentation-model.md](fermentation-model.md#7-other-ingredient-and-process-evidence-short)),
   which is not a factor of 1.0.

Worked statements: [4d](#4d-four-worked-statements).

## 4. Vocabulary and the form of a statement

A **Proposal**: plain-language drafts for the owner and the craft register to correct. The
correspondence between a perceived word and an instrument quantity is itself knowledge to record
with a source: no entry yet.

### 4a. Observable properties

| Property                   | Plain definition                                                       | Proposed gesture (no register entry yet)                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Firmness                   | How much the dough resists being stretched or pushed.                  | Pull a piece slowly; press with a finger. Tenacity versus strength (W, P/L) is left to the register.                                              |
| Extensibility, elasticity  | How far it stretches before tearing; how fully it springs back.        | Stretch a small piece; poke and watch the dent.                                                                                                   |
| Stickiness                 | How much it clings to hands and bench.                                 | Touch with a dry hand; see what stays.                                                                                                            |
| Visible volume             | How high it stands, and whether it keeps its height when handled.      | Watch the dome and bubbles: a proxy for visible volume only.                                                                                      |
| Gas retention              | How much of the gas produced it keeps.                                 | Not observable directly at home ([domain 3](dough-behavior.md#d03-co2-production-retention-and-volume) keeps it apart from volume). No entry yet. |
| Tolerance to over-proofing | How long past ready it still bakes well.                               | Needs a second piece deliberately baked late; poking only shows when it stops springing back.                                                     |
| Aeration                   | Air incorporated mechanically (whipped or beaten ingredients).         | A phenomenon of [interactions.md](../contracts/interactions.md); no gesture recorded.                                                             |
| Loaf volume, crumb, crust  | Size for its weight; size and evenness of holes; colour and crispness. | Compare loaves of equal weight; cut and photograph; look, tap, taste cooled.                                                                      |

### 4b. Drivers

| Family              | Drivers                                                                                                                                                                                                                                   | Held as data today                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingredients         | The 16 families of [ingredients.md](../contracts/ingredients.md): water, salt, leaven, sugar, fat, dairy, egg, fruit, nutSeed, inclusion, malt, acid, flavouring, liquid, other, unknown. Not yet considered: leaven, liquid, flavouring. | Water, fat and sugar contents feed the balances; protein, fibre, salt, pH and diastatic power are recorded, not consumed.                            |
| Flour               | Protein quantity and quality, bran, falling number, damaged starch, water absorption ([domain 9](dough-behavior.md#d09-flour-properties)).                                                                                                | The registry records protein, ash, falling number, W, P/L and `malted`; damaged starch, water absorption and bran have no field. No model uses them. |
| Water, preparations | Hydration (arithmetic versus effective); scald, soaker, tangzhong, whipped ([domain 10](dough-behavior.md#d10-effective-hydration-and-water-binding), [11](dough-behavior.md#d11-preferments-levain-scald-soaker)).                       | Arithmetic water is computed; effective hydration is undecided.                                                                                      |
| Process, shaping    | Mixing, autolyse, folds, degassing, shaping, rest, temperature, time ([domain 12b](dough-behavior.md#d12b-mixing-autolyse-folds-degassing-shaping)).                                                                                      | Technique data and per-step incorporations ([process.md](../contracts/process.md#incorporations)); no dough state is predicted.                      |
| Baking              | Oven temperature, steam, bake time ([domain 15](dough-behavior.md#d15-baking-transitions-interface), #28).                                                                                                                                | Outside this file; no entry yet.                                                                                                                     |

**Order of incorporation** is recorded as per-step incorporations in the process graph
([process.md](../contracts/process.md#incorporations)); no rule reads it. Version 1 of the
interactions contract reads the formula only; stage-conditioned claims need an extension and
their own contract ([interactions.md](../contracts/interactions.md#scope-of-version-1)).

### 4c. The form of a behavior statement

The template to be drafted as a contract proposal (section 8), not a schema.

```text
Statement: <short title>
- Driver / Condition: the family, flour property or process variable and the change; its dose
  or level and the stage, as the source states them
- Property: one of 4a
- Direction: higher, lower, depends, none detected, unknown. Direction basis: measured |
  craft (level A, B or C) | model-derived | hypothesis
- Size: ordinal steps or the measured quantity, or "not sized". Size basis: as above
- Scope: the doughs, flours, temperatures and end points the sources cover; "outside" if extrapolated
- Not represented: drivers of this property the model does not carry
- Definition used: how the property is defined or observed
- Sources / Conflicts: entries used; sources that disagree, with their conditions
- Checked: UTC date (ISO) and a role, not a model family
```

Direction and size have separate bases: craft may give one, a measurement the other. **Basis and the README labels:** every number here carries one
[README provenance label](README.md#provenance-labels); `Basis` classes the statement. A value
read from a source is MEASURED, a ratio computed here is DERIVED ("our division"), a size taken
from another model is `model-derived` (the coefficient rule's label). `craft` and `hypothesis`
have no README label: the register's levels apply.

### 4d. Four worked statements

Built only from repository content, written for this file on 2026-11-13 (UTC), so `Checked` is
omitted. Ratios are DERIVED from MEASURED values.

**1. Measurements, partly in conflict (salt).** Recomputed from `data/belz-2017-salt.csv` and
`data/boudrag-2026-salt.csv`.

```text
Statement: Salt, gas retained and retention coefficient (rheofermentometer doughs)
- Driver / Condition: sodium chloride, more. Belz 2017: 1.72 and 2.87 % of flour. Boudrag 2026:
  1.2 % of the recipe (1.8 to 2.0 % of flour)
- Property: gas retained (volume) and retention coefficient: two distinct quantities
- Direction: retained volume lower in both. Coefficient higher with salt in Belz (64.1 %
  salt-free, 97.0 % at 2.87 %), flat in Boudrag (99.5 to 99.9 %). Basis: measured
- Size: retained volume 0.93 and 0.66 of the salt-free value (Belz), 0.87 to 0.92 (Boudrag, three
  flours). Total gas 0.71 and 0.44 (Belz), 0.87 to 0.91 (Boudrag). Basis: measured, ratios DERIVED
- Scope: Belz one flour, no sugar or oil; Boudrag three flours, 2 % sugar, 3.2 % oil; both 30 C,
  2 % yeast, one end point. No transfer to home doses is claimed
- Not represented: flour, sugar, oil, water (Belz lowers water as salt rises)
- Definition used: instrument quantities, not a handling cue
- Sources / Conflicts: fermentation-model.md section 8. In conflict on the coefficient (Belz's
  duration is inconsistent in the paper: 90 min or 3 h). On total gas at about 1.7 to 2.0 % of
  flour Belz falls 0.29, Boudrag 0.13 (white), 0.12 (fibre), 0.09 (wholemeal): 2.3, 2.4 and 3.5
  times apart
```

Belz shows production and retention moving differently (total gas 0.71, retained 0.93,
coefficient rising); Boudrag shows them moving together. The owner's example that salt tightens
the gluten has no register entry; Boudrag's gluten aggregation and water absorption are read but
not transcribed ([sources.md](sources.md#classification-of-evidence)), so no measured basis yet.

**2. Opposite directions under different protocols (sugar).**

```text
Statement: Sucrose and gas produced (a timing quantity; handling has no entry yet)
- Driver / Condition: sucrose, more; 6 % in both protocols
- Property: gas produced, not a handling property. Handling, crumb, crust: no entry yet
- Direction: opposite. Timmermans 2022: 1.888 of the 0 % value (measured). Gélinas and McKinnon
  2018: 10 to 30 % less gas (abstract only, route 3)
- Size: Timmermans 1.888, 1.462, 0.874 at 6, 12, 18 %; measured, ratios DERIVED. Gélinas: conclusions
  only, no number usable for a coefficient; not sized
- Scope: Timmermans: pastry dough, 30 C, 7 % fresh yeast, 3 h. Gélinas: 38 C, 3 h; its abstract
  also says gas was constant up to 6 % for white flour adjusted for diastatic activity
- Not represented: yeast dose and flour, which differ
- Definition used: 3-hour cumulative gas
- Sources / Conflicts: fermentation-model.md section 6; domain 6b. The two are in conflict at
  6 % (rule 3) and not pooled
```

**3. A gap, with a craft direction only (fat).**

```text
Statement: Fat and handling
- Driver / Condition: fat, more; none recorded
- Property: none of 4a has an entry
- Direction: unknown. That fat limits gluten formation is the owner's example, not a register
  entry. Basis: none; under rule 2 a craft entry could give one as a hypothesis
- Size, Scope, Not represented, Definition used: none; nothing is held
- Sources / Conflicts: none for handling. Gao 2025 measured dough mechanics at 0 and 3 % lipid
  (no row in the sources.md classification; secondary in domain 14; the report's title is
  inexact); not transcribed. A report on Timmermans records no significant effect of margarine
  on sugar release or gas, with the note that the gas experiment had no margarine
  ("no effect detected in that protocol", not 1.0)
```

For other drivers the repository does hold handling-adjacent measurements: stickiness (Liu 2023)
and loaf height and width (Klupsaite 2023) in
[fermentation-model.md](fermentation-model.md#7-other-ingredient-and-process-evidence-short), and
the effect of yeast dose on complex modulus and loss factor (Verheyen) in
[domain 14](dough-behavior.md#d14-rheology-and-structure-over-time) and
[data/verheyen-2015.md](data/verheyen-2015.md). A measurement on fat would take precedence
(rule 1) once read and transcribed.

**4. Craft and science in one statement (a placeholder).** No real case exists yet: the craft
register holds no entry about handling, so the craft half is a placeholder (square brackets). The
measured half is quoted from domain 14. An illustration of the form, not knowledge.

```text
Statement: Yeast dose and firmness of the dough after kneading
- Driver / Condition: yeast, more; 0.5 to 2.0 g dry yeast per 100 g flour
- Property: firmness
- Direction: [placeholder: a craft direction, e.g. "softer by the end of the rest"]. Basis:
  [craft, level and source to be recorded; none exists]
- Size: complex modulus lower by 20 to 50 %, loss factor higher by up to 57 %, right after
  kneading. Basis: measured (Verheyen). The craft claim would supply the direction and the
  gesture, the measurement the size and the mechanism
- Scope: Verheyen: one flour, 30 C, rheometer. Whether a hand feels it: no entry yet
- Not represented: flour, mixing, time after kneading
- Definition used: instrument modulus; the perceived word is a placeholder
- Sources / Conflicts: [craft entry: none]; data/verheyen-2015.md. None recorded
```

## 5. Epistemic honesty in outputs

Decided: everything that can be computed is computed, and each computed quantity says what kind of
thing it is ([computed uncertainty](evidence-classification.md#8-computed-uncertainty)). These
**Proposals** apply it to the behavior model.

- **Ordinal steps and ranges, not invented numbers.** A number appears only where a source
  measured it, with its conditions. Number and names of steps: open question 4.
- **A probability only from observations** of that very property. None is recorded in structured
  form, so none is shown; a craft-set width is a hypothesis, never a probability.
- **Two uncertainties, never merged.** Timing keeps its four origins. A behavior statement has its
  own: its basis, disagreement between sources, `Not represented` and `Definition used`. They are
  shown apart and never summed into one band.
- **No net figure from several drivers** (#27 warns that multipliers can count one mechanism
  twice): open question 6. **Silence is not "no effect"**
  ([interactions.md](../contracts/interactions.md#rules)).

## 6. What this means in the app

Everything in this section is a **Proposal**, except the owner direction in the next paragraph.
Screens, components and copy belong to the UI owners and to mockups accepted by the owner
([requirements.md](../ux/requirements.md)); nothing here specifies them.

**Owner direction (2026-11-13 UTC).** The display stays simple, with no data provenance thrown at
someone making a baguette, and detail on demand, for example a bottom drawer opened from a time
range with a fan chart (#287 section 3).

- **Main flow.** The time range as it is. A behavior cue is one short plain sentence at the step
  where the baker acts, shown only for a statement whose basis allows it; no provenance, label,
  level or source name.
- **On demand.** One tap opens the range and, in plain words, the kind of knowledge it rests on.
  That basis wording is itself provenance; whether it belongs in the drawer is open question 5
  (#287 puts on-screen source provenance out of its scope).
- **Rules for copy** (recorded: L1, L2 in [requirements.md](../ux/requirements.md)). No jargon;
  message keys; French UI text never addresses the user. This file contains no French UI text.
- **Estimates are not facts** (L145, L146): a cue is a guide, the baker's judgement comes first,
  and a recorded observation overrides the model.

### Illustration, not wording: salt at the mixing step

A Proposal describing behavior, not a screen. No statement about salt and firmness exists today,
so (c) is what a baker would see now.

- **(a) Main flow.** At the mixing step, one short plain sentence about what to expect from the
  dough (the owner's example is salt tightening the gluten). No provenance, no scale.
- **(b) On demand.** One tap opens the expected direction; a range in ordinal steps, drawn as a
  short ordered scale with the plausible span marked (no time axis, so no fan chart, and no
  number unless a source measured one); and the kind of knowledge it rests on (measured, a
  baker's practice, a model, a hypothesis), flagged as open question 5.
- **(c) No entry.** The main flow shows nothing for this driver. If the baker asks, the detail
  says the app holds no statement about it, never "no effect": a blank must not read as all good.
- **(d) Timing and behavior side by side.** The detail has two parts: what the fermentation model
  says about the time range, and what the behavior statement says about handling. Each has its own
  uncertainty and its own empty state; there is no combined badge, figure or band.
- **(e) The baker's observation.** The baker may record what they perceived at the step (needs an
  observation contract and an accepted mockup; the readiness cues of #243 are the nearest
  capture). It overrides the cue for that baker only and feeds a personal layer, as personal
  measurements do in #275; it never rewrites a universal statement
  ([domain 16a](dough-behavior.md#d16a-recording-personal-learning-and-global-refit)).

## 7. Relation to existing issues and documents

As found in the issue bodies read on 2026-11-13 (UTC). The last column is the **Proposed
division of scope**; the overlaps it settles are #287 section 4 against #27 and #32, and
stage-conditioned analysis, which #27 already lists and #32 does not cover.

| Issue | Covers                                                                                                                                   | Gap, and proposed role                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| #5    | The process graph and per-step incorporations.                                                                                           | Recorded, no rule reads it. Keeps recording incorporations.                                               |
| #26   | The manual and flour registries.                                                                                                         | Properties recorded, not consumed. Keeps the registries; #27 the consumption.                             |
| #27   | Interactions beyond the water balance (structure, incorporation, aeration, baking behavior); remaining work: stage-conditioned analysis. | Formula only in version 1. Keeps the formula side and the stage-conditioned extension.                    |
| #28   | Oven and cooking: equipment, multi-phase baking.                                                                                         | No crust, crumb or baking-output statement. Keeps oven and baking.                                        |
| #32   | Mixing and kneading: speed, time, folds, interval, autolyse, end criteria. Backlog, later.                                               | No effect on dough properties; "no contract change until the model is designed". Keeps mixing and folds.  |
| #231  | Research direction, shared-state rule, structured observation list (owner: none yet).                                                    | "Not owner-approved unless stated"; no owner for the structure work.                                      |
| #243  | The live forecast and readiness cues. "Out: new engine work, unless a read model is missing".                                            | Timing cues only; no behavior cue or capture.                                                             |
| #275  | Personal calibration from Preparation measurements, mixer friction first.                                                                | Temperature and friction only.                                                                            |
| #287  | Computed uncertainty, enriched families, the drawer; its section 4 states this file's goal and names the craft register.                 | No vocabulary or combination rule. Keeps uncertainty and timing effects; its section 4 becomes a pointer. |

**Open, no owner:** structured capture of observations (roadmap step 5), and crust, crumb and
baking outputs beyond #28's equipment scope. **This file** holds vocabulary, statement form,
combination and honesty rules; whether the schema and register fill need an issue is open
question 3.

## 8. Roadmap

A Proposal: an order, not a schedule; each contract change has its own pull request, contract
first.

1. Fill the craft register ([template](craft-knowledge.md#entry-template)): needs a source list
   from the owner and a decision on fields for property and driver (open question 8).
2. Draft the statement schema as a contract proposal with independent examples: needs open
   questions 2, 4, 5, 7 and the division of scope.
3. Uncertainty and enriched ingredients (#287): needs the contract, the accepted mockup and the
   [promotion gates](fermentation-model.md#12-open-questions-and-promotion-gates).
4. First statements: the measured ones the repository supports (salt and retained gas; yeast dose
   and modulus) and the craft ones the register will then hold.
5. Home observation capture: needs an accepted mockup, the #243 cues, the #275 personal layer and
   an observation contract. Only such observations could ground a probability.

## 9. Decided, proposals and open questions

### Decided

Owner direction, chat, 2026-11-13 (UTC); decisions recorded elsewhere are linked, not restated.

1. Flourprint should predict a dough as well as an expert baker. Beyond when it is ready, it
   should predict how the dough behaves: for example salt tightening the gluten, fat limiting
   gluten formation, the effect of the order of incorporation. (#287 section 4 calls this a later
   direction.)
2. A broad forecast that owns its uncertainty is preferred to a model with no useful predictive
   power, even where the basis is not peer-reviewed science.
3. Compute as much as possible, with maximal epistemic honesty
   ([recorded](evidence-classification.md#8-computed-uncertainty)).
4. The display stays simple, with no provenance in the main flow and detail on demand; the mockup
   comes first (#287).
5. The review shows how craft knowledge and science interact, complement each other, are kept
   separate, and what this means in the app.
6. Recorded elsewhere: the [register rules](craft-knowledge.md#craft-knowledge-and-uncertainty-ranges),
   the [coefficient rule](evidence-classification.md#5-role-for-the-model), the integrated state
   model and personal layer ([14](dough-behavior.md#d14-rheology-and-structure-over-time),
   [16a](dough-behavior.md#d16a-recording-personal-learning-and-global-refit)), and L1, L2 in
   [requirements.md](../ux/requirements.md).

### Proposals

Everything else in this file (sections 1 to 8 other than the direction above).

### Open questions for the owner

Nothing below is decided.

1. **Grade of a craft statement.** The grid is itself a set of Proposals and its blind calibration
   has not been run ([craft-knowledge.md](craft-knowledge.md#calibration)): confirm it or accept
   the dependency.
2. **Where statements live.** A new contract, or an extension of `interactions.md`, whose source
   records do not exist ([I-14](dough-behavior.md#known-inconsistencies-logged-not-fixed-here)).
3. **Who owns the behavior statements:** an extension of #27, a new issue, or a section of #287.
4. **The ordinal scale.** How many steps, with which names, distinguishable by observation.
5. **Basis and source names on demand.** May the on-demand view state the kind of basis, or name
   sources? The basis wording is itself provenance.
6. **Several drivers on one property.** What may be shown without counting one mechanism twice.
7. **Craft words and instrument quantities.** Whether and how their correspondence is recorded.
8. **The register template.** Whether behavior entries need fields for property and driver.
9. **Order of incorporation.** Whether the stage-conditioned extension (in #27's remaining work)
   is the way to read the incorporations that #5 records.
10. **When statements are absorbed** by the shared-state model, and what happens to their records.
