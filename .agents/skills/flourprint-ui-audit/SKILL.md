---
name: flourprint-ui-audit
description: Run an independent, read-only critical UI/UX audit of the Flourprint interface (docs/mockups or the app) as a third-party agent, with measured evidence and a severity-graded report. Use on demand when someone other than the builders must judge the interface; not for accepting one's own change (flourprint-ui-check).
---

# Flourprint independent UI/UX audit

A fresh pair of eyes on the rendered interface. This is a critical audit by an agent that did not
build it, not acceptance of one's own change: for that, and for build/serve commands and browser
mechanics, use [flourprint-ui-check](../flourprint-ui-check/SKILL.md) and its
[verification.md](../flourprint-ui-check/references/verification.md) rather than redoing them here.

## Independence

- Do not read the implementing agents' delivery reports, captures, PR descriptions or
  self-assessments before forming your own view. Form it from the running interface first.
- You may read the binding references for expectations: `docs/ux/requirements.md`, `DESIGN.md`
  and the contracts relevant to the screens in scope.
- The audit is read-only: never edit the repository, push, or post on GitHub. The caller decides
  where the report goes.

## Inputs from the caller

- Target: a URL, or a build plus revision (record both in the report).
- Scope: the screens or journeys to cover.
- Optional: owner-reported issues to verify. They arrive at run time from the caller and are never
  stored in this skill. Test each on its own merits; do not let them narrow the rest of the audit.

Ask for what is missing only if it blocks the run.

## Setup

- Playwright with the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH` or `executablePath`).
  Never download browsers.
- Phone emulation: 393x852, DPR about 2.75, `hasTouch`, `isMobile`.
- French first, then English spot checks. Themes: light, dark and AMOLED (dark is not AMOLED).
  Also the 360 px width at 130 % text scale.
- Use disposable contexts and synthetic or sample data; never touch personal recipes.
- Scripts, screenshots and the report live in a scratch directory outside the repository and are
  never committed.

## Use it like a person

Drive real interactions, not only screenshots:

- Tap and type; touch drag with the configured activation (hold or move); horizontal swipes
  between top tabs.
- Both view and edit modes of each screen.
- Every reachable accordion, sheet and modal; their close, undo, back and cancel paths, and
  focus after closing.
- A complete baker journey across screens, not isolated panels.

Wait on conditions (route active, overlay gone, layout settled), not fixed sleeps.

## Measure, do not eyeball

Use bounding boxes and computed styles, and quote the numbers:

- Padding, gaps, radius and alignment between siblings and across screens.
- Font weight or size shifts between states; text overflow, truncation and clipping.
- Touch targets of at least 48 px; text and control contrast in each theme.
- The same quantity shown on several screens must agree (rounding, units, labels).

## Checklist

- Information architecture: does it follow what the baker wants to do or the engine's internal
  objects? Redundant or duplicated panels; depth of navigation.
- Layout, spacing, alignment, density, scroll behavior.
- Component consistency: buttons, fields, chips, sheets, dialogs. Say whether the fix belongs in
  `packages/ui` (shared) or in one screen.
- Typography: hierarchy, weights, sizes, number formatting.
- Wording: no "tu" or "vous" in French (impersonal forms), no hard-coded or developer text,
  jargon, or warnings left unexplained; FR and EN both complete.
- States: empty, loading, error, partial or extreme data.
- Editing safety: draft kept, undo, discard guard, destructive actions confirmed or reversible.
- Motion, and behavior under reduced motion.
- Accessibility: focus order and visibility, labels, announcements, keyboard, zoom.
- Performance feel: latency after taps, jank on scroll or drag, layout shift.

## Severity

- **blocker**: a core journey cannot be completed, data may be lost, or content is unreadable.
- **major**: a frequent task is clearly harder, misleading or inconsistent; users will notice.
- **minor**: real but limited friction or inconsistency with an easy workaround.
- **polish**: refinement with no task impact.

## Report (English)

Write it in the scratch directory; give the path to the caller. Never commit it to the
repository (AGENTS.md, Development order): the caller posts it as a comment on the issue or pull
request concerned, naming the exact revision audited. Binding outcomes go into
`docs/ux/requirements.md` through a pull request.

1. **Summary**: target, revision, date, coverage, counts per severity, overall verdict.
2. **Caller-supplied issues**: for each, verdict (reproduced / not reproduced / partly) with
   evidence.
3. **New findings by screen**: severity, what, measured evidence, screenshot, likely fix location.
4. **What works well**: keep these.
5. **Needs physical-device testing**.
6. **Not checked**: and why.

## Limits

Desktop touch emulation does not prove gesture feel, haptics, system back, keyboard or real
performance. List such items under physical-device testing (see
[flourprint-device-check](../flourprint-device-check/SKILL.md)) instead of asserting them.
