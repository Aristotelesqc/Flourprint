# Normal AGY permissions and running-browser access

Verified with Antigravity CLI **1.3.4**, Gemini **3.8 Flash high**, on Windows on 2026-10-13.
Recheck installed help and actual tool schemas when versions differ. This supplements the
headless launcher; it does not replace successful source/research runs with interactive sessions.

## Diagnose two separate prerequisites

1. **Permission:** a print/headless run can auto-deny a tool because no confirmation UI is
   attached. This is not evidence of a firewall, lost login or an unreachable website.
2. **Capability:** successful `read_url_content` retrieves text; it cannot click through a
   running app. Inspect the exposed browser tools and `agy mcp list`. This installation had no
   browser MCP until one was explicitly registered. Do not assume `browser_subagent` exists.

An `ask_question` answer relays human authorization but does **not** update technical tool
permissions. Require an actual Read URL/MCP confirmation and successful tool result. An agent's
statement that access is granted is insufficient evidence.

An implementation conversation also returned a plan instead of edits because the agent expected
`[READ-TOKEN]` / `[WRITE-TOKEN]` in its assignment. These were that agent's prompt conventions,
not CLI permission settings. The caller relayed the owner's existing scoped implementation
authorization with those markers, explicitly retaining normal tool checks; subsequent source
edits succeeded. Do not invent authorization, require these markers universally, or mistake them
for technical grants. Verify actual tool results and the diff rather than a self-approved plan.

Also distinguish tool denial from a package-manager failure. In this implementation,
`run_command` ran `pnpm exec tsc -b` through the host's bundled runtime and attempted an automatic
install, which failed with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. That is not a repository
read/write permission rejection. Confirm the repository's pinned pnpm and actual command path;
do not blindly disable purge confirmation or count the compiler as having run. The caller
restored missing dependency links with the existing lockfile and offline cache, without a version
change. Delegate validation and independent caller validation must each record their real result.

## Recover through the normal interactive confirmation

Reuse existing human authorization for the same repository, preview and reviewer scope.
When recovery is authorized, use the host's approved execution path with a **PTY** and the
native executable. Resume the exact owned conversation, never the global most-recent one:

```text
agy --conversation <recorded-id> --model gemini-3.8-flash-high --mode plan --log-file <private-log> --prompt-interactive <bounded-permission-and-probe-brief>
```

- Unlike `--print`, this presents actual tool confirmation menus. `--prompt-interactive` is
  also available as `-i`; do not combine it with the stream-json print helper.
- After a previous denial, obtain a normal scoped grant before continuing access. The
  interactive tool-confirmation path can present the pending request for that decision; do
  not route around it through shell networking or another client.
- Inspect the pending **tool, origin/arguments and scope**. Grant only the already-authorized
  action. Where suitable, choose **allow in this conversation**, rather than persist to
  settings. The observed menus used arrows/Enter; inspect current options instead of assuming
  an index. Never build an automatic approval loop.
- Permission prompts remain enabled. Do not use `--dangerously-skip-permissions`, disable
  checks, edit global allow-all settings or treat execution mode as an access grant.
- Confirm the real result, e.g. retrieved build identity or a rendered browser snapshot. A
  request presented to the user is not a grant; a grant is not a completed UI review.
- Keep the interactive session attached while reviewers run so newly needed scoped tools can
  present their normal prompts. Record the conversation ID and approved scopes in private
  evidence. Inspect the owned transcript when the animated terminal output obscures a result.
- To restart after MCP registration, interrupt/close only the owned session and resume its exact
  conversation. The observed CLI required a second Ctrl+C to exit; verify exit before attaching
  another terminal to the same conversation. An interrupted backend turn is not a completed report.

A later server restart stopped the owned children and presented Read URL and browser MCP
confirmations again, even when resuming the exact coordinator conversation. Conversation IDs
do not prove that runtime grants survived a server restart. Re-establish required tools through
normal scoped confirmations and verify their actual results before creating new reviewers;
keep interrupted reports distinct from completed acceptance evidence.

The observed coordinator grants for Read URL and browser navigation/snapshot/screenshot/click
were inherited by its actual invoked subagent. Verify this with the **first child's real tool
result**; do not assume inheritance for another version, conversation or newly requested tool.
Establish the tools needed for the planned journeys in the coordinator before creating the
reviewers. A console grant added after Reviewer 2 was created did not remove that child's
pending console confirmation. Do not assume later coordinator grants propagate into a running
child; confirm inheritance or restart that review only after the scoped grants exist.
New child tools can remain pending even when the parent's last transcript entry says it is
waiting. Inspect the attached terminal's child-approval panel: the observed UI showed the
specific tool/arguments with `ctrl+k approve` and `alt+j manage`. Approve a pending action only
after inspecting its scope; these shortcuts do not justify bulk approval. The first child's
`browser_press_key({"key":"Escape"})` resumed after that normal parent-side confirmation.
The child panel's one-off approval did not grant later calls: a second console-read request
expired after 60 seconds awaiting confirmation and was recorded as denied. Check the panel
frequently while new tools are introduced. Prefer a normal conversation-scoped tool grant
where the UI offers it and the repeated scope is authorized (since CLI 1.4.6, choosing _allow for
this conversation_ in either the main agent or a subagent applies across the main conversation and
all of its subagents, though callers should still establish expected grants up front and confirm
actual tool results). After an expiry/denial, record
the untested case or obtain a fresh scoped permission-state decision before dependent access;
do not silently retry the failed call. (CLI 1.4.10+ also downscales attached screenshots to at
most 2000 px per side automatically, and CLI 1.5.1+ preserves CRLF line endings during Windows
file edits.)

When the parent terminal was lost, later children returned source/bundle analyses after tool
confirmation timeouts. A coordinator initially described these as runtime passes; inspection of
the actual reports corrected that classification. Retain the partial reports rather than count
them as independent app use. A verified recovery was attaching a PTY directly to the exact
existing Gemini child conversation, keeping the parent idle and browser journeys sequential.
Normal child-scoped navigation and click confirmations then surfaced and returned actual UI
results. This remains the original child's review, rather than parent proxy use or a substitute
provider. Verify the child is idle before attaching, and verify each needed grant/result again.
Direct attachment does not remove the child's timeout: click and snapshot prompts still expired
after 60 seconds when caller input arrived late. Establish needed conversation-scoped grants
before lengthy independent work, and inspect the attached terminal every 15–30 seconds while
new tools can request confirmation. Retain expired requests as partial setup, not completed use.

## Scope Windows Android access to one session

Verified with CLI **1.4.12**, **Gemini 3.8 Flash high**, and Google's Android CLI
**1.1.16717390** on Windows, 2026-11-01. Use this when an authorized live emulator review
stalls on repeated command/file confirmations. The caller prepares the disposable emulator and
exact APK using [device-check](../../flourprint-device-check/SKILL.md); the delegate operates the
app. Keep the personal app, phone and unrelated data outside the assignment.

Windows PowerShell commands beginning with `& '.../android.exe'` did not receive reusable
coverage from a shorter conversation-scoped prefix. The official
[permission documentation](https://antigravity.google/docs/permissions?tab=cli) explains that
Windows commands that cannot be split require an exact match; `command(regex:...)` matches the
raw command. Do not infer a network or login problem from another confirmation.

1. Inspect installed help and `/permissions` without saving changes. Use `--settings <file>`:
   the documented override is **session-only**, unlike editing global/project settings.
   Keep `toolPermission: request-review` and terminal isolation enabled. `deny` overrides `ask`,
   which overrides `allow`; `strict` still asks for allowed tools. Diagnose an overriding rule
   rather than removing it. Never use an allow-all mode or a generic shell/interpreter grant.
2. Generate an ignored UTF-8 settings file with anchored rules for the **resolved executable,
   emulator serial, necessary operations and capture directory**. Escape literal paths before
   inserting them into regexes, then serialize JSON rather than hand-escaping it. For example:

   ```python
   import json, re
   from pathlib import Path

   android = "C:/replace-with-resolved-path/android.exe"
   captures = "C:/replace-with-approved-capture-directory"
   serial = "emulator-5554"
   prefix = rf"^& '{re.escape(android)}' "
   device = re.escape(serial)
   patterns = [
       prefix + rf"layout --device {device} --flat$",
       prefix + rf"screen capture --device {device} -o '"
       + re.escape(captures) + r"/[A-Za-z0-9_-]+\.png'$",
       prefix + rf"input --device {device} tap '[^'\r\n]+' --wait=10000$",
   ]
   settings = {
       "agentMode": "",
       "toolPermission": "request-review",
       "enableTerminalSandbox": True,
       "permissions": {"allow": [f"command(regex:{p})" for p in patterns]},
   }
   Path(".agy-runs/session-settings.json").write_text(
       json.dumps(settings, indent=2) + "\n", encoding="utf-8"
   )
   ```

   Add equally bounded forms for the assigned text, scroll or Back actions when needed.
   Give the delegate the exact command forms: **one native command per tool call**, literal
   single-quoted arguments, no shell chains, expansion, helper scripts or redirection.
   Use the same path spelling and forward slashes in the profile and commands: equivalent
   backslash paths do not match these literal regexes.
   These rules authorize matching commands; they do not enforce which app is foreground.
   The caller must establish the intended test app and retain the assignment's data scope.

3. Launch the native CLI in an attached PTY, adding only the approved artifact directory:

   ```text
   agy --model gemini-3.8-flash-high --settings .agy-runs/session-settings.json --add-dir <capture-directory> --log-file <private-log> --prompt-interactive <bounded-brief>
   ```

   For an already approved live journey, use default request-review mode (`agentMode: ""`
   in the session override). CLI 1.4.12 prepends `/plan` in plan mode, which returned a plan
   instead of app use. Keep normal prompts enabled; do not switch to auto or accept-edits.

   The current stream-json helper does not forward `--settings`; do not invent that helper flag.
   `--add-dir` makes captures available as workspace files; it is not an Android command grant
   and does not restrict access to the original workspace.
   Inspect the effective permission lists before proceeding: the observed override replaced
   the allow list while retaining the existing deny rules and empty ask list.
   Do not supply empty deny/ask lists to clear inherited restrictions. Stop if existing
   restrictions disappear. Confirm global configuration remains unchanged after the session.

4. Prove access with real layout, screenshot **opened by the delegate's image tool**, a harmless
   UI action and fresh visual/layout evidence. The verified probe ran layout, capture, image
   reads and a tap without further confirmation. Check for an open popover before tapping
   a sheet's Close button: successful command execution alone does not prove sheet closure.
   A harmless `Write-Output` control outside the allow rules still presented a confirmation;
   the caller declined it and it did not execute. Keep unexpected requests on the normal
   inspected confirmation path; never auto-approve them. If Android needs its existing cache
   outside terminal isolation, request that through normal scoped tool permissions.
5. Only then resume the exact idle reviewer or start the assigned independent reviewer with
   the same grants. Recheck actual tool results after a restart. Return the report through the
   final response or an explicitly permitted artifact writer; do not mine private conversation
   databases or treat a queued message as a completed report.

   An owner configuration may separately require a plan-scoped private READ marker before
   any tool call. Tool grants do not satisfy that prompt gate. Relay the marker privately only
   for the approved review; read its exact definition from the owner configuration only with
   explicit authorization for that targeted read and relay. Otherwise, the owner supplies it.
   Never extract markers from conversation databases or read unrelated credentials. Keep the
   value in private prompts/artifacts only; redact surfaced transcripts and never put it in
   command arguments, committed files or public reports.

Verified with the same CLI on 2026-11-04: the native CLI also accepts this session profile with
`--input-format stream-json --output-format stream-json`. This is a direct CLI invocation, not
an extra flag supported by `run_agy.py`. The observed session retained `request-review` and
performed actual Android layout, capture, image reads and input with the scoped grants. Check
`step_update.tool_info.output`: a `DONE` tool state alone does not establish successful execution.
An initial Android cache denial remained an access failure; only subsequent successful results
established access.

Exact command forms include optional flags: changing `--wait=10000` to `--wait=5000` missed
the scoped rule. The observed headless turn then ended with `SUCCESS`, an empty response and
`denied_actions`; this was incomplete review evidence. Stop on that denial. Resume the same
reviewer only after a new inspected, scoped permission decision, within the remaining budget;
never infer permission from the final status or retry by rephrasing the command.

For an explicitly authorized private marker relay, keep the value in memory and send it directly
to that CLI's structured stdin. Authorization to relay does not authorize printing the prompt
through a host tool result or saving a marker-bearing prompt file. Redact the value before
retaining any returned events, suppress optional caller-created CLI logs that might echo it, and
never place it in argv. If host approval rejects an exposure point, remove that exposure rather
than weakening permissions or repeating the same action. Record the exact scope of approval;
this procedure grants no access to unrelated configuration or credentials.

Keep the profile, prompts and raw logs private. Publish the source/build, tested environment,
observed interactions and remaining cases on the relevant issue/PR. The access probe alone
does not accept a UI change. See the official [settings reference](https://antigravity.google/docs/settings?tab=cli)
for `--settings` and the session override semantics; recheck these with a different CLI version.

## Supply the missing browser capability when authorized

The owner authorized installing the browser capability to unblock Flourprint review. Use normal
MCP registration, preserving existing servers; installation is not implicit permission to browse
unrelated sites. The official [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp)
supports Antigravity and an isolated Chrome context.

1. Resolve the native AGY/Node paths; inspect `agy help mcp`, `agy mcp list` and
   `agy mcp add --help`. Install a reviewed/pinned MCP version in private **task tooling**, not
   the application dependency manifest. The verified version was `@playwright/mcp@0.0.83`.
2. Register a uniquely named server through `agy mcp add <name> <executable> <args...>`.
   On Windows, an absolute Node executable and absolute CLI/launcher path avoid shell-wrapper
   and PATH ambiguity. The installed CLI requires registration flags **before** the server name.
3. Scope the launcher to the intended Flourprint checkout (fail on another working directory),
   use `--browser chrome --headless --isolated`, and keep artifacts in private task scratch.
   `--viewport-size 360,800` plus a config with `locale: fr-CA` and the intended timezone support
   the narrow French review. Do not connect to the owner's logged-in browser profile.
4. Configure the authorized preview origin using `--allowed-origins <origin>`. This is a
   request filter, **not a security boundary and does not cover redirects** according to the
   upstream documentation. Retain the assignment's site/data scope and normal tool permissions.
   Do not add denied localhost resources or other origins to work around an earlier refusal.
5. Reload the owned interactive conversation and inspect the actual MCP schemas. Approve
   necessary browser tools through their normal scoped confirmations, separately from Read URL.
   Prove navigation, live snapshot, screenshot and an actual UI click on the intended build.
6. Invoke the requested independent Gemini reviewers. If they share one browser, run them
   sequentially with named synthetic fixtures; do not claim independent profiles. Preserve each
   child's identity, raw report, actual interaction evidence and untested cases.

**Artifact trap:** Playwright MCP's `--output-dir` applies to automatically named artifacts.
An explicit `filename` is resolved against the workspace root, even when output-dir is set.
Omit it or specify an approved scratch path. Inspect new/untracked files and correct any misplaced
owned captures; screenshots are not app source changes. `--save-session` supplies a useful
browser interaction record alongside the owned AGY transcript.

Keep browser setup scripts/dependencies and frozen compiled builds in private task tooling
outside the product checkout when possible. Although `eslint.config.js` now ignores `.agy-runs/**`,
`.claude/worktrees/**` and `.codegraph-local/**`, git-ignored directories are not automatically
skipped by every tool: an earlier unchanged `eslint .` scanned a run's helper and minified frozen
assets before those ignores existed. Keeping task-tooling packages outside the product checkout
and updating the launcher through normal `agy mcp add` preserves the checkout guard, isolated
browser and preview origin cleanly. Prompts, reports and screenshots can remain in the documented
scratch directory.

Long `send_message` bodies and transcript fields can be truncated. Keep complete reports
through structured stdout or an explicitly authorized artifact-writing tool; a completion
acknowledgement is not the report. If the reviewer's tool set lacks a report writer, return
bounded textual sections rather than using unsafe browser/Node filesystem tools. The caller
can retain those sections. For an idle completed reviewer, a tool-free `run_agy.py` follow-up
on its exact conversation can retrieve the existing report through the final structured result;
this is report recovery, not another running-app review or permission retry.

## Stop conditions and honest evidence

These diagnosed recovery procedures remain subject to the
[entrypoint's finite budget and owner stop policy](../SKILL.md#bound-review-and-recovery-costs).
They are not prerequisites for routine UI acceptance when Codex can verify the preview directly.

If a normal confirmation is denied or cannot be presented, stop dependent interaction. If tools
remain absent after the authorized setup, report that precise capability gap. Use supplied-source
reviews only as a labelled fallback; do not call four static reports four running-app reviewers.
Do not silently change tools/routes to a denied resource. Do not run an indefinite retry loop.

Record only reviewed setup facts in repo documentation: CLI/MCP versions, scope and observable
results. Keep machine-specific paths, prompts, raw account/session diagnostics and synthetic
browser artifacts in ignored scratch space. Normal grants solve access, not accessibility,
native-device acceptance, visual quality or the PR merge decision.
