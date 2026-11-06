# CLI protocol and recovery

These observations were verified with the installed Antigravity CLI on 2026-10-11. Recheck
`agy --help` and `agy models` when flags or models differ; this is not a frozen vendor API.

## Invocation

- Launch from the intended checkout. `--project` selects an AGY project identity, not a filesystem
  path; omit it unless an actual project ID/name has been established. Do not invent one.
- Use `--mode plan` for source analysis and planning. CLI 1.4.12 prepends `/plan` to prompts;
  for an already approved live UI journey, use default request-review mode with the
  [session-only profile](permissions-and-browser.md#scope-windows-android-access-to-one-session).
  Use `accept-edits` only for assigned implementation with permitted paths and working permissions.
  `--sandbox` restricts terminal execution; it does not grant reads/writes or make a checkout read-only.
- The installed CLI warned that `--mode` has no effect with `--disable-slash-commands`. The helper
  therefore does not combine them. Do not copy that combination and describe it as enforced plan
  mode. Treat prompts/corpora as input and inspect the initialization event for actual mode.
- Model discovery can require normal host access to AGY's existing account/session storage.
  A restricted-host "not logged in" result may be a filesystem denial. Use the host's approved
  execution mechanism; do not read credentials yourself or conclude the account is logged out.
- Pass an explicit log path in private scratch space. Do not commit local account diagnostics.

The helper sends one NDJSON user event to stdin, terminated by a newline:

```json
{ "event": "user", "message": { "role": "user", "content": "The full UTF-8 prompt" } }
```

Use `--input-format stream-json --output-format stream-json`. An object with only `type`,
`event: message`, or a string-valued `message` was rejected by this CLI. Sending the prompt as a
command argument also hit Windows' command-length limit. Structured stdin avoids both problems
without shell interpolation of the source text.

Initialization events may carry `conversation_id` at the top level; retain it even if the turn
fails before its final result. Observed final result shape:

```json
{
  "event": "result",
  "result": {
    "status": "SUCCESS",
    "conversation_id": "session-id",
    "response": "Completed answer",
    "duration_seconds": 4,
    "usage": {}
  }
}
```

The helper keeps `events.ndjson`, `stderr.log`, `agy.log`, `input.ndjson`, `run.json` and, only
for a successful final result, `report.md`. Metadata records the selected model, checkout HEAD,
working-tree status and tracked diff hash before/after, prompt hash, exit status and conversation
ID. These snapshots do not fingerprint ignored/untracked file contents or prove that no tools
were used; inspect actual artifacts. Success means a
completed AGY response, not verified code or a reliable review.

For a supplied corpus in an isolated directory, add `--snapshot`. `--repo` then names the working
directory (it need not be a Git checkout). Metadata records `inputMode: snapshot`, the prompt hash
and null Git state; source revisions must be in the prompt. Tool permissions still come from
the host/AGY configuration, not this flag. The helper does not silently downgrade checkout mode
to snapshot mode after a Git error.

Verified with CLI 1.5.2 (2026-11-06): `--snapshot` only skips the helper's Git inspection. A snapshot folder nested inside a checkout still lets AGY discover the parent Git workspace; its log attempted to build a patch for an unrelated untracked binary in that parent. For supplied-source-only work, use a temporary directory outside every checkout, verify `git -C <directory> rev-parse --show-toplevel` finds no repository, and provide only the authorized corpus. This reduces ambient workspace discovery; it does not disable AGY tools or replace normal scoped authorization. Do not put private configuration/permission markers in the supplied corpus.

A bounded supplied-source implementation on that CLI produced a final `SUCCESS` response after 223 seconds, within its 300-second budget, with no model tool calls. It returned structured exact-match replacements which the caller converted to a two-file patch and checked with `git apply --check` before applying. A quiet event stream before the deadline was not an empty response: distinguish `init`/`user_input`, active response deltas, final backend result and CLI completion. Prefer small replacement hunks to retransmitting whole files when only visual classes or a render condition change; preserve useful deltas if a deadline is reached. Never restart a live turn merely because it has not streamed text yet.

The same CLI returned `SUCCESS` with an empty response, zero duration/usage and `finished_reason: print_timeout` for a 180-second source review. Attaching the exact conversation without a new prompt showed an interrupted turn that had already spent almost three minutes thinking: those zero fields were not proof of no work or no quota consumption. One final-only collection turn recovered concrete partial findings; retain the original failure and the recovered result separately, verify each finding, and do not relabel it an uninterrupted completed review. Size the deadline from observed first-response latency as well as expected output; ask for concise findings/replacements rather than repeated analysis when collecting an interrupted result.

## Recovery

Apply the [bounded review/recovery policy](../SKILL.md#bound-review-and-recovery-costs) before
using these exception paths. A final `ERROR` with response text is still failure; at most one
justified tool-free retrieval may recover a missing report. Another failed retrieval ends that
recovery, without relaunching the review cohort.

| Observation                                                            | Next action                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nonzero exit / authentication or launch error                          | Inspect retained diagnostics; correct the demonstrated cause before retrying.                                                                                                                                                                    |
| Headless permission auto-denied                                        | Stop dependent access. Use the [interactive permission workflow](permissions-and-browser.md) to obtain a scoped grant, or authorized caller-collected snapshots. Do not repeat a denied request in print mode without a permission-state change. |
| Truncated output / no final result                                     | Treat as incomplete even if some text looks like an answer. Retain raw events and use the recorded conversation ID only after inspecting its state.                                                                                              |
| Completed report invents file paths or cannot cite the supplied source | Verify inputs and request a bounded correction with exact source context; do not treat it as an applied implementation.                                                                                                                          |
| Invalid generated diff                                                 | Keep the original answer; request corrected context or integrate reviewed edits explicitly. Preserve attribution and rerun checks.                                                                                                               |
| Timeout                                                                | The helper stops its CLI invocation; the backend turn may still exist. Inspect the owned session before another run. No automatic replay.                                                                                                        |

Observed on Windows CLI 1.4.12 (2026-11-03): a complete `result` with `SUCCESS` and a
nonempty supplied-source proposal arrived before the CLI exited; the process stayed open until
the helper deadline and the run correctly remained `timeout`. Preserve the original run status
and distinguish the completed backend response from successful CLI collection. Inspect the
normal captured final event for useful proposed edits, integrate only after source review, and
run caller checks. Do not relaunch generation solely because process shutdown stalled or label
the timed-out invocation a successful run. No private conversation-database access is needed.

Resume with `--conversation ID` and an explicit `--model`, never the global most-recent session.
On CLI 1.5.0, an idle attachment without `--model` displayed the global Argon default for a
conversation originally run with Flash. No turn was started on that attachment. Verify the
model before sending a recovery prompt; the conversation id alone does not preserve model choice. Give resumed reviewers the
new HEAD/diff and stale assumptions to discard. Use a fresh session for independent assessment.
No permission bypass or auto-approval switch is part of this skill. Normal, explicitly authorized
MCP registration and scoped interactive tool grants are described in
[permissions-and-browser.md](permissions-and-browser.md); they do not disable permission checks.

## Helper verification

Run `python -m unittest discover -s .agents/skills/agy/scripts -p 'test_*.py'` from the repository
root. These standard-library tests do not call AGY or consume external model usage; CI runs them
with `python3`. An actual protocol smoke test additionally needs a connected AGY installation.
For a sandbox with an unwritable temporary directory, use the host's permitted scratch directory
or normal approved test execution rather than treating filesystem-denied tests as code failures.

## Host discovery

Canonical repo location: `.agents/skills/agy/`. Codex supports repository skills there and explicit
`$agy` / `/skills` invocation ([official OpenAI documentation](https://learn.chatgpt.com/docs/build-skills)).
Other agents can read the same entrypoint via `AGENTS.md`; native invocation/discovery depends on
the host. A thin `.claude/skills/agy/SKILL.md` exposes `/agy` in Claude Code
([official Claude documentation](https://code.claude.com/docs/en/skills)) and links to the same
canonical entrypoint instead of forking its procedure.
