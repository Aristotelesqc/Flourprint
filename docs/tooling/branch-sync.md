# Keeping local branches up to date

`git fetch` updates `origin/*` only. A local branch moves only when someone merges or pulls in the
checkout where it lives. Work here happens in many worktrees and pull requests merge on GitHub,
so local branches fall behind: on 2026-11-07 the main checkout's `dev` was 94 commits behind
`origin/dev`.

`pnpm git:sync` (`scripts/sync-branches.mjs`) fetches with `--prune`, then fast-forwards every
local branch that is strictly behind its upstream:

| Branch state                                                              | What the script does                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| behind, not checked out                                                   | moves the ref (`update-ref`, guarded by its old value)  |
| behind, checked out in a clean worktree, no operation in progress         | `git merge --ff-only` in that worktree                  |
| behind, worktree with uncommitted changes or a merge/rebase/bisect        | reported as skipped                                     |
| behind, checked out in another agent's worktree (`~/.codex`, `~/.gemini`) | reported as skipped, unless `--include-other-worktrees` |
| ahead, diverged, or upstream gone                                         | reported; a person decides                              |
| up to date, or no upstream                                                | nothing                                                 |

It never resets, rebases, stashes, deletes or force-pushes anything, and it never touches the
remote. Untracked files do not block a fast-forward. If one would be overwritten, git refuses, the
branch stays where it was and is reported as skipped with git's message.

Options: `--dry-run` (report only), `--no-fetch`, `--quiet` (hide up-to-date branches),
`--include-other-worktrees`.

## When it runs

- **Agents:** at session start, in the main checkout (`AGENTS.md`, Commands).
- **The owner, by hand:** `pnpm git:sync` in `C:\GitHub\Flourprint`.
- **Automatically (optional; the owner installs it, nothing installs it for them):** a Windows
  scheduled task every hour. Create it from PowerShell:

  ```powershell
  schtasks /Create /TN "Flourprint branch sync" /SC HOURLY /F /TR "cmd /c cd /d C:\GitHub\Flourprint && node scripts\sync-branches.mjs --quiet >> %LOCALAPPDATA%\flourprint-branch-sync.log 2>&1"
  ```

  Remove it with `schtasks /Delete /TN "Flourprint branch sync" /F`. The task runs with the
  owner's git credentials, like any fetch.

Branches reported as `gone` are usually merged pull request branches. Deleting them is a separate,
manual decision: `git branch -d <name>` refuses a branch that is not merged.
