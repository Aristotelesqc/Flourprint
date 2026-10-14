# ADR 0018: A canary branch and web channel for the release after next

Status: Accepted (owner decision of 2026-10-13, #95). Complements ADR 0013 and ADR 0016.

## Context

`main` holds released work and `dev` integrates the next release through the open major pull
request (ADR 0008 workflow, ADR 0013). While a release is being finished (0.2.0, #43), work meant
for the release after it (contracts #89, #91–#94, #96, #97) had nowhere to land: merging it into
`dev` would widen the release, and keeping it in drafts stalls it. The owner chose a third, stable
integration branch, keeping it small (independent review on #95).

## Decision

- **Roles.** The roles are stable; the version numbers advance.

  | Branch   | While 0.2.0 is pending   | After 0.2.0 is released and promoted |
  | -------- | ------------------------ | ------------------------------------ |
  | `main`   | released 0.1.x           | released 0.2.0                       |
  | `dev`    | stabilizes 0.2.0         | integrates 0.3.0                     |
  | `canary` | integrates 0.3.0 (N + 2) | integrates 0.4.0                     |

- **Where pull requests go.** A change for the next release targets `dev`; a change for the
  release after it targets `canary`. Its PR says which release it is for.
- **Direction.** Changes flow downstream only: `main` → `dev` → `canary`. A fix on `main` joins
  `dev`, then `canary`; a change on `dev` joins `canary`. `canary` never flows into `dev` except by
  the promotion below.
- **Synchronization.** `dev` is brought into `canary` by a reviewed pull request, by batch (when a
  meaningful set has landed, or before cross-branch work), never by an automatic merge. Conflicts
  in contracts or workflows are resolved by a person or agent and reviewed, never auto-resolved.
- **Promotion at a release.** All steps are merges that keep history; no branch is reset,
  renamed, deleted or force-pushed:
  1. the owner merges the major pull request `dev` → `main` (the release, ADR 0016);
  2. if `main` has commits `dev` lacks, a reviewed PR merges `main` → `dev`;
  3. a reviewed integration PR merges `canary` → `dev`: `dev` becomes the next release;
  4. a reviewed PR merges the new `dev` back into `canary`, and a reviewed change raises the
     version of `canary` to the release after;
  5. open pull requests are retargeted to their intended release only after their branch and
     dependencies are inspected.
     An integration branch is never squash-merged into another: later merges rely on its commits.
- **Versions.** `canary` carries the version of its release in `package.json` (0.3.0 while `dev`
  is 0.2.0). Its builds are named `<version>-canary.<run>+<sha>`, labelled
  `v<version>-canary-<code name>`, with channel `canary` in `build.json` (ADR 0016). Contract,
  engine and model versions stay independent of the app version.
- **Web channel only.** A push to `canary` runs the same checks as `dev` (`check`, `e2e`) and
  deploys `https://canary.flourprint-aristotelesqc.pages.dev`; only a push to `canary` updates that
  address, and the `main`, `dev` and `pr-<number>` addresses are unchanged. No APK is built for a
  push to `canary`. A canary APK, if one is needed later, gets its own application id (for example
  `app.flourprint.canary`) so it overwrites neither the offline APK nor the dev APK's data; it needs
  its own decision.
- **Bootstrap exception.** The `canary` branch was created once from `dev` (commit `4d2a39a`)
  before this ADR existed, with the owner's approval on #95, so that these rules could land on
  `canary` without touching 0.2.0. This ADR, the AGENTS.md rules and the workflow changes arrive on
  `canary` by one reviewed pull request; they join `dev` at the promotion after 0.2.0.
- **Protection.** `canary` is protected like `dev`: pull requests only, up to date before merge,
  required `check` and `e2e`, no force push, no deletion.

## Consequences

- Work for two releases proceeds in parallel without widening the release in progress.
- Each promotion is a short checklist of reviewed merges; it must be followed in order.
- Contract changes on `canary` may conflict with fixes on `dev` (`process.md` in particular); the
  synchronization PR is where they are resolved.
- Until the promotion, `dev` and `main` do not contain this ADR; agents working for the release
  after next read the rules from `canary`.
