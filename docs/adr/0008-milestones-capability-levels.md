# ADR 0008: Alpha / Engine MVP milestones and N1–N3 levels

Status: Accepted (#17, #29, #30); amended by ADR 0010 (first fermentation model in Alpha) and on
2026-10-11 (proof-of-concept baseline and delivery workflow, below)

## Decision

- **Dogfood Alpha**: complete formula, rich process, sessions, history, manual registry,
  equipment (N1 + N2), interactions at N1, fermentation without a numeric model (`unsupported`)
  but with the required data collection. Self-contained offline APK.
- **Engine MVP**: the next explicit milestone; first N3 simulator from #29 (forward + inverse
  dose ↔ duration, narrow domain), a firm deliverable.

Detailed matrix: `docs/contracts/capability-levels.md`.

## Development order

1. Docs + scaffold. 2. Formula. 3. Process. 4. Session and history (pure Node).
2. Persistence (after #24). 6. Mobile (after #23). 7. Dogfood Alpha. 8. Engine MVP.
   Spikes #23 and #24 and fermentation-model research run in parallel.

## Workflow

Until 2026-10-11, every commit was pushed and included in the MVP pull request (#31).

### Amendment of 2026-10-11 (owner decision, #30)

- **#31 becomes the proof-of-concept baseline** and is merged into `main`. It holds steps 1 to 6,
  the data collection and simulation mode, and the first fermentation model. Merging it does not
  close open feature or device issues and does not declare Dogfood Alpha complete.
- **Next phase: hardening, essential-feature completion and interface refinement.** The workstreams
  are listed on #30: interaction and visual foundation (#35), Recipe / Planning / Preparation
  roles, the session lifecycle and outcomes, multi-method cooking and documented modes (#28), the
  complete manual registry (#26) and reliability. The Alpha capability levels are unchanged:
  #26 and #28 remain N1 + N2 in Alpha.
- **Focused pull requests into `dev`**, the integration branch of the open major pull request
  (`dev` → `main`, merged when the owner decides; ADR 0013 for the dev channel that follows it):
  a contract change in its own pull request before the code that depends on it; implementation in reviewed slices, each pushed only after the checks,
  build and browser journeys pass. Native checks cover platform-sensitive changes and milestones.
- **One writer at a time for overlapping files.** The interface work is implemented by Gemini under
  Codex's review; Claude works on non-overlapping areas (contracts, domain, persistence, reliability)
  and reviews the interface slices.
- **Priorities belong to the owner.** Complexity drives decomposition and evidence, never the removal
  of a required feature; any proposed reduction is shown to the owner with its reason and an
  alternative. A real bake supplies calibration evidence; it does not gate N1/N2 features. Only
  quantitative predictions wait for sources and validation.
