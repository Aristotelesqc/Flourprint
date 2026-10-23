# PR #133 — comparison before visual restoration

## Decision and approval gate

**Hold visual acceptance. Keep the round 3 engine, in-memory state, accessible primitives and journey tests. Restore the round 2 visual roles and the owner's actual A/B alternatives, after the owner has reviewed this comparison.**

This is the first delivery of the recovery plan, not a restored design. No prototype screen, theme, production UI, contract or domain calculation was changed to produce it. The owner explicitly requested an intermediate approval before visual restoration. No approval is inferred from publication or silence.

## Evidence and comparability

- Round 2: source `22db38688059337402dbbb5e1bd42213bfac6c0f`, historical deployment `a7ea5e6`, directory `review-2026-10-15-0.3-ux`.
- Round 3: rendered source `419c70b0e1a89842d21d72254636127cb8b4a48d`, PR head `7c7c2e7`, deployment `233c1ce`, directory `review-2026-10-16-0.3-ux`. Its build source hash is `6f496b46ffb3674f4f6892d461164c38f6fdc519970a25f82eea8e9e8c1c4846`.
- Current app: source `7dd74bf435047f0982f2fe2ab10765600b3eb4bf`, locally rebuilt. The capture tool refuses to run if mobile/core source trees differ from this reference. This is not a capture of a moving remote dev deployment. Its visible `v0.3.0-local` label is the real local build identity, not an invented dev code name.
- Main matrix: ten states in A and B, FR / Dark / 393 x 852 / 100% text. Additional matrix: Recipe, Planning and Preparation in A and B, 360 x 852 / 130%. There are 26 triptychs and 78 original captures, plus four editor-detail captures.
- Exact 130% means a computed root size of 20.8px. The archived round 2 URL parser only supports 125%, so the test context sets the requested root size without editing the archive. The manifest records the measured size.
- The production app has no A/B variants. Its unchanged capture is repeated intentionally. It uses one imported public core Shokupan template; round 3 has the full core template catalogue and round 2 has a historical mixed-state library. Card counts and fictional historical ratings are not treated as visual quality evidence.
- Round 2 Planning is unreachable: clicking its tab leaves Recipe visible. That actual failed transition is captured and labelled. Round 3's relative-start list and the current app's Planning are labelled nearest views, not lane timelines.
- Preparation phases differ: round 2 shows static cooking, round 3 a seeded fermentation, and the app a fresh session. Compare priority, action placement and legibility, not remaining times or equipment presence across different operations.

All comparisons use actual browser renders. Historical HTML/assets remain unchanged. The publication manifest identifies each source, fixture, requested state, availability, dimensions, text scale and image hash. These screenshots complement live interaction evidence; they do not establish native behavior, persistence or biological validity.

## Screen-by-screen UX/UI assessment

### 1. Library — worse visually

- **Hierarchy:** round 2 makes recipe identity and state immediately scannable. Round 3's separate active-preparation card is useful, but the search/filter stack consumes much of the first viewport and ordinary titles are almost black.
- **Readability:** the title contrast is a blocker. The current app's pale titles and distinct yield/hydration/duration values remain more readable than round 3.
- **Thumb reach:** A lost its integrated search/New/More toolbar. B stacks the same wide New button over global navigation, rather than presenting a meaningful alternative.
- **Density:** round 2's small metric pills communicate more per card; round 3 runs metadata together. The app has one imported recipe here, so its empty space is not a fair library-density comparison.
- **States:** round 3's running entry is explicit; its recipe badges are neutral. All current templates really have no cooking history: do not invent ready states or ratings to imitate round 2.
- **Pictograms:** restore consistent metric icons and state emphasis, without copying arbitrary decorative emojis.

Correction: shared structured recipe metrics, semantic status variants, readable card text and genuine A/B bars. Demonstrate additional states only with clearly identified synthetic records.

### 2. Recipe reading — worse hierarchy, useful grouping retained

- **Hierarchy:** round 3 promotes an unknown-composition message to a heading, then five metric tiles. Ingredients and method are pushed down. Round 2 separates summary, hydration and an inline partial-total warning more coherently; the app has a compact factual summary.
- **Readability:** whole-percent hydration is appropriate. Repeated "Part connue" text, raw `tangzhong` and adjacent unstructured percentages weaken the result.
- **Thumb reach:** the single wide Start button hides other useful actions. Restore A's contextual bar; B must keep its own action placement.
- **Density:** preserve the hierarchical allocated-ingredient list, but compact the summary and reduce card-within-card repetition.
- **States:** partial data and temporary weighing must remain explicit. Do not turn an unknown composition into a complete result merely to simplify the display.
- **Pictograms:** retain hydration and size help; restore semantic metric roles and consistent disclosure affordances.

Correction: primary flour/dough/hydration summary, secondary enrichment detail, inline incomplete-data notice and display names throughout. Do not restore the historical prototype's inconsistent quantities.

### 3. Recipe editing — worse spatial continuity

- **Hierarchy:** entering edit adds a name field and Undo/Redo/Reset row above an already large summary. At 393px, the quantity controls are mostly below the first viewport. Round 2's in-place fields preserve more of the reading layout, although its Save previously discarded changes.
- **Readability:** round 3's full labels explain field semantics, but repeated ingredient names and multiple fields per row need a compact shared arrangement. Detail captures accompany the first-viewport comparison.
- **Thumb reach:** preserve functioning Save/Discard and accessible history controls; put them in the agreed contextual composition instead of accumulating another toolbar in content.
- **Density:** retaining every capability does not require showing all labels and controls at equal weight.
- **States:** keep raw/invalid input, exact values, refusal messages, undo and dirty state. Historical visual continuity is not permission to restore broken Save behavior.
- **Pictograms:** retain recognisable undo/redo and explicit field labels; icon-only controls need accessible names and adequate hit areas.

Correction: shared read/edit row structure, compact labels, stable feedback footprint and mode transitions that retain the visual anchor. Compare below-fold authoring controls as well as the initial viewport.

The additional editor renders confirm both previously unverified claims: ingredient names repeat in their quantity-field labels, and grouped step editing shows Duplicate/Delete on each row. The milk row also shows a 36% allocation above a 49.68% total-recipe field; these need explicit scope labels so valid domain quantities do not appear contradictory. This is a presentation finding, not a claim that the engine calculated the wrong mass.

### 4. Recipe overflow — worse presentation, useful behavior retained

- **Hierarchy:** a short anchored menu became a full-width sheet with three large buttons. Trash sits between Edit and build copying.
- **Readability:** the larger buttons are readable but overstate occasional actions. The production menu is a separate platform reference, not an excuse to prefer either treatment automatically.
- **Thumb reach:** A should anchor near its bottom trigger; B near its top trigger, with viewport-safe placement.
- **Density:** short actions should not take a form-sized surface.
- **States:** round 3's real dismissal/focus behavior is worth keeping. Restore Duplicate as a functioning in-memory action or explicitly identify any remaining limitation.
- **Pictograms:** restore a consistent compact action row and separate the destructive item.

Correction: anchored shared Menu with trigger reference and placement; retain Modal for longer tasks. Preserve Escape, outside dismissal and focus return.

### 5. Hydration detail — mixed; content relevance regressed

- **Hierarchy:** round 2 distinguishes the summary, contributors and unknowns. Round 3's contributor list is readable but ends with unrelated recipe-anchor instructions.
- **Readability:** keep explicit estimated/unknown contributions and whole-percent hydration. Numerical differences reflect different fixtures and must not be presented as a visual improvement.
- **Thumb reach:** keep an obvious, reachable close action and independently scrollable content.
- **Density:** do not add dry zero-water rows just to make lists match. Move size help out of this sheet.
- **States:** preserve incomplete-total semantics. The current app's water breakdown provides a useful factual reference, including uncertainty ranges where available.
- **Pictograms:** use the same information and close conventions as other help surfaces.

Correction: a water-focused sheet with clear totals, contributors and unknowns; size/anchor explanation attached to the size control instead.

### 6. Grouped steps — worse information hierarchy

- **Hierarchy:** round 2 identifies component windows and compact operation rows. Round 3 uses large nested cards but gives little group timing information.
- **Readability:** duration and temperature are run together; component identifiers appear as headings. The app's method gives instructions but is not a separate grouped screen.
- **Thumb reach:** keep editing discoverable without permanently placing every destructive action beside every step.
- **Density:** reduce nested surfaces and retain useful timing. Supplementary editing captures expose the per-row actions rather than judging only consultation.
- **States:** the default must be grouped steps; both grouped/timeline choices need an explicit selected state. A button labelled only with the inactive view is less clear.
- **Pictograms:** restore consistent operation markers where they aid scanning; show actual operation/state, not the same generic badge everywhere.

Correction: structured step details, display names, group windows from the same projection, and an explicit two-option segmented selector. No new scheduler in React.

### 7. Timeline — worse; required view absent

- **Hierarchy:** round 2's illustrative bars expose parallel components and preheating. Round 3 shows a list of relative starts; the spatial relationship has disappeared.
- **Readability:** readable timestamps do not make that list a lane timeline.
- **Thumb reach:** view switching remains reachable but must show its current selection. Zoom/focus belongs to the read-only timeline capability, not recipe editing.
- **Density:** relative position should communicate overlap without another large card for every step.
- **States:** round 2's hardcoded bar geometry is only a visual example. Neither a contract document nor a static bar demonstrates the future #106 runtime.
- **Pictograms:** lane/operation identity must remain understandable without relying solely on color.

Correction: render lane geometry from supplied projection bounds. Label any future-contract fixture separately; never implement a second scheduling model to make the mockup look complete.

### 8. Planning — functional gain, visual acceptance withheld

- **Hierarchy:** round 3 has an actual generated planning screen, unlike round 2's inactive tab. This establishes a reachable destination, not visual superiority over a nonexistent historical screen.
- **Readability:** timing, duration and conditions need coherent narrow-layout rows. The current app also illustrates how planning controls can consume the first viewport.
- **Thumb reach:** time controls should remain practical, with one shortcut back to the recipe editor and the navigation treatment belonging to A or B.
- **Density:** split each row into meaningful lines rather than squeezing several columns until fragments wrap.
- **States:** distinguish planned anchor, generated end and unknown times. The 130% captures show which navigation labels remain reachable.
- **Pictograms:** one consistent time/edit vocabulary is enough; avoid repeated generic edit text.

Correction: atomic time ranges and durations, conditions on a secondary line, concise projection summary and selected-section cues. Do not fabricate a historical Planning screenshot.

### 9. Preparation — mixed, instructions misplaced

- **Hierarchy:** round 3's remaining-time panel, progress and start/end labels are useful. It places six action buttons before the instructions; round 2 puts cooking instructions and settings immediately under the timer.
- **Readability:** the monospace timer is visually disconnected from the rest of the interface. Use the normal font with tabular numbers, without rolling-value animation.
- **Thumb reach:** keep frequent controls available and the current-step action near the thumb zone. Avoid duplicating Note between content and A's bar.
- **Density:** promote the current instruction rather than a wall of buttons. Keep equipment/conditions available for operations that actually use them.
- **States:** snapshots, observations and completion remain distinct. The three captures show different phases; absence of oven settings during a fermentation is not itself a defect.
- **Pictograms:** shared note, duration, photo and status icons should identify functions consistently.

Correction: timer, instruction/settings, compact frequent actions, then upcoming/completed steps and journal. Preserve remaining time, actual start, planned end and readiness observations.

### 10. Recipe creation — worse choice presentation

- **Hierarchy:** round 2 presents recipe identities with short descriptions, method and metrics. Round 3 becomes a long column of same-looking pill buttons.
- **Readability:** names alone cannot explain the difference between related templates. The production chooser is a useful current reference, with a different interaction model.
- **Thumb reach:** retain a visible close/cancel route. A selected-template summary and explicit confirmation should not become unreachable below the list.
- **Density:** allow a real catalogue without fifteen oversized equal-weight buttons or copying historical invented values.
- **States:** preserve real selection, creation and cancellation. Selecting a template must not silently create a record while the interface still suggests it is only a preview.
- **Pictograms:** structured method/metric markers are useful; arbitrary icon variety is not.

Correction: compact shared template cards, progressive attribution/details and a clear selected state, using actual core catalogue data.

## Restoration ledger

### Restore

- Anchored short overflow menu: keeps context and uses less space; separate destructive action. Preserve improved dismissal/focus behavior.
- Contextual option A bar: restore the actual search/New/More, recipe, editor and preparation action arrangements from #112.
- Distinct option B: global destinations with compact contextual actions, without stacking a persistent wide CTA above navigation.
- Metric pills and semantic pictograms: restore scannability through shared structured metrics, not decorative emojis.
- State badges and active-preparation emphasis: use true recorded/illustrative states with appropriate variants; do not invent history.
- Card hierarchy, restrained elevation and spacing: recover meaningful surface levels. Shadow/radius/transition counts are not acceptance targets.
- Text font with tabular figures: restore coherent numbers and timer typography.
- Visible real build label and copy fallback: restore channel/build identity where required. Historical invented bakery labels are not current build values.
- Readable titles: explicitly inherit semantic text color in clickable cards and verify contrast across all themes.
- Group/timeline selected state, display names, relevant help and compact template previews: recover the lost information roles without restoring false numerical claims.

### Keep

- Core-backed formula resolution and quantity edits; no baking math in presentation code.
- In-memory save/cancel/history, navigation, preparation snapshot and journal behavior.
- Accessible shared primitives and actual screen/catalogue reuse.
- Explicit unknown/out-of-domain/no-result distinctions; improve their wording and structure rather than suppressing them.
- Existing interaction tests and historical evidence, while withholding visual acceptance.

### Remove from round 3, after approval

- The persistent full-width CTA treatment that collapses A and B into nearly the same option.
- The unrelated size/anchor paragraph inside hydration help; move it to its relevant control.
- Repeated field-name prefixes and equal-weight button stacks where the shared composition supplies sufficient context; retain every authoring capability and accessible name.
- Misleading diagnostic wording such as "Aperçu du déplacement" for a model demonstration. Identify demonstration controls outside the simulated product where appropriate.

No historical round 2 feature is deleted by this report. Existing historical defects will not be copied back: silent Save discard, dead navigation, fictitious precision, inconsistent masses and unwired actions are not design requirements.

## Next implementation and acceptance

After explicit owner validation, one bounded Gemini implementation assignment restores the shared foundations and components, with Codex integration and direct render review. No new four-agent campaign and no framework/library decision are needed.

Implement by component family: foundations; navigation/menu; cards/summary/editor; steps/planning; preparation/creation. Each family gets before/after evidence against these frozen references before being presented. Update DESIGN.md only for accepted presentation changes, retaining its distinction between runtime and prototype.

Acceptance requires genuine A/B behavior, readable normal and enlarged text, all intended controls exercised, complete dark-theme title contrast, and companion screenshots matching the interactive build. Add style coverage for visual classes and contrast checks; intentional nonvisual hooks need an explicit explanation rather than empty CSS rules.

The prior PR CI has a separate #107 production-browser locator ambiguity (114/115 passed on the cited run). It is not evidence that this mockup is visually acceptable or unacceptable. Fix it in a narrow test slice without sleeps, `.first()` masking or weakened assertions. Browser evidence does not establish Android/system-back, SQLite durability or real fermentation accuracy.

**Stop here for the owner's comparison review. No restoration, merge, production adoption or approval is claimed.**
