# ADR 0008: Alpha / Engine MVP milestones and N1–N3 levels

Status: Accepted (#17, #29, #30); amended by ADR 0010 (first fermentation model in Alpha)

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

Every commit is pushed and included in the MVP pull request.
