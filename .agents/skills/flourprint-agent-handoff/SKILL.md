---
name: flourprint-agent-handoff
description: Write a short message that hands Flourprint work from one agent to another (Claude, Codex, Gemini) for the owner to relay or post - who speaks, state, decisions, asks and evidence. Use when the owner asks for a message to another agent, or when work crosses an ownership boundary (UI under Codex/Gemini, engine/contracts elsewhere).
---

# Flourprint agent handoff

The owner relays messages between agents. A handoff must stand alone, be quick to read, and
never pass an agent's opinion off as an owner decision.

## Format

Write it in the owner's language unless asked otherwise, in one copyable block:

1. **Who speaks**: "Claude here (engine, contracts, persistence)." Name the recipient's area.
2. **State**: what exists now, with PR/issue numbers and the build or commit it was seen on.
3. **Owner decisions**: quoted or closely paraphrased, dated, labelled as the owner's.
4. **The sender's own findings**: labelled as such, each with the observation behind it.
5. **Asks**: numbered, concrete, each with what "done" looks like (a mockup, a PR, evidence).
6. **Boundaries**: what the sender will not touch, who owns what (AGENTS.md "one writer").

## Rules

- Facts with references; no blame. Own your mistakes plainly (for example "the red trash button
  was mine").
- Engine needs for UI work go as an API offer ("I can provide `hydrationForRatio`"), never as
  UI code in another agent's area.
- Unanswered questions stay questions; do not answer them for the owner.
- Keep it under a screen; link documents instead of pasting them.

## Discover the task's sources before handing it off

For a future implementation, open the **assigned issue or sub-issue** first. Read its current
acceptance, scope, linked dependencies and the **canonical** documents it cites; then follow
\`AGENTS.md\`'s permanent authority order: contracts for behavior, ADRs for architecture,
\`DESIGN.md\` and reviewed architecture mockups for presentation. Treat an accepted
**contract-only PR** or merged mockup as a specification, not evidence that the feature works.

Include the exact issue number and links to the relevant canonical files in the handoff; direct
the recipient to that issue rather than requiring reconstruction of decisions from buried PR
threads. Historical issue and PR comments are useful **only to explain why** decisions were made
or to resolve a specific ambiguity; they are not a substitute for keeping the issue's acceptance
and the linked documents up to date.

Keep transient release progress, feature lists and PR statuses **in GitHub issues**, not in
\`AGENTS.md\` or this skill. If the issue's current wording conflicts with an accepted contract,
identify the discrepancy, request or make the appropriate targeted correction, and do not
silently choose the older discussion. Avoid duplicating a complete specification in the
handoff: link to it and state only actionable next steps.
