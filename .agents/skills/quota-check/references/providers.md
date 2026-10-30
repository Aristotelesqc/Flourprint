# Native quota surfaces

Verified commands and documentation: 2026-10-28. Recheck installed capabilities when they
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

The native interactive **`/usage`** command, alias **`/quota`**, refreshes backend status and
opens the Models & Quota panel. Read all windows for each group actually used by the task.
A group shared by Flash and Pro is one bucket, not two independent budgets. A Claude model
accessed through AGY consumes the AGY group it reports; do not relabel it as a direct
Claude Code account.

On Windows, an approved PTY can open the installed native `agy` executable, send
`/usage` + Enter, and read the panel. Scroll for additional groups. Exit the panel and the
owned idle CLI afterward; do not leave a model prompt running. No source prompt or model
generation is needed. Normal sign-in/workspace trust may be required: reuse existing scoped
authorization; never disable permission checks or create an auto-approval loop.

Verified locally with AGY 1.4.9: the panel reports separate Gemini and Claude/GPT groups, including
weekly and five-hour **remaining** percentages. Preserve their precision. Opening the panel is
not a guarantee that every older CLI or headless host can expose it.

If a headless/remote harness cannot access the native panel, mark quota UNAVAILABLE and use the
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
