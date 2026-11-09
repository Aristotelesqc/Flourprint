# Native quota surfaces

Verified commands and documentation: 2026-11-07. Recheck installed capabilities when they
change. Native account sources win over remembered plan limits.

## Codex

Use the host's read-only usage-limits tool when available (in the Codex desktop app:
`get_usage_limits`). Prefer `rateLimitsByLimitId` to the legacy single-bucket field.
`usedPercent` is consumed capacity: remaining = 100 minus used, bounded to 0–100.
Read every applicable five-hour/weekly window and reset timestamp. Missing fields are unavailable.

Other Codex harnesses may expose a native usage/status panel instead. Do not assume this app's
tool exists in a CLI or cloud session. Reading usage does not redeem a reset.

## Claude Code

Use the native `/usage` panel for the signed-in account. Capture the plan windows and reset
times it actually shows. For API billing, session token/cost figures are spend estimates, not a
subscription quota percentage; record unavailable windows instead of inventing a denominator.

Official reference: [Claude Code usage and costs](https://code.claude.com/docs/en/costs#using-the-usage-command).
The exact active model and installed command set come from that harness, not this document.

## Antigravity / AGY, including a delegate provider

Follow [the AGY skill](../../agy/SKILL.md#check-provider-quota) when coordinating AGY.
The installed CLI's `models` command lists availability, not remaining quota. Per-turn
`usage` in a generated response is token accounting, not the account's quota.

Prefer the headless slash-command query with normal host access to AGY's session storage:

```text
agy -p "/usage" --output-format json
```

Do not pass `--disable-slash-commands` on this call. Verified locally with AGY 1.5.3: the
command runs client-side (`num_turns: 0`, zero model tokens, no PTY or scrolling required) and
returns `command.data.groups`, each with `buckets` carrying `window` (`5h`, `weekly`), exact
floating-point `remaining_fraction` (`0` to `1`), and UTC `reset_time`. Read all windows for
every group actually used by the task: `Gemini Models` (shared by Flash and Pro as one bucket,
not two independent budgets), `Claude and GPT models` (any Claude/GPT model accessed through AGY
consumes this AGY bucket rather than a direct Claude Code account), and on Pro plans a separate
`Gemini 4 Argon` weekly bucket.

In an attached interactive TUI session, `/usage` (alias `/quota`) refreshes backend status and
opens the same Models & Quota panel visually. If using a PTY fallback on an older CLI, scroll
for additional groups and exit the owned idle CLI afterward without leaving a model prompt open;
reuse existing scoped authorization and never disable permission checks or build an auto-approval
loop.

If a restricted or remote harness cannot execute `/usage`, mark quota UNAVAILABLE and use the
bounded policy. Do not scrape credentials, call guessed private endpoints, install an extension
or ask a model to infer its quota. Do not change credit-overage settings.

Official references: [AGY usage panel](https://antigravity.google/docs/cli/commands/usage),
[CLI command reference](https://antigravity.google/docs/cli/reference/).

## Observation example

Synthetic placeholders only; keep real account observations local:

```text
Measured: <native ISO timestamp with timezone>
Coordinator: Codex; source=get_usage_limits; metric=usedPercent
Windows: five-hour used=<value>, weekly used=<value>; resets=<native values>
Delegates: AGY Gemini group; source=/usage; metric=remaining
Windows: five-hour remaining=<value>, weekly remaining=<value>; resets=<native text>
Closure reserve: 20 percentage points (no comparable completed closure yet)
Decision: CONTINUE for a bounded tranche
Next quota check: <next expensive delegation, major work boundary, or new tranche>
```

This is a schema example, never a real or reusable current quota reading.
