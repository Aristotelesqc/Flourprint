---
name: flourprint-pr-flow
description: Take a Flourprint change from branch to merged pull request into dev - local checks on a private port, native suites when they apply, CI, strict-branch updates, combined merges and issue labels afterwards. Use for any code or docs PR; not for deciding contract semantics (flourprint-contract-change) or UI acceptance (flourprint-ui-check).
---

# Flourprint pull request flow

Read `AGENTS.md` first: it sets the rules (focused PRs into `dev`, checks before every push,
one writer per area, labels). This skill is the procedure and the traps already paid for.

## Branch

- Start from fresh `dev`: `git fetch origin dev && git checkout -B <branch> origin/dev`. Work for
  the release after next starts from `canary` instead and targets it (ADR 0018).
- Several agents share one machine: work in your own worktree, never in another agent's
  checkout, and never `pkill` broad patterns (they kill other agents' servers and shells).
- A contract change goes in its own PR, merged before the code that depends on it.

## Before every push

1. `pnpm install --frozen-lockfile`, then `pnpm build` **and** `pnpm build:mobile`.
   A stale `dist` (from another branch) produces false failures: always rebuild first.
2. `pnpm check`.
3. Full browser suite on **your own port**, so you never reuse another checkout's preview
   server: `FLOURPRINT_E2E_PORT=<4200-4299> pnpm --filter @flourprint/mobile e2e`.
   The default port 4173 is shared; a run against it may silently test someone else's build.
4. Delete `apps/mobile/test-results` and any local config before committing.

Test journeys: navigate inside the app (back button, links) after writing data; a `page.goto`
reload can come before the browser snapshot is saved. With Ionic, several pages stay mounted:
select visible elements (`locator('visible=true')`) rather than `.first()`.

## Native suites (not on every push)

They run automatically only on pull requests into `main`. When a change touches navigation,
recipe opening/editing, storage, import or anything the native suites drive, dispatch them on
your branch and wait for green before merging:

- Android emulator: workflow `android.yml` (Actions → Run workflow, or the GitHub API
  `run_workflow` with `ref: <branch>`).
- Desktop (Electron, Windows): workflow `ci.yml` dispatched on the branch runs its `desktop` job.
  It can also run locally on Linux: `pnpm build:desktop`, then `node node_modules/electron/install.js`
  in `apps/desktop` if the binary is missing, then `xvfb-run -a pnpm exec playwright test` there.

A UI change that breaks a native test is this PR's to fix (example: recipes opening in
consultation required tapping Edit in both native suites).

## Pull request

- Body follows `.github/pull_request_template.md`. Before opening, link the issues per AGENTS.md
  "Development order" (`Closes`/`Refs #N`, or `No issue:` and a reason); the `PR issue link` check
  fails otherwise. List exactly what ran and what did not (device, emulator).
- Commit trailers and PR footer as the host's attribution rules require; English only.
- Set the issue to `status:review` when the PR opens.

## Getting it merged

- `dev` requires up-to-date branches. When `dev` moves: merge `origin/dev` into your branch
  (never rebase or force-push a shared branch), re-run the checks, push; or use the GitHub
  "update branch" action when there is no conflict.
- Several ready PRs that conflict or build on each other: merge them all into the last one,
  resolve once, run the checks once, and merge that PR. GitHub marks the others merged when
  their heads are contained. Say so in each PR.
- A red check: find the cause before re-running. A failure that also fails on `dev` is not
  this PR's; port its fix if one exists and say so on the PR.
- Only the owner merges the major PR (`dev` → `main`).
- `dev` → `canary` synchronization is its own reviewed PR, by batch; never merge `canary` into
  `dev` outside the promotion of ADR 0018.

## After the merge

- The issue goes to `status:verified` with one evidence line per acceptance criterion, or back
  to `status:in-progress` with what remains. Never close it unless every criterion is shown.
- Mention device checks still owed (migrations, reminders) in the issue, not as done.
- Comment on each linked issue with the merge and its status change (AGENTS.md "Development order").
- Update the referenced issues' `status:*` labels per the `flourprint-backlog-steward` rules,
  so routine label upkeep happens at merge time.
- Remove your worktree and local branches.
