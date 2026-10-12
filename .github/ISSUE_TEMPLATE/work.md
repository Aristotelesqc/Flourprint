---
name: Work item
about: A need, feature or task. Agents opening issues through the API copy this structure.
title: '[Area] Short need'
labels: ['status:backlog']
---

## Need

What the baker or the project needs, and why. Describe the need, not a solution.

## Scope

- In: …
- Out: …

## Acceptance

Verifiable criteria, by capability level when it applies (`docs/contracts/capability-levels.md`).

- [ ] N1: …
- [ ] N2: …
- [ ] N3 (later, not a gate for N1/N2): …

## Sources of truth

Contracts, ADRs and issues this depends on or changes (a contract change lands in its own pull
request first).

## Evidence expected

How acceptance will be shown: unit or golden tests, browser journey, emulator, physical device,
real bake. Say which ones are still missing when work is merged.
