# CLI protocol and recovery

These observations were verified with the installed Antigravity CLI on 2026-10-11. Recheck
`agy --help` and `agy models` when flags or models differ; this is not a frozen vendor API.

## Invocation

- Launch from the intended checkout. `--project` selects an AGY project identity, not a filesystem
  path; omit it unless an actual project ID/name has been established. Do not invent one.
- `--mode plan` is the review/default mode. Use `accept-edits` only for an assigned implementation
  with permitted paths and working permissions. `--sandbox` restricts terminal execution; it is
  not an assertion that all reads/writes are allowed or that the checkout is read-only.
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

## Recovery

| Observation                                                            | Next action                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nonzero exit / authentication or launch error                          | Inspect retained diagnostics; correct the demonstrated cause before retrying.                                                                                                                                                                    |
| Headless permission auto-denied                                        | Stop dependent access. Use the [interactive permission workflow](permissions-and-browser.md) to obtain a scoped grant, or authorized caller-collected snapshots. Do not repeat a denied request in print mode without a permission-state change. |
| Truncated output / no final result                                     | Treat as incomplete even if some text looks like an answer. Retain raw events and use the recorded conversation ID only after inspecting its state.                                                                                              |
| Completed report invents file paths or cannot cite the supplied source | Verify inputs and request a bounded correction with exact source context; do not treat it as an applied implementation.                                                                                                                          |
| Invalid generated diff                                                 | Keep the original answer; request corrected context or integrate reviewed edits explicitly. Preserve attribution and rerun checks.                                                                                                               |
| Timeout                                                                | The helper stops its CLI invocation; the backend turn may still exist. Inspect the owned session before another run. No automatic replay.                                                                                                        |

Resume with `--conversation ID`, never the global most-recent session. Give resumed reviewers the
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
