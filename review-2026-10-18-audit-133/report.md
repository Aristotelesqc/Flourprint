# Audit of the #133 mockup against docs/ux/requirements.md

Audited build: UI source `45b848b`, gallery `review-2026-10-18-component-controls`. Later commits on
#133 (`25031e3`, `e4024c4`) were not re-audited. Checked rendered and clicked: FR and EN,
navigation A and B, 393 px / 100 % and 360 px / 130 %, light, dark and AMOLED; round 2
(`22db386`) loaded for comparison. Evidence files are in this folder.

Result over the 95 requirements: **33 PASS, 44 PARTIAL, 15 FAIL, 3 NOT-TESTABLE.**

## Blocking (fix first)

| Item | Finding | Evidence |
| --- | --- | --- |
| L44, L41, L42 | "Jamais cuite" on 14 of 15 library cards, a "Version 1" pill on every card. Round 2's "Prête · v1", "Prête · v4 · ★ 4,5/5" badges are gone. | `lib-A-fr-393-fullpage.png`, `round2-library.png` |
| L82 | Only one preparation can run: starting a second shows "Une préparation est déjà en cours…". | `start-second-A.png` |
| L63, L62 | Hydration lock broken: typing 75 is refused ("Saisir un nombre complet et valide.", "Modification refusée par le moteur."), Save disabled; Lock offered with no absorbing water. In code a typed target is locked then immediately unlocked. | `edit-A-locked.png` |
| L69 | Preheat numbered "8." after "7. Apprêt" in Steps and a stage "8 / 10 · Préchauffage" to complete in Preparation. | `recipe-A-Étapes.png` |
| L60 | Navigation A edit bar has no visible Annuler (only inside ⋯); B hides Undo/Redo in the menu. | `edit-A-locked.png`, `edit-B-partial.png` |
| L29 | The menu repeats Modifier (and Undo/Redo in edit) already in the bar. | `menu-A.png`, `edit-A-menu.png` |
| L65 | "Réinitialiser le brouillon" names no baseline and asks no confirmation. | `edit-A-menu.png` |
| L72 | Move preview lists only the new order, not timings or dependencies; Duplicate inserts the copy silently. | `move-preview-A.png`, `step-duplicated-A.png` |
| L7 | Steps shows "Résultat : Cuit" instead of the planned result. | `steps-intended-outcome-A.png` |
| L25, L3 | Mid-word breaks (`overflow-wrap:anywhere` on tab labels, headings, disclosure titles); at 360 px / 130 % the tab list is 486 px wide and "Historique" is off-screen. EN keeps French typography ("73 %", "Temperature : 21 °C", "« Shokupan »"). | `w360-130-A-recipe.png`, `recipe-B-en.png` |
| L86, L87 | No System theme, no °C/°F preference. | `settings-A.png` |

## Other failures and partials

- **Data integrity:** L18 cooling step reuses the tangzhong instruction (`prep-A-step10.png`); L20 journal "Préparation lancée 14 h 25" after steps ended; L12/L66 two percentages for one ingredient; L58 dose basis; L19/L57/L17 precision and qualifiers.
- **Wording:** L13 raw id "biga" on a card, "Aperçu du déplacement · Référence"; L46 English provenance wall in the FR template chooser; L74 °F and inches in a bake instruction; L77 "Fin prévue" used for input and result; L14 component catalogue and design choices inside the phone.
- **Round 2 losses:** L78/L90 bake tiles (mode, steam, vessel); L43 endpoint labels; L91 removals not recorded as owner decisions.
- **Layout and accessibility:** L80 B puts the preparation's main action in the top bar; L27 nested control in a card, name "Reprendre" ≠ visible text, no move announcements; L26 26 px build button; L38 oven icon for the tangzhong scald; L40 "neo" does not find "néo-napolitaine".
- **Missing:** L81 Abandon; L5 contextual cooking action per method; L30 Trash screen; L89 flours in the registry.

## Open choices settled without the owner (show as options instead)

O17 "Jamais cuite" kept (now resolved by the owner: L44 applies) · O2 weighing checks cleared on any formula edit, weighing choice shown as an in-phone setting · O3 downward chain moves refused, no upward conversion · O15 no lock status in reading · O16 single X close · O18 Edit in bar and overflow · O6 component % labels and rounding · O7 app mark kept · O10 label format · O12 "Ajouts finaux" / "Pâte assemblée".

## Full verdict table

| # | Verdict | Evidence |
| --- | --- | --- |
| L1 | PASS | No tu/vous; infinitives. |
| L2 | PARTIAL | Template provenance renders raw English. `chooser-A-details.png` |
| L3 | FAIL | EN keeps FR typography; FR shows English provenance. `lib-B-en.png`, `recipe-B-en.png` |
| L4 | PASS | "Préparation" throughout. |
| L5 | PARTIAL | Pochage and cuisson en moule end with a generic "Étape terminée". `prep-A-step9.png` |
| L6 | PARTIAL | Finish handles dough and disposition; cards say "Jamais cuite", "· ressuage". |
| L7 | FAIL | "Résultat : Cuit". `steps-intended-outcome-A.png` |
| L8 | PARTIAL | Start runs now; label "Lancer"; no "Maintenant" in the planner. |
| L9 | PARTIAL | No "Poids" header; "Supprimer" instead of "Retirer". |
| L10 | PASS | |
| L11 | PASS | |
| L12 | PARTIAL | Row "36 %" next to field "49,68". `edit-B-partial.png` |
| L13 | FAIL | "biga", model id, "· Recette vierge". `registry-A.png`, `ferment-valid-A.png` |
| L14 | PARTIAL | Component catalogue and weighing design choice in the phone. `nav-menu-A.png`, `settings-A.png` |
| L15 | PASS | "Durée inconnue". |
| L16 | PASS | "≥ 73 %". |
| L17 | PARTIAL | Every row qualified "Connu"; "Sel 0 % · Part connue". `hydration-A.png` |
| L18 | PARTIAL | 454,3 g vs 454 g; 1 h 06 vs 1 h 05; ressuage instruction. `prep-A-step10.png` |
| L19 | PARTIAL | "1 228,8 g", dose "2,866 %". |
| L20 | PARTIAL | Journal start after steps. `prep-A-bulk.png` |
| L21 | PARTIAL | Progress bar unlabelled. |
| L22 | PARTIAL | Three themes; no System. |
| L23 | PASS | |
| L24 | PARTIAL | No 412×915 frame. |
| L25 | FAIL | See blocking. `w360-130-A-steps.png` |
| L26 | PARTIAL | 26 px build button. |
| L27 | PARTIAL | See other failures. |
| L28 | PASS | 150/220/260 ms, reduced motion gives none. |
| L29 | FAIL | See blocking. |
| L30 | PARTIAL | No Trash screen. |
| L31–L35 | PASS | |
| L36 | PARTIAL | Label copyable; dialog titled "Flourprint · maquette 0.3"; 26 px target. `build-copy-A.png` |
| L37 | PASS | |
| L38 | PARTIAL | Pictogram meaning. |
| L39 | PASS | |
| L40 | PARTIAL | Search ignores accents. `search-empty-A.png` |
| L41 | FAIL | "Version 1" pill, mass-only yield, "Brouillons 0". |
| L42 | PARTIAL | No rating badge. `lib-B-dark.png` |
| L43 | PARTIAL | "75 h 49" with no "~"; "· ressuage" on pizzas. |
| L44 | FAIL | "Jamais cuite" ×14. `lib-A-after-dough.png` shows "Pâte préparée" is possible. |
| L45 | PARTIAL | B filled primary "+ Nouvelle recette". |
| L46 | PARTIAL | English provenance wall. |
| L47–L56 | PASS | |
| L57 | PARTIAL | Aggregation and precision. |
| L58 | PARTIAL | Dose basis; duplicated status line. `ferment-*.png` |
| L59 | PASS | |
| L60 | FAIL | See blocking. |
| L61 | PASS | |
| L62 | PARTIAL | Valid 75 flagged invalid. |
| L63 | FAIL | See blocking. |
| L64 | PASS | |
| L65 | FAIL | See blocking. |
| L66 | PARTIAL | Row % vs field %. |
| L67 | PARTIAL | Clock times, not relative; no total span. |
| L68 | PASS | `timeline-A.png` |
| L69 | FAIL | See blocking. |
| L70 | PASS | |
| L71 | PARTIAL | Step editor lacks model-driven duration. `step-editor-A.png` |
| L72 | FAIL | See blocking. `move-refused-A.png` |
| L73 | PARTIAL | `reorder-mode-A.png` |
| L74 | PARTIAL | °F and inches. |
| L75 | PARTIAL | No per-step edit; Planning duplicates Steps. |
| L76 | PARTIAL | Range and duration share a row. |
| L77 | PARTIAL | "Fin prévue" for input and result. `planning-readyby-bake-A.png` |
| L78 | PARTIAL | Bake tiles missing. |
| L79 | PASS | |
| L80 | PARTIAL | `w360-130-B-prep.png` |
| L81 | PARTIAL | No Abandon. |
| L82 | FAIL | `start-second-A.png` |
| L83 | PASS | `history-A.png` |
| L84 | NOT-TESTABLE | No statistics in the mockup. |
| L85 | PARTIAL | Settings: appearance and weighing only. |
| L86 | FAIL | No System theme. |
| L87 | FAIL | No °C/°F. |
| L88 | NOT-TESTABLE | No simulation mode. |
| L89 | PARTIAL | No flours in the registry. `registry-A.png` |
| L90 | PARTIAL | Round 2 badges, yield, endpoint labels, prep tiles lost. |
| L91 | PARTIAL | Removals not recorded as owner decisions. |
| L92 | PARTIAL | 24 captures at 360/130 vs 36 at 393/100. |
| L93 | PASS | |
| L94 | NOT-TESTABLE | Process. |
| L95 | PARTIAL | Weighing proposal shown as a product setting. |
