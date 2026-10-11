#!/usr/bin/env python3
"""Run one bounded AGY turn from a UTF-8 prompt file, retaining verifiable local artifacts."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def executable(value):
    candidate = shutil.which(value) or str(Path(value).resolve())
    path = Path(candidate)
    if path.suffix.lower() in (".cmd", ".bat", ".ps1"):
        native = path.with_suffix(".exe")
        if native.is_file():
            path = native
        else:
            raise ValueError("Use --agy with a native AGY executable, not a shell wrapper")
    if not path.is_file():
        raise ValueError("AGY not found; resolve it on PATH or supply --agy with its native executable")
    return str(path.resolve())


def git_state(repo):
    def read(*args):
        result = subprocess.run(
            ["git", "-C", str(repo), *args], check=True, capture_output=True,
            timeout=10,
        )
        return result.stdout
    return {
        "head": read("rev-parse", "HEAD").decode("utf-8").strip(),
        "status": read("status", "--porcelain").decode("utf-8").rstrip("\r\n"),
        "trackedDiffSha256": hashlib.sha256(read("diff", "--no-ext-diff", "--binary", "HEAD", "--")).hexdigest(),
    }


def extract_result(path):
    """Accept only a final result, never a streamed partial response or a successful exit alone."""
    result = None
    conversation = None
    ignored = 0
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            ignored += 1
            continue
        if not isinstance(event, dict):
            ignored += 1
            continue
        if event.get("event") == "init":
            init = event.get("init") if isinstance(event.get("init"), dict) else {}
            conversation = event.get("conversation_id") or init.get("conversation_id") or conversation
        if event.get("event") == "result":
            # A malformed final event invalidates an earlier result instead of hiding it.
            result = event.get("result") if isinstance(event.get("result"), dict) else {}
    if isinstance(result, dict):
        conversation = result.get("conversation_id") or conversation
    return result, conversation, ignored


def run(args):
    repo = Path(args.repo).resolve(strict=True)
    if not repo.is_dir():
        raise ValueError("--repo must be a working directory")
    prompt_path = Path(args.prompt).resolve(strict=True)
    prompt = prompt_path.read_text(encoding="utf-8-sig")
    if not prompt.strip():
        raise ValueError("The prompt is empty")
    output = Path(args.out).resolve()
    if output.exists():
        raise ValueError("--out must be a new directory; do not mix or overwrite earlier runs")
    cli = executable(args.agy)
    before = None if args.snapshot else git_state(repo)
    command = [
        cli, "--model", args.model, "--mode", args.mode, "--sandbox",
        "--log-file", str(output / "agy.log"), "--print-timeout", f"{args.timeout}s",
        "--input-format", "stream-json", "--output-format", "stream-json",
    ]
    if args.conversation:
        command.extend(["--conversation", args.conversation])
    metadata = {
        "model": args.model, "mode": args.mode, "inputMode": "snapshot" if args.snapshot else "checkout",
        "repo": str(repo), "before": before,
        "promptPath": str(prompt_path), "promptSha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "requestedConversation": args.conversation, "timeoutSeconds": args.timeout,
        "command": command,
    }
    if args.dry_run:
        print(json.dumps({**metadata, "status": "dry_run"}, indent=2))
        return 0
    output.mkdir(parents=True, exist_ok=False)
    input_path = output / "input.ndjson"
    event = {"event": "user", "message": {"role": "user", "content": prompt}}
    input_path.write_text(json.dumps(event, ensure_ascii=False) + "\n", encoding="utf-8")
    metadata.update({"startedAt": utc_now(), "status": "running"})
    write_json(output / "run.json", metadata)
    exit_code = None
    status = "launch_failed"
    error = None
    try:
        with input_path.open("rb") as source, (output / "events.ndjson").open("wb") as stdout, (output / "stderr.log").open("wb") as stderr:
            process = subprocess.run(
                command, cwd=repo, stdin=source, stdout=stdout, stderr=stderr,
                timeout=args.timeout + 10,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
        exit_code = process.returncode
        status = "cli_failed" if exit_code else "missing_result"
    except subprocess.TimeoutExpired:
        status = "timeout"
    except OSError as cause:
        error = str(cause)
    try:
        result, conversation, ignored = extract_result(output / "events.ndjson")
    except OSError as cause:
        result, conversation, ignored = None, None, 0
        error = error or str(cause)
        if exit_code == 0:
            status = "capture_failed"
    if exit_code == 0 and result is not None:
        response = result.get("response")
        if result.get("status") != "SUCCESS":
            status = "agent_failed"
        elif not isinstance(response, str) or not response.strip():
            status = "empty_response"
        else:
            status = "success"
            (output / "report.md").write_text(response, encoding="utf-8")
    try:
        after = None if args.snapshot else git_state(repo)
    except (OSError, subprocess.SubprocessError) as cause:
        after = {"error": str(cause)}
    metadata.update({
        "completedAt": utc_now(), "status": status, "exitCode": exit_code,
        "conversationId": conversation, "agentStatus": result.get("status") if result else None,
        "usage": result.get("usage") if result else None, "nonJsonLines": ignored,
        "after": after, "gitStateChanged": None if args.snapshot else before != after,
    })
    if error:
        metadata["error"] = error
    write_json(output / "run.json", metadata)
    print(json.dumps({"status": status, "conversationId": conversation, "output": str(output)}, indent=2))
    return 0 if status == "success" else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--model", required=True, help="Explicit model ID verified with agy models")
    parser.add_argument("--mode", choices=("plan", "accept-edits"), default="plan")
    parser.add_argument("--timeout", type=int, default=600, help="Bounded turn budget in seconds")
    parser.add_argument("--conversation", help="Exact session to resume; never inferred from most recent")
    parser.add_argument("--snapshot", action="store_true", help="Analyze supplied sources from a working directory without Git inspection")
    parser.add_argument("--agy", default="agy.exe" if os.name == "nt" else "agy")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    try:
        return run(args)
    except (OSError, ValueError, subprocess.SubprocessError) as cause:
        print(f"AGY launcher: {cause}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
