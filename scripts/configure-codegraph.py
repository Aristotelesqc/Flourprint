"""Generate absolute, checkout-local client configs after installing the pinned engine."""
from pathlib import Path
import json
import subprocess

root = Path(__file__).resolve().parent.parent
if not Path.cwd().resolve().is_relative_to(root):
    raise SystemExit("Configure only from this Flourprint checkout")
# Reuse the launcher's origin/workspace/version checks without starting an MCP daemon.
binary = root / ".codegraph-local/bin/v0.21.0/codegraph-server.exe"
if not binary.exists():
    raise SystemExit("Install the pinned engine first: docs/tooling/codegraph.md")
origin = subprocess.check_output(["git", "remote", "get-url", "origin"], cwd=root, text=True).strip()
if origin.rstrip("/").removesuffix(".git").lower() not in (
    "https://github.com/aristotelesqc/flourprint",
    "git@github.com:aristotelesqc/flourprint",
):
    raise SystemExit("Not the Flourprint repository")
entry = {"command": "node", "args": [str(root / "scripts/start-codegraph.mjs")], "cwd": str(root)}
codex = root / ".codex/config.toml"
codex.parent.mkdir(exist_ok=True)
if not codex.exists():
    codex.write_text(
        '[mcp_servers.codegraph]\ncommand = "node"\nargs = '
        + json.dumps(entry["args"])
        + "\ncwd = " + json.dumps(str(root)) + "\nstartup_timeout_sec = 60\n",
        encoding="utf-8",
    )
else:
    print("Preserving existing Codex config; use the explicit client launcher or merge the entry")
for target in [root / ".mcp.json", root / ".agents/mcp_config.json"]:
    data = json.loads(target.read_text(encoding="utf-8-sig")) if target.exists() else {}
    servers = data.setdefault("mcpServers", {})
    if "codegraph" in servers and servers["codegraph"] != entry:
        raise SystemExit(f"Preserving conflicting existing CodeGraph entry in {target}")
    servers["codegraph"] = entry
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print("CodeGraph configurations generated only in this checkout")
