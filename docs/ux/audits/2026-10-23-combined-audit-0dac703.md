# #133 combined UI audit of 0dac703

This merges two audits of head `0dac7038`:

- **Hands-on audit (Claude).** An independent agent built the mockup and drove it with Playwright on a phone profile, 393×852 with touch. It checked FR first, light/dark/AMOLED, and 360 px at 130 % text.
- **Review from screenshots and code (GPT).** It looked at the published screenshots and read the source. It did not interact with the interface.

The current head is `086cc963`. **Please check each item there before acting**: some may already be fixed.

**Verdict.** This is a real convergence: no redesign is needed, only a focused pass.

- Preparation (five controls on engine commands) and the one-document Recipe are the strongest parts.
- It is not yet ready for owner acceptance.

## Must fix (major)

1. **Edit mode: rows of the per-stage ingredients collapse (L122 layout).**
   - At 393 px the name column is 0–41 px wide. "Farine à pain" stacks letter by letter in the tangzhong group.
   - Rows are 110–166 px high, and 308–361 px at 360/130.
   - Labels repeat ("Lait (Ajouts finaux)", "Lait · % du boulanger").
   - ⓘ and trash wrap to a second line.
   - The % field beside the stage gram value uses the recipe-total base.
2. **Preparation: "Suivant →" on the cooking step silently does nothing until the oven is marked ready.** There is no message and no disabled state. Show the engine's reason (L121), or disable it with that reason.
3. **Early finish proposes "Cuit" when nothing was baked (L113).**
   - ⋯ → "Terminer la préparation" at step 4 asks to finish "avec le résultat : Cuit", and the menu row reads "Cuit · Choisir le résultat".
   - When no cooking step is complete, nothing may be preselected. Use `outcomeChoiceRequired` from core.
   - Only the hero Finish path forces the choice today.
4. **Numbers still disagree (L18/L118).**
   - Yeast is 2,9 % (ingredients) but 2,866 % (Planning fermentation panel).
   - Lait is 36 % in view but 49,7 % in the edit field next to 113 g.
   - Tangzhong is 4,5 % versus 4,46 %.
   - Preparation: Cuisson en moule at 01 h 49 + 33 min, then Ressuage at 02 h 21 (expected 02 h 22).
   - Use one shared rounding and formatting path. Take times from the core projection, not local arithmetic.
5. **The flour-share refusal is generic and contradictory (L121).**
   - It shows a full-width "Modification refusée par le moteur." and "Saisir un nombre complet et valide." for a valid 50, wrapped to four lines in an 80 px column.
   - Stale errors from other fields stay on screen.
   - Map the engine reason.

## Also confirmed

- **Planning still repeats the Recipe's group and step list almost 1:1 (L108).** Its role is time: start or ready-by, constraints, windows. "Départ prévu" appears as both a label and a select value.
- **History shows "Aucune préparation enregistrée" while a preparation is running.**
  - Library shows "En cours" and Recipe offers "Reprendre".
  - `RecipeHistory.tsx` filters `state.sessionHistory` only, so the active session is missing.
- **The weighing setting "Effacer au changement" (`resetChecks`) contradicts L111.**
  - L111: checks are shared 1:1 between Recipe and Planning, carried into the Preparation at start, then reset in the recipe.
  - Remove this setting, or align it with L111.
- **The Preparation temperature tile reads only "Température 21 °C / 177 °C" (L124).** It needs a dough/room versus oven label.
- **"Étape terminée" via Next has no confirmation (L124).** "← Précédent" does retract it, but nothing presents it as an undo. A short undo toast would make it discoverable.
- **Step cards are still nested.** The group header is about 91 px and step cards about 90 px, with names wrapping at 393. About five steps fit on a screen.
- **The step ⋯ menu is a 380 px popup flush to the top, covering the app bar and tabs.**
  - The × sits on a row of its own, and Supprimer is not separated from the other items.
  - Focus is lost on Escape.
- **At 360/130 the tab strip scrolls (396 versus 360 px).** "Historique" is clipped, and a chevron overlaps its last letter.

## Minor (shared fixes belong in `packages/ui`)

- **Shared inputs under 48 px:** recipe name 36, selects 37, Nom/Lieu/Technique 38, library search 41. The build-label button is 22–26 px.
- **Focus ring:** square on tabs and disclosure headers (radius 0, inset −2 px), pill on buttons.
- **Hydration lock:** the glyph shows the action, not the state, and has no `aria-pressed`. Typing a target locks silently and adds a weighing row.
- **Focus after closing sheets:** it goes to the body after the fat and sugar sheets close.
- **Stray legend:** "· Ingrédients par étape · Pesée / % du boulanger / · Total recette" sits above the steps, which have no heading of their own.
- **Préchauffage card:** no number, about 100 px of empty space, and the handle and ⋯ are misaligned.
- **Misleading step icons:** a thermometer for Division and Ressuage, a flame for the tangzhong cook.
- **Internal ids shown (L13):**
  - "flourprint.commercial-yeast 0.1.0" in the fermentation panel, and "Dose actuelle hors du domaine" repeated three times;
  - the technical journal shows raw ids (`StepStarted · tangzhong`);
  - template notes show repository paths and URLs in "À propos du modèle".
- **Preheat card:** "Chauffe projetée" appears twice, "projetée:" lacks the French space, and the projected window can lie in the past.
- **At the ±15 floor:** "Dépassement 00:00:00" is shown with nothing overrun, and −15 min stays enabled. "Début réel : en attente d'action" shows while a countdown runs.
- **Finished state:** the "Étapes à venir" panel is empty and there is no exit or next action.
- **Hydration sheet:** Eau and Levure share the same swatch, and the sheet says "73 % Estimé" while the card says plain "73 %".
- **Library:** the filter chip's chevron overlaps "(0)".
- **Step drag:** no cue while hovering a refused slot, and the refusal toast has no scrim.

## For the owner to judge (not defects)

- **Summary height at 360/130.** The four metrics stack vertically and push all ingredients below the first screen. Codex states it as a deliberate trade-off, and it needs the owner's visual decision.
- **Carousel velocity.** Commit duration is about the same for slow and fast releases. Judge the feel on a device.

## Keep

- Bottom bar at 360/130, all actions reachable at 48 px.
- Carousel: 1:1 follow, animated commit and springback, instant under reduced motion.
- 350 ms hold drag, with the accepted slot matching the drawn one and a visible refusal reason.
- Relative times until Planning sets a start.
- The hydration sheet reconciles to the gram, and partial "≥" sums stay honest.
- Preparation:
  - large countdown, ±15, a working Pause/Resume, and Previous retraction;
  - Next only completes the step (no eager `StartStep`);
  - the visible journal matches the clock.
- Active tab bold without shifting its neighbours.
- No body-text contrast below 4.5:1 in the three themes.
- No "tu" or "vous", and no FR/EN leaks.

## Device-only

The following cannot be judged in desktop emulation and need a check on the phone:

- swipe feel and thresholds;
- the 350 ms hold with edge autoscroll;
- the soft keyboard over Edit fields;
- native date picker format (headless Chromium rendered mm/dd/yyyy in FR);
- Android Back during drag and sheets;
- haptics, and the real system text scale.
