---
name: quota-check
description: Check a coordinator's and its delegates' remaining provider quotas, reserve capacity for verification and publication, and choose whether to continue, bound work, or hand off. Use at session start, during long work, before delegation, and before a new tranche; works across Codex, Claude Code and Antigravity.
---

# Quota checks and durable checkpoints

The coordinator owns continuity. A large delegate allowance does not leave the coordinator
enough capacity to review, test, publish and hand over. Check both independently.

## Observe before allocating work

Use the current harness/provider's native usage surface; see
[provider surfaces](references/providers.md). Inspect the active coordinator first, then every
provider/model group used by delegates. Do not start another model turn merely to ask it to
guess its quota.

Check:

- at session start or resume, before implementation;
- before an expensive delegation or costly recovery;
- at major work boundaries, including integration and verification;
- before starting a new tranche, and after a provider/model switch or quota reset.

One fresh observation can cover adjacent boundaries. These are active-session checks, not an
idle scheduled job or a fixed five-minute timer. Record the next work boundary requiring a check.
Context compaction does not reset provider usage; reread quota after a resumed/compacted context.

Keep a concise working observation: measured time with timezone, harness/provider, model or quota
group when exposed, native source, every applicable window, whether its metric is used or
remaining, percentage at native precision, reset time or the provider's relative reset text,
and the decision below. Keep actual account percentages/reset observations local or in the
current private conversation; public handoffs report the gate and work state only unless the
user explicitly authorizes sharing the figures. Account emails, ids, keys, tokens and raw authentication data do not
belong in this record or a public report.

Unknown is **UNAVAILABLE**, never zero usage or unlimited capacity. Token counts, context size,
cost estimates, available-model lists and CLI exit status do not establish remaining plan quota.
A stale observation or passed reset time requires a refresh, not an assumed refill.

## Reserve closure before starting a tranche

Include tests, corrections, review, screenshots when required, commit, push, PR/issue update and
a concise handoff in the closure estimate. Native subagents on the same account share its limits;
external providers have separate budgets. Never add their remaining percentages together.

Reserve the larger of **10 percentage points** or the most expensive observed comparable
closure in the current window **plus 5 points**. Without comparable evidence, reserve **20
points**. Use the lowest remaining percentage among the applicable coordinator windows:

| Decision | Condition                                                                                                               | Action                                                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| CONTINUE | All applicable windows have at least 40% remaining, and estimated tranche plus closure reserve fits                     | Start one bounded tranche; retain the next quota-check boundary.                                                                              |
| BOUNDED  | All applicable windows have at least 25%, but CONTINUE does not apply; one small tranche plus reserve demonstrably fits | No broad fan-out, redesign or speculative follow-up. Publish that atomic result and reassess immediately.                                     |
| HANDOFF  | Any window is below 25%, a limit is reported, or the tranche plus closure reserve cannot be established                 | Start no new implementation, audit, skill or delegate campaign. Finish only the already-running atomic operation, preserve work and hand off. |

An unavailable coordinator quota permits only bounded read-only recovery and closure of already
reviewable work; do not authorize a large tranche on an estimate disguised as a measurement.
An unavailable delegate quota is reported separately: avoid a large fan-out, permit at most one
bounded attempt within the coordinator reserve, and stop on a provider limit. Do not silently
switch models, buy credits, enable paid overages or consume a reset.

If the post-commit reading falls below the planned reserve, the forecast failed: enter closure.
Do not call the remaining capacity permission for one more small fix.

## Make stopping safe

Follow the repository's own checkpoint, test, branch and publication rules. Quota pressure never
waives checks, authorizes a red code push, changes merge ownership or means the task is complete.

- Stop new assignments early enough to collect running delegates' outputs and exact run ids.
  A final result is not proof its changes were integrated or tested.
- Commit and push each checked, reviewable slice; verify the remote SHA. Use a draft PR for
  incomplete acceptance and state what remains.
- If checks fail and cannot be fixed within the reserve, preserve the exact diff, untracked
  files and outputs in the owned checkout/ignored scratch. Name their locations and failing
  checks in the durable handoff; never claim they were pushed.
- Post the handoff in the repository's required place: remote branch/PR, head SHA, completed and
  incomplete acceptance, tests actually run, delegate outputs still pending, local-only paths,
  and one exact next action. Do not invent a second tracking system.
- End the turn before the hard limit. Do not depend on an automatic continuation, delayed user
  reply or context compaction to save the work.

This procedure supports any coordinator harness. Provider-specific collection belongs in the
reference or the delegation skill; product decisions and repository delivery policies stay in
their existing sources of truth.
