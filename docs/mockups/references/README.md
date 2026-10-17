# Mockup references

External prototypes kept **verbatim** as visual references for the 0.3 interface work (#120, #134).
They are not product code, not contracts and not accepted designs. Their numbers, scientific text
and navigation are not sources of truth: data comes from `@flourprint/core`, semantics from
`docs/contracts/`.

| File                           | Origin                                                                                                                                                                   | Use                                                                                                                              | Known defects                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2026-10-17-argon-round4.html` | Single-file HTML written by Gemini 4 Argon on its own and pasted by the owner on 2026-10-17. SHA-256 `8d51ca4994bdb9925e10c842ea59bf215e641603c196a6de0a900495c5294acd`. | Visual target: card hierarchy, status badges, icon pills, summary card, prep hero card, anchored menu, Light/Dark/AMOLED tokens. | Local arithmetic and invented data that disagree between screens; fermentation text contrary to `docs/contracts/fermentation.md`; build label, permanent delete and reviewer notes contrary to owner decisions; sheets anchored to the bottom of the content; title breaks mid-word at 360 px with 130 % text. Review: #134 (comments 6227770682 and 6228380029). |

Open a file directly in a browser; it needs no build. Do not reformat these files: they are
excluded from Prettier so that their hash matches what was received.
