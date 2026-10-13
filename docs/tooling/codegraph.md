# Checkout-local CodeGraph

CodeGraph is an optional structural lookup tool, requested by the owner following the PR #38
audit. Contracts, source, tests and direct searches remain authoritative. It is not a prerequisite
for UI work and does not change the app's dependencies.

## Installation and scope

Use [codegraph-ai/CodeGraph](https://github.com/codegraph-ai/CodeGraph), pinned to **0.21.0**.
This Windows setup needs Node and Python 3.10+, already used by the development tools. Download
these assets from the [tagged release](https://github.com/codegraph-ai/CodeGraph/releases/tag/v0.21.0)
into `.codegraph-local/bin/v0.21.0/`, renaming the executable to `codegraph-server.exe`:

| Release asset                    | SHA-256                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `codegraph-server-win32-x64.exe` | `2bdaf5c123724fb5ae18789c74db17bd4a77191efb1c63dc25d94d505480a404` |
| `onnxruntime.dll`                | `52f8ebe8f08f369a44fed6d1cb680c7c89169795e1c2949ee25b88b538ef0948` |

Check each hash with `Get-FileHash -Algorithm SHA256` before executing. From the checkout root:

```text
python scripts/configure-codegraph.py
python scripts/codegraph-client.py codex mcp get codegraph --json
python scripts/codegraph-client.py claude mcp get codegraph
```

The generator writes ignored, absolute-path configs in this checkout only:
`.codex/config.toml`, `.mcp.json`, `.agents/mcp_config.json`. It preserves existing settings and
refuses conflicting CodeGraph JSON entries. Rerun after moving the checkout. It does not install
or register a global server. Do not use global `codex mcp add` or `agy mcp add` as a fallback.

`start-codegraph.mjs` fixes the workspace to its repository root, checks the Flourprint origin and
rejects invocation from outside that checkout. It starts the pinned engine with `--graph-only`
and the eight-tool `core` profile. No embeddings, memory tools or automatic unrelated-repo
indexing are enabled. `.codegraphignore` and explicit directory exclusions omit `dogfood/`,
credentials, environment files, agent state, dependencies, builds, logs and local data. Review
exclusions before introducing another private data directory. This is an indexing boundary,
not an operating-system sandbox for arbitrary developer commands.

Upstream stores the reconstructible graph cache under the user's `.codegraph/`, keyed by
workspace. Version 0.21.0 does not provide a separate cache-directory flag. That cache is local,
outside Git, and contains no autonomous agent memory. Do not redirect `HOME` to disguise it.

## Client evidence and limits (2026-10-12)

| Client                     | Observed result                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex CLI 0.162.0-alpha.2  | An ephemeral app-server thread connected to 0.21.0 and enumerated the eight core tools using invocation-scoped settings. Local config discovery varied with project trust; the explicit launcher avoids reliance on discovery. Desktop UI loading was not verified. |
| Claude Code local 2.1.272  | `mcp get codegraph` reported Connected with the explicit launcher's server-specific approval. Without approval, the client reported Pending. Cloud Claude has no access to this local installation.                                                                 |
| AGY CLI 1.3.3              | `.agents/mcp_config.json` was written, but `mcp list` and an interactive run did not discover CodeGraph. A headless tool attempt was permission-denied. Configuration is prepared; integration is not verified or operational in this client.                       |
| Antigravity desktop 2.22.0 | Project config prepared. Desktop MCP discovery/connection was not verified with the available tools. No global settings were changed to work around it.                                                                                                             |

An installed config is not evidence of a working client connection. Client updates or project
trust changes require a fresh check. The launchers allow normal client approvals; they do not
disable permission checks. For a main checkout kept on an older branch, equivalent ignored
launchers can live in `.codegraph-local/` without changing product files or the branch.

## Use and limitations

Start with symbol lookup or edit context, then inspect the actual file and callers. For an
occasional structural query, the local launcher also supports:

```text
node scripts/start-codegraph.mjs --query codegraph_get_module_summary "{}"
```

The `graph` profile is not additive to `core` in this upstream version. The launcher provides
only an explicit allowlist of one-shot structural queries, without changing MCP registration.
Checks on the current repository found TypeScript arrow-function names reduced to
`arrow_function` and parser warnings on some dynamic imports. A module-level search result is
not proof that the function or every call edge was indexed. Confirm impact with `rg`, source
inspection and relevant tests. Evaluate benefit on real changes before expanding the tool scope.
