"""Offline checks of the AGY stdin/result boundary; no external calls or credentials."""

from contextlib import redirect_stdout, redirect_stderr
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import run_agy


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        self.prompt = self.root / "prompt.md"
        # Larger than Windows command arguments, with characters vulnerable to shell expansion.
        self.text = ("Farine à pain 🍞 $HOME `whoami` $(hostname) ; & %PATH%\n" * 900)
        self.prompt.write_text(self.text, encoding="utf-8")
        self.cli = self.root / "agy.exe"
        self.cli.touch()
        self.output = self.root / "run-01"
        self.options = [
            "--repo", str(self.root), "--prompt", str(self.prompt), "--out", str(self.output),
            "--model", "gemini-3.8-flash-high", "--agy", str(self.cli), "--timeout", "20",
        ]
        self.before = {"head": "fixture-revision", "status": ""}

    def invoke(self, options=(), event=None, returncode=0, timeout=False, launch_error=False, input_denied=False):
        received = {}

        def backend(command, **kwargs):
            received["command"] = command
            received["input"] = json.loads(kwargs["stdin"].read().decode("utf-8"))
            received["cwd"] = kwargs["cwd"]
            received["timeout"] = kwargs["timeout"]
            if event is not None:
                kwargs["stdout"].write((json.dumps(event) + "\n").encode("utf-8"))
            if timeout:
                raise subprocess.TimeoutExpired(command, kwargs["timeout"])
            if launch_error:
                raise OSError("Execution unavailable")
            return subprocess.CompletedProcess(command, returncode)

        original_open = Path.open
        def open_file(path, *args, **kwargs):
            if input_denied and path.name == "input.ndjson" and args and args[0] == "rb":
                raise PermissionError("Input capture access denied")
            return original_open(path, *args, **kwargs)
        with patch.object(run_agy, "git_state", return_value=self.before), patch.object(run_agy.subprocess, "run", side_effect=backend) as call, patch.object(Path, "open", new=open_file), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            code = run_agy.main([*self.options, *options])
        return code, received, call.call_count

    def result(self, status="SUCCESS", response="Completed review"):
        return {"event": "result", "result": {"status": status, "response": response, "conversation_id": "owned-session"}}

    def metadata(self):
        return json.loads((self.output / "run.json").read_text(encoding="utf-8"))

    def test_large_unicode_prompt_is_stdin_data_and_report_is_only_final_result(self):
        code, received, calls = self.invoke(event=self.result())
        self.assertEqual(code, 0)
        self.assertEqual(calls, 1)
        self.assertEqual(received["input"], {"event": "user", "message": {"role": "user", "content": self.text}})
        self.assertNotIn(self.text, received["command"])
        self.assertEqual(received["cwd"], self.root)
        self.assertEqual((self.output / "report.md").read_text(), "Completed review")
        self.assertEqual(self.metadata()["conversationId"], "owned-session")
        self.assertFalse(self.metadata()["gitStateChanged"])

    def test_dry_run_starts_nothing_and_does_not_create_artifacts(self):
        code, _, calls = self.invoke(options=["--dry-run"])
        self.assertEqual(code, 0)
        self.assertEqual(calls, 0)
        self.assertFalse(self.output.exists())

    def test_resume_is_explicit_and_never_global_continue(self):
        code, received, _ = self.invoke(options=["--conversation", "explicit-session"], event=self.result())
        self.assertEqual(code, 0)
        command = received["command"]
        self.assertEqual(command[command.index("--conversation") + 1], "explicit-session")
        self.assertNotIn("--continue", command)
        self.assertNotIn("--dangerously-skip-permissions", command)
        self.assertNotIn("--disable-slash-commands", command)

    def test_zero_exit_without_result_is_not_success(self):
        code, _, _ = self.invoke(event={"event": "step_update", "step_update": {"text_delta": "Partial answer"}})
        self.assertEqual(code, 1)
        self.assertEqual(self.metadata()["status"], "missing_result")
        self.assertFalse((self.output / "report.md").exists())

    def test_failed_result_is_not_success(self):
        code, _, _ = self.invoke(event=self.result(status="ERROR"))
        self.assertEqual(code, 1)
        self.assertEqual(self.metadata()["status"], "agent_failed")

    def test_empty_response_is_not_success(self):
        code, _, _ = self.invoke(event=self.result(response="  "))
        self.assertEqual(code, 1)
        self.assertEqual(self.metadata()["status"], "empty_response")

    def test_nonzero_exit_cannot_be_overridden_by_success_payload(self):
        code, _, _ = self.invoke(event=self.result(), returncode=1)
        self.assertEqual(code, 1)
        self.assertEqual(self.metadata()["status"], "cli_failed")
        self.assertFalse((self.output / "report.md").exists())

    def test_timeout_keeps_partial_artifacts_without_retry_or_report(self):
        code, _, calls = self.invoke(event=self.result(), timeout=True)
        self.assertEqual(code, 1)
        self.assertEqual(calls, 1)
        self.assertEqual(self.metadata()["status"], "timeout")
        self.assertTrue((self.output / "input.ndjson").exists())
        self.assertFalse((self.output / "report.md").exists())

    def test_launch_failure_has_a_terminal_record(self):
        code, _, _ = self.invoke(launch_error=True)
        self.assertEqual(code, 1)
        self.assertEqual(self.metadata()["status"], "launch_failed")

    def test_capture_open_failure_has_a_terminal_record_without_launch(self):
        code, _, calls = self.invoke(input_denied=True)
        self.assertEqual(code, 1)
        self.assertEqual(calls, 0)
        self.assertEqual(self.metadata()["status"], "launch_failed")
        self.assertIn("access denied", self.metadata()["error"])

    def test_snapshot_does_not_require_or_claim_a_git_checkout(self):
        with patch.object(run_agy, "git_state", side_effect=AssertionError("Snapshot must not inspect Git")):
            # invoke patches Git itself; make the assertion directly over a snapshot dry run.
            with redirect_stdout(io.StringIO()):
                code = run_agy.main([*self.options, "--snapshot", "--dry-run"])
        self.assertEqual(code, 0)
        self.assertFalse(self.output.exists())
        code, _, _ = self.invoke(options=["--snapshot"], event=self.result())
        self.assertEqual(code, 0)
        self.assertIsNone(self.metadata()["before"])
        self.assertIsNone(self.metadata()["gitStateChanged"])

    def test_existing_output_is_preserved_without_starting_a_turn(self):
        self.output.mkdir()
        preserved = self.output / "report.md"
        preserved.write_text("Earlier report", encoding="utf-8")
        code, _, calls = self.invoke(event=self.result())
        self.assertEqual(code, 1)
        self.assertEqual(calls, 0)
        self.assertEqual(preserved.read_text(), "Earlier report")

    def test_malformed_final_result_invalidates_earlier_success(self):
        events = self.root / "events.ndjson"
        events.write_text(json.dumps(self.result()) + '\n{"event":"result","result":null}\n', encoding="utf-8")
        result, _, _ = run_agy.extract_result(events)
        self.assertEqual(result, {})

    def test_incomplete_turn_retains_top_level_initialization_session(self):
        events = self.root / "events.ndjson"
        events.write_text('{"event":"init","conversation_id":"recoverable-session"}\n', encoding="utf-8")
        result, conversation, _ = run_agy.extract_result(events)
        self.assertIsNone(result)
        self.assertEqual(conversation, "recoverable-session")

    def test_git_state_detects_changes_to_an_already_dirty_tracked_file(self):
        def git(*args):
            subprocess.run(["git", "-C", str(self.root), *args], check=True, capture_output=True)
        git("init", "-q")
        tracked = self.root / "tracked.txt"
        tracked.write_text("Base\n", encoding="utf-8")
        git("add", "tracked.txt")
        git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Fixture base")
        tracked.write_text("First edit\n", encoding="utf-8")
        before = run_agy.git_state(self.root)
        tracked.write_text("Second edit\n", encoding="utf-8")
        after = run_agy.git_state(self.root)
        self.assertEqual(before["status"], after["status"])
        self.assertNotEqual(before["trackedDiffSha256"], after["trackedDiffSha256"])


if __name__ == "__main__":
    unittest.main()
