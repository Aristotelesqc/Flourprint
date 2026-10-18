# Windows delegation from Codex

Investigated 2026-10-18 using official documentation, upstream issue follow-ups and retained
Flourprint transcripts. Local evidence below is specific to the installed CLI, not a promise
about every Windows setup. No dependency, permission setting or account configuration changed.

## What actually failed in #133

Both supplied-source runs used `gemini-3.8-flash-high`, structured stdin/stdout and no tools.

| Run                                        | Prompt / returned text     | Result                       | Reported usage                                                 |
| ------------------------------------------ | -------------------------- | ---------------------------- | -------------------------------------------------------------- |
| Buttons, icon buttons, guides and helper   | 27,245 / 19,552 characters | `SUCCESS`, about 246 seconds | 27,928 input; 48,039 output, including 42,224 thinking tokens  |
| Six component pairs, twelve complete files | 41,793 / 37,755 characters | `ERROR`, about 352 seconds   | 105,187 input; 73,232 output, including 60,839 thinking tokens |

The second terminal error explicitly says the previous response exceeded the output-token limit
and requests a shorter continuation. Its returned file map also fails strict JSON parsing.
These are different problems: output exhaustion caused the failed turn; hand-escaped, multi-file
JSON made partial output difficult to recover. Neither run used a JSON schema. A prompt asking
for up to 14,000 words in the first run was not an enforceable output budget.

The raw run records remain in private task scratch under `review-133-2026-10-18`; prompts,
account diagnostics and generated code are not reproduced here. This evidence does not explain
every earlier empty response or permission failure.

## Current local check

- Native CLI: **1.4.2**. Its help supports `--json-schema` and `--effort`; the installed
  print-timeout default is **0**, despite the headless page describing five minutes. Always
  specify a ceiling and a separate caller watchdog.
- Model discovery failed inside the restricted host with keyring-access and DNS errors, then
  succeeded through normal approved host execution using the same native executable. Flash
  3.8 high is available. This was not evidence that the owner's account needed a new login.
- One diagnostic, bounded to 90 seconds, used redirected stdin/stdout and `CREATE_NO_WINDOW`.
  AGY successfully read a synthetic `canary.txt` with one completed native `view_file` call,
  returned the expected marker in schema-valid `structured_output`, and exited zero in
  **32.2 seconds**. No permission change, shell command, browser or child agent was used.
- The free-text `response` contained two extra fields absent from the requested schema;
  `structured_output` contained exactly the required fields. Consume and validate the latter.
  This proves a small transport/schema/read case, not project-wide writes, tests or browser access.

## Vendor guidance and version caveats

- [CLI best practices](https://www.antigravity.google/docs/cli/best-practices/) recommends
  focused source context, workspace rules, visual evidence for UI work and executable local
  verification. Apply these to a small assignment with measurable acceptance, without restarting
  a planning or review campaign for each mechanical correction.
- [Headless protocol](https://www.antigravity.google/docs/cli/headless/) documents NDJSON user
  messages, progress events, terminal results and `--json-schema`. Close stdin after the last
  prompt. An output-format flag wraps the response; it does not constrain generated source code.
  Ask-mode tools may be soft-denied even when the CLI exits zero. Require actual tool evidence.
- [Effort controls](https://antigravity.google/docs/cli/commands/effort/) documents a per-run
  `--effort` override. The older runs spent substantial usage on thinking, but no lower-effort
  comparison was run. Keep the owner's selected model; propose an explicit lower-effort trial
  for mechanical edits rather than claiming an unmeasured speedup or silently changing models.
- [Permissions](https://www.agy.dev/docs/permissions/) documents `Deny > Ask > Allow`, recursive
  directory targets, and Windows command cases requiring exact matches or `regex:`. A broader
  Ask rule can override an Allow. Do not infer a technical grant from assignment text.
- [Upstream #548](https://github.com/google-antigravity/antigravity-cli/issues/548), especially
  its September follow-ups, reports narrower problems than its title: different grant stores,
  project selection and Windows command matching. It also reports cwd not always loading workspace
  rules without `--add-dir`. Verify the actual workspace/rules and loaded grant source; select
  only an existing project identity. These reports are not proof of the same defect in 1.4.2
  and do not authorize editing global/project grants.
- [Upstream #508](https://github.com/google-antigravity/antigravity-cli/issues/508) was closed
  with a maintainer statement that non-console stdin hangs were fixed in 1.1.1 and Windows stdout
  capture in 1.0.15. Do not install a PTY bridge or create a console solely from the old report;
  the current no-console canary succeeded. Interactive permission UI remains a separate use case.
- [Upstream #614](https://github.com/google-antigravity/antigravity-cli/issues/614) reports
  spaced executable-path and directory-glob failures. Inspect the exact requested command/path;
  do not copy its broad wildcard workarounds. Treat reports as version-specific hypotheses.
- [Upstream #1161](https://github.com/google-antigravity/antigravity-cli/issues/1161) reports
  shell startup hanging under an administrator-enforced Windows sandbox on 1.2.16. Distinguish
  a started-but-stuck command from a refused tool or model-output failure; do not disable policy.
- [Changelog](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md)
  records object-root schema requirements in 1.2.14 and Windows sandbox compatibility fixes in
  1.4.1. Installed help and observed results take precedence over stale examples. No CLI update
  was needed for the current check.
- The [community Codex adapter](https://github.com/IlleJiViN/codex-antigravity-subagent)
  implements bounded headless delegation while leaving verification to Codex. It is not a vendor
  integration. A new wrapper would not remove an oversized answer or an unavailable tool grant;
  none was installed during this investigation.

## Practical assignment and collection

Prefer direct edits when the assigned checkout and scoped tools actually work: return a short
summary, touched paths and real check results instead of echoing the source tree. Otherwise use
authorized supplied source with one component or a small cohesive diff. An example brief:

```text
Implement one change to fp.button at the supplied HEAD.
Mode: supplied-source only; do not use tools.
Allowed outputs: button/v1.tsx and button/v1.css only. Shared motion APIs are read-only.
Goal: a 40 px painted shape inside a 48 px actual target; preserve existing behavior.
Acceptance: no target overlap at 393/100 and 360/130; OS or manual reduced motion removes motion.
Reuse the supplied selected-motion API. No new dependency, token, message or public prop.
Return a focused unified diff and at most five notes. Do not repeat unchanged files.
If a needed API is missing, identify it and stop. No tools or tests are claimed in snapshot mode.
Codex reviews, applies and verifies. One turn, three minutes; no delegated reviewers or retries.
```

These sizes/budgets are starting points, not vendor limits or mandatory limits for every task.
For visual design, give the reference image through a supported visual channel or proven browser
tool; a pathname or textual description alone is not evidence that Gemini saw the reference.

When structured findings are necessary, use a small object-root schema and validate its status,
paths and content. A schema does not increase output capacity or establish code correctness.
The current `run_agy.py` helper does **not** expose `--json-schema` or `--effort`; do not invent
those helper options. The canary used a private native invocation with the same NDJSON protocol.
Adding helper options is a separate script change, subject to its owner's review.

Watch retained progress while the process runs. At the first output-limit error, split the task;
do not resume a giant JSON answer repeatedly. On a soft-denied tool, stop dependent work and
diagnose the scoped grant. On quota/network errors, retain the actual terminal cause. A live
process, many tokens, successful envelope or available browser tool is not completed acceptance.
Use the existing bounded recovery policy; never relaunch a whole review cohort for this setup.
