# Generated backlog view

Accepted by the owner on 2026-10-12; implementation and activation tracked in #60.

Individual GitHub issues and their labels are the operational source of truth. The Backlog view
workflow projects them into one `github-actions[bot]` comment on #30. The body of #30 links to
that view and retains the historical arbitration and decisions. No Projects board, tracking
file, LLM summary or app dependency is introduced. Contracts and ADRs retain their authority.

## Agent workflow

- Edit acceptance, evidence, blockers, dependencies and related PRs in the individual issue.
- Maintain one `status:`, one `area:` and one `milestone:` label. Priority is optional and belongs
  to the owner. Missing, duplicate or unknown classifications remain visible as anomalies.
- A merged PR does not finish an issue. Apply the status policy in AGENTS.md based on remaining
  acceptance; the generator reads the labels and never infers completion.
- Use GitHub sub-issues for a workstream's slices (AGENTS.md, one level deep). The generator does
  not read the hierarchy yet; each sub-issue still appears under its own labels.
- Do not edit the generated comment or maintain a second status table in #30. New human decisions
  can still be added to its editorial body; the workflow has no issue-body write path.

The view includes all open issues, including #30 itself, excludes pull requests, groups by status
and shows milestone counts, area and priority. It uses the actual issue titles and links. Closed
work remains accessible through GitHub's issue search and the decision history; issue counts are
not a measure of feature completion. Operational PR/context annotations from the former manual
table belong in the relevant issues; the one-time migration preserves the old section as a
historical comment, linked from #30.

## Automation and operations

`.github/workflows/backlog.yml` runs on issue creation/edit/closure/reopening, label attachment or
removal, deletion/transfer, and label-definition changes. It reads the entire current issue list
with pagination rather than replaying the triggering event. A shared concurrency group serializes
publication; every run reads fresh data. Unchanged content does not rewrite the comment or its
timestamp. Comments are not triggers, so publication does not recursively trigger itself.

The workflow must exist on the repository's default branch (`dev` at activation). It checks out
that branch's trusted code, uses only `contents: read` and `issues: write`, and never interpolates
issue text into a shell command. Only the marked comment authored by `github-actions[bot]` is
updated; multiple matching comments fail visibly instead of choosing arbitrarily. An API failure
or an oversized view fails before publication rather than showing a silently truncated backlog.

GitHub suppresses ordinary issue events created using another workflow's `GITHUB_TOKEN`. A
six-hour reconciliation catches such changes or missed events. To refresh immediately, use
Actions → Backlog view → Run workflow on the default branch, or:

```text
gh workflow run backlog.yml --repo Aristotelesqc/Flourprint --ref dev
```

Changing labels through normal human/agent GitHub credentials triggers the event-driven path.
Scheduled runs can be delayed by GitHub; the displayed timestamp changes only when view content
changes, so it is a last-content-update time rather than proof of a recent no-op reconciliation.
The workflow log records created/updated/unchanged and the permanent view URL.

No PAT or additional secret is needed. Local read-only preview:

```text
node scripts/backlog-view.mjs --preview
node --test scripts/backlog-view.test.mjs
```

Publishing uses the workflow's `GITHUB_TOKEN`; local CLI publication is refused. The job performs
no install, build, APK or deployment, and is independent of Cloudflare preview publication.

## Activation and historical preservation

Merge the focused PR into `dev` after review and required checks, dispatch the workflow and verify
the single generated bot comment. Then replace only #30's former manual-status section with
links to the generated view and its archived predecessor, preserving all outside text verbatim.
This one-time human-authorized migration is not a recurring issue-body update. Verify a controlled
label/title change and an unchanged refresh; keep the synthetic acceptance issue out of real
work after the test. Update #60 with the actual activation evidence.

## References

- [GitHub issue/label workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#issues)
- [Token-originated event suppression](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow)
- [Issue comment API](https://docs.github.com/en/rest/issues/comments)
