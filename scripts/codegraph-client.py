"""Explicit checkout-only Codex/Claude launches; never writes global MCP settings."""
from pathlib import Path
import json
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
if not Path.cwd().resolve().is_relative_to(root):
    raise SystemExit("Launch only from this Flourprint checkout")
if len(sys.argv) < 2 or sys.argv[1] not in ("codex", "claude"):
    raise SystemExit("Usage: python scripts/codegraph-client.py codex|claude [client args]")
client = sys.argv[1]
executable = shutil.which(client)
if executable is None:
    raise SystemExit(f"{client} is not installed")
entry = {
    "command": "node",
    "args": [str(Path(__file__).resolve().parent / "start-codegraph.mjs")],
    "cwd": str(root),
}
if any(arg in ("--cd", "-C", "--add-dir") for arg in sys.argv[2:]):
    raise SystemExit("Changing the client workspace is not supported by this launcher")
if client == "codex":
    args = [executable]
    for name, value in entry.items():
        args += ["-c", f"mcp_servers.codegraph.{name}=" + json.dumps(value)]
    args += ["-c", "mcp_servers.codegraph.startup_timeout_sec=60"]
else:
    approval = root / ".codegraph-local/claude-approval.json"
    approval.parent.mkdir(exist_ok=True)
    approval.write_text(json.dumps({"enabledMcpjsonServers": ["codegraph"]}), encoding="utf-8")
    args = [executable, "--settings", str(approval)]
raise SystemExit(subprocess.call([*args, *sys.argv[2:]], cwd=root))
