# Recipe groups and relative timeline — interaction mockup, 2026-10-13

Record of the interface the owner wants for Recipe → Steps (#35, #91). The mockup below comes
from the independent audit of #91 ([comment](https://github.com/Aristotelesqc/Flourprint/pull/91#issuecomment-6149909208)).
It is an **interaction mockup**, not executable or copy-ready application code. The contract of
the timeline is in `docs/contracts/process.md` (Relative timeline and groups) and of the
component steps in the same file (Subjects and component phases); this document does not
override them.

## Requirement

- Recipe is usable **without opening Planning**: it describes the entire production protocol,
  including components prepared a day ahead, not only the steps that start with the final dough.
- Steps are shown in **collapsible groups** (Poolish, Tangzhong, Main dough, Cooking) with their
  temperatures and instructions.
- Each step shows three readings: its **own duration**, its **relative start** and its
  **relative end** (from the first task of the whole recipe).
- Each group shows its **window** (earliest start → latest end) and its **elapsed span**. The
  span is not the sum of the children's durations, particularly for parallel tasks.
- Recipe and Planning consume the **same projection**; unknown times are shown as unknown, never
  zero-filled; groups are not persisted; open and closed state is kept across navigation without
  changing the recipe.
- The source of truth is the projection plus derived display data, not these static rows.
  Disclosure uses accessible semantics (`button`, `aria-expanded`, focus and touch targets).

## The mockup

Timings are **illustrative scheduled values, not biology predictions**. `+hh:mm` is measured
from the first task of the whole recipe, and the branches overlap on purpose.

**Recipe: poolish + tangzhong bread — total projected span: 30 h 25 min**

<details open>
<summary><strong>Poolish</strong> · 24 h 10 min · +00:00 → +24:10 · 3 steps</summary>

| Step                                        | Own duration | Relative start → end |
| ------------------------------------------- | -----------: | -------------------: |
| Prepare poolish (mix component ingredients) |       10 min |      +00:00 → +00:10 |
| Counter fermentation, 21 °C                 |         16 h |      +00:10 → +16:10 |
| Fridge fermentation, 4 °C                   |          8 h |      +16:10 → +24:10 |

Same `poolish` component throughout; incorporation happens later, once.

</details>

<details>
<summary><strong>Tangzhong</strong> · 40 min · +23:30 → +24:10 · parallel component branch</summary>

| Step           | Own duration | Relative start → end |
| -------------- | -----------: | -------------------: |
| Cook tangzhong |       15 min |      +23:30 → +23:45 |
| Cool tangzhong |       25 min |      +23:45 → +24:10 |

Tangzhong preparation overlaps the poolish's last refrigeration period.

</details>

<details open>
<summary><strong>Main dough</strong> · 5 h 35 min · +24:10 → +29:45 · frasage, development, fermentation</summary>

| Step                                                              | Own duration | Relative start → end |
| ----------------------------------------------------------------- | -----------: | -------------------: |
| Frasage: incorporate poolish, tangzhong and remaining ingredients |       10 min |      +24:10 → +24:20 |
| Kneading (optional)                                               |       10 min |      +24:20 → +24:30 |
| Bulk fermentation                                                 |          3 h |      +24:30 → +27:30 |
| Shaping                                                           |       15 min |      +27:30 → +27:45 |
| Proof                                                             |          2 h |      +27:45 → +29:45 |

The two prepared components have joined the main dough without double counting.

</details>

<details>
<summary><strong>Cooking</strong> · window 1 h 10 min · +29:15 → +30:25 · overlaps proof</summary>

| Step         | Own duration / requirement | Relative start → end |
| ------------ | -------------------------: | -------------------: |
| Oven preheat |  30 min required (overlap) |      +29:15 → +29:45 |
| Bake         |                     40 min |      +29:45 → +30:25 |

The cooking group window is 70 min, but the preheat overlaps the main-dough group's proof. Its
own 30 min requirement is not added to the critical path, and no step waits for it (#94).

</details>

## Notes recorded with the mockup

- The preheat trigger at `+29:15` is 30 min before the loading at `+29:45`, in the middle of the
  proof, and the proof stays **one** step. The owner chose this (option C, 2026-10-13, review on
  #97): a preheat is an overlapping branch scheduled from its target, `requiredWarmupS` before it
  (`beforeTarget`, #94). Starting at the end of shaping (2 h of heating) remains an explicit
  choice, never the default, and the proof is never split to place a trigger.
- **Steps | Timeline.** Recipe keeps the grouped list as its default view and may offer a
  read-only lane view of the same projection, in which overlap is visible:

```text
Relative time:      +27:45            +29:15  +29:45     +30:25
                    |------------------|-------|----------|
Main dough / Proof  [===========================]
Oven / Preheat                         [=======]
Cooking / Bake                                 [==========]
```

- Groups are derived (by subject and operation), not stored. A group with an unknown step is
  shown as provisional, with its reasons, and claims no definitive envelope.
- The derived view model below is illustrative and not persisted recipe data.

```ts
type StepDisplay = {
  stepId: string;
  groupId: string; // e.g. 'component:poolish', 'mainDough'
  durationS?: number; // own duration, where known
  relativeStartS?: number; // from the recipe's projected origin
  relativeEndS?: number;
  timing: 'known' | 'unknown'; // with blockers and causes in the real model
};

type GroupDisplay = {
  id: string;
  stepIds: string[];
  relativeStartS?: number; // earliest known relevant start
  relativeEndS?: number; // latest known relevant end
  elapsedS?: number; // end - start, NEVER sum(child durations)
};
```

## Status

The 0.3.0 timeline and component contracts have been merged into `canary` (#91 to #94,
#96, #97). They specify behavior and presentation but **do not implement the UI**. The
implementation task and its acceptance criteria are tracked in [#100](https://github.com/Aristotelesqc/Flourprint/issues/100),
under the #35 UX workstream. Historical review discussion is linked above for decision context.
