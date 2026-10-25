# #133 mockup UI/UX audit at e7aaad3 (2026-10-25)

Built from a read-only worktree (`pnpm build`, `pnpm build:mockups`; `review-build.json` = e7aaad3), served on a private port, driven with Playwright at 393x852 with touch, plus 360 px at 130 %, light / dark / AMOLED, FR first and EN spot checks. Gallery companions, PR text and the builder's correction report were not opened.

**New findings:** 0 blocker, 3 major, 14 minor, 4 polish.
**Verdict:** a large step forward; not yet acceptable. Three small major fixes remain.

## Previous combined audit (0dac703), 28 items: fixed 18, partly 9, still present 1, regressed 0

- Majors: fixed — Next blocked on the cooking step now shows the reason; early finish no longer preselects "Cuit"; numbers agree. Partly — Edit stage rows (name column 319 px, was 0–41; rows 103–155 px, was 110–166; 360/130 rows 150–203 px, was 308–361; still bulky, % label repeated, ⓘ and trash on their own line); flour-share refusal (engine reason "La somme des parts de farine doit être égale à 100 %." now shown, but twice: a full-bleed banner plus an inline message in an 84 px column wrapped to 4 lines).
- Also confirmed (8): fixed 6 — Planning no longer repeats steps; History shows the running preparation; `resetChecks` removed; temperature tile labelled ambient/oven; Next has an inline undo bar; 360/130 tab strip no longer scrolls. Partly 2 — nested step cards (group header 49 px, was about 91; cards 94 px); step menu (anchored, focus restored, but see N1).
- Minors (15): fixed 9 — 48 px inputs, focus return after sheets, stray legend gone, preheat card, internal ids gone, finished-state exit, distinct hydration swatches and consistent "estimé", 48 px build label. Partly 5 — focus ring (radius 8 on tabs, 16 on headers, offset 0 vs 2, square checkbox rings); hydration lock (`aria-pressed` and explanation present, still locks silently on typing); step icons; ±15 floor ("Dépassement 00:00:00" still shown, −15 now disabled); step drag (reason toasts confirmed, hover cue and scrim not re-measured). Still present 1 — Library chip chevron overlaps "Brouillons (".

## New major findings

- **N1 — step ⋯ menu hides "Supprimer".** Popup 263 px high, content 322 px; "Supprimer" starts at y=741 while the popup ends at 727, no scroll cue. At 360/130: content 332 px vs 231 visible; the × overlays the first row. Fix in the shared menu.
- **N2 — running Library card at 360/130:** the status pill covers the recipe name ("Shokupan" cut to "Shok"). Fix in the shared recipe card layout.
- **N3 — Library pill "En cours · 1 h 04 min 59 s" is the active step's remaining time, unlabelled,** next to the "5 h 11 min 30 s" total, so it reads as the whole preparation (real remainder about 3 h 42 min 30 s). L43 asks for the preparation's remaining time.

## Caller checks

- **Ready step shown as running before a first action (L127, core `implicitStartOf`):** partly. After Next, the following step counts down under "Début projeté" with no start recorded; Pause or ±15 records it. On the first step of a fresh preparation, and on the cooking step blocked by the oven, the countdown stays frozen (00:04:00) while "Fin d'étape prévue" drifts +1 s per second. Three behaviours for one situation (m13).
- **Numbers across Recipe, Planning, Preparation, Library:** agree (73 %, 699 g, 5 h 11 min 30 s; yeast 2,9 %; Lait 36 %; tangzhong flour 4,5 %; hydration sheet sums to 229,9 g and 100 %; cooking 02:19:32 + 32 min 30 s gives Ressuage at 02:52:02; "n / 9" matches the editor). One difference of meaning: N3.
- **"Keep" list:** nothing regressed.
- **360/130 stacked summary (measured, owner decision pending, not graded):** summary box 678 px tall at y=143; "Ingrédients" heading at y=842, first group header at y=915 (viewport 852). At 393/100: 461 and 518. At 360/100: 478 and 535.

## Minor findings

- m1 Clock formats switch between "00:17:26" and "00 h 18" depending on zero seconds (Planning shows "10 h 09 → 12:11:30"); Library shows seconds ("5 h 11 min 30 s") instead of honest rounding (L43/L120).
- m2 Undo bar never auto-dismisses (still there after 14 s), shifts tiles down 64 px, stays after a refused Next; the refusal says "terminer d'abord Préchauffage" while the card offers "Allumer le four" then "Observer four prêt".
- m3 Pause, ← Précédent, Annuler, Allumer le four, Peser are text-only while −15, +15 and Suivant are pills (one shared button variant).
- m4 "Ajustement : -15 min" uses hyphen-minus; buttons use "−".
- m5 Hydration sheet legend ragged (rows 327 px wide, centred text; gram figures start at x = 41, 41, 133, 97, 65, 166).
- m6 Edit rows still bulky; summary grid leaves a hole; flour row name and sub-line indented differently (x=68 vs 88).
- m7 Refusal banner full-bleed (x 0–393) and duplicated by the inline column.
- m8 Early-finish options list "Cuit" and "Cuit et pâte conservée" right under "Aucune étape de cuisson n'a été réalisée"; no frozen/given option (L113); placeholder "-- Choisir le résultat --" reads as a developer string.
- m9 (EN) French-style spacing ("Weighed : Bread flour", "Total duration : 5 h…"); endpoint labels "· Cool", "Baking Steel bake".
- m10 (FR) "Prêtes" plural on one recipe; jargon "Candidat inverse pour le plan", "conversion par le moteur", "(0.1.0)"; the domain sentence repeats three times in the fermentation panel.
- m11 Library chip chevron overlaps the chip text; at 360/130 the search placeholder is truncated to "Rechercher u".
- m12 Finished state bare (just "Cuit": no label, duration or correct-outcome action); journal ordinals misalign at "10."; on a completed last step −15, Pause and +15 stay active beside "Terminer la préparation".
- m13 Ready-step inconsistency (see caller checks).
- m14 (sample data) Ciabatta template 17 920 g, yeast "0 %", fat and sugar "≥ 0 % / 0 g".

## Polish

- P1 48 px build-label strip permanently inside the phone frame (about 70 px at 130 %) hides content (L14).
- P2 Focus-card progress bar unlabelled; fill (about 13 % at step 4/9) matches neither 4/9 nor 3/9.
- P3 Ring offsets differ; checkbox rings square.
- P4 Some hydration swatches pale on white (Beurre about 1.2:1).

## Keep

- Bottom bar at 360/130: Modifier 78×48, Reprendre 128×48, ⋯ 48×48, no overflow.
- Carousel: 1:1 follow (−110 px at half of a 220 px drag); animated release (about 169 ms); 45 px flick at 0.83 px/ms commits; slow 50 px drag springs back; swipe from x=8 ignored; reduced motion changes tab at once; active tab keeps its width while weight goes 600 → 700.
- 350 ms hold drag: 200 ms does not lift, 350/400 ms do; refused moves show a reason toast.
- Relative times until Planning sets a start.
- Hydration sheet reconciles; partial sums stay "≥".
- Preparation: Next only completes (no eager start in the journal); Previous retract and "Étape suivante déjà commencée" refusal both behave; Pause freezes the countdown; visible journal matches the clock.
- Contrast: no text below 4.5:1 in light, dark, AMOLED (AMOLED base rgb(0,0,0), dark rgb(32,29,26)); primary button 5.76 / 5.95 / 7.45.
- Wording: no "tu"/"vous"; no French in EN.

## Needs a physical device

Swipe feel and thresholds; hold-drag with edge autoscroll; soft keyboard over edit fields; native date picker format; Android Back during drag, sheets and menu; haptics; real system text scale; timers while backgrounded.

## Not checked

Hosted URL (unreachable); "À propos du modèle" (not reachable in this build); recipe check reset after a Preparation starts (carry-in confirmed); hover cue and scrim over a refused drop slot; screen-reader output and keyboard order beyond focus-ring sampling.
