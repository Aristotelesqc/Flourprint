# ADR 0014: Simulation mode

Status: Accepted (owner requests of 2026-10-08, restated on 2026-10-11).

## Context

The owner cannot bake real bread for every update, yet every feature must be tried: start a bake,
follow it, take notes, finish it, read the history. They asked for a **simulation mode** in the
advanced settings that stays on until it is turned off, with its own history and statistics, the
possibility to speed time up, and a way to erase either history.

Until now the app set a bake's `origin` from the device (`physical` on the phone, `simulation`
elsewhere) and never asked. Origin per bake stays (history.md); this ADR decides how it is chosen
and how the two worlds are kept apart.

## Decision

- **A mode, not a per-bake choice.** Advanced → "Mode simulation" is a device preference that
  persists until it is turned off. It is off by default on every platform. A bake started while it
  is on has `origin: 'simulation'`; otherwise `origin: 'physical'`. Starting a bake asks nothing.
- **Two separate worlds.** Bake mode, `/bakes`, the History tab, reminders and statistics show only
  the bakes of the current mode. Turning the mode off hides the simulated bakes, turning it on
  brings them back; nothing is deleted or moved. A bake recorded before 0.6.0 (`origin` absent) is
  counted as real. Recipes, drafts and flours are shared by both modes. A visible banner says when
  the simulation mode is on.
- **Simulated time.** In simulation mode the app's clock is the real clock plus an **offset**, a
  device preference that only grows. Bake mode offers "Avancer le temps" (to the next planned
  moment of the bake, or by 15 min / 1 h). Simulated bakes record their `occurredAt` and
  `recordedAt` on that clock, so their logs stay consistent. Real mode always uses the real clock
  and never sees the offset. Reminders of simulated bakes fire at their simulated time minus the
  offset.
- **Erasing a history.** Advanced offers "Effacer l'historique réel" and "Effacer l'historique de
  simulation", each behind a confirmation that names the number of bakes and suggests copying
  the data first. It deletes the bakes of that origin only (events, command records, summaries),
  running ones included, in one transaction (persistence.md). It cannot be undone; it is the one
  exception to the rule that bake logs are never deleted, and only the baker can trigger it.
- **Statistics.** A Statistics screen summarizes the bakes of the current mode (counts, recipes
  baked, durations planned versus recorded, readiness marks, ratings). Its content is defined with
  the owner before it is built.
- The feedback export keeps both origins, each bake with its `origin`.

## Consequences

- Testing on the phone no longer pollutes the real history, and the PC shell can hold real bakes
  if the mode is off.
- Bakes started before this ADR on the PC shell or the web preview keep their recorded origin.
- A simulated bake whose offset jumped records long steps in little real time; analyses must
  filter on `origin`.
