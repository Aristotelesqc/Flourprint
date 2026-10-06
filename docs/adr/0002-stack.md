# ADR 0002 : stack technique

Statut : Accepté (#22, #30). Versions natives et pilotes à compléter après #23 et #24.

## Décision

pnpm workspaces, TypeScript strict, Vite, React + Ionic React, Capacitor (Android), Tailwind CSS v4
avec thème partagé, Zod 4 aux frontières, React Hook Form, Commander (CLI), Vitest + fast-check,
ESLint (typescript-eslint) + Prettier. SQLite derrière des repositories asynchrones.

Différés : Zustand, Storybook, Playwright, ORM/query builder, updater LAN (#12), Drive (#11).

## Versions retenues au scaffold

- Node ≥ 22 (runtime définitif choisi dans #24, notamment pour `node:sqlite`).
- TypeScript `~6.0` : typescript-eslint ne prend pas encore en charge TypeScript 7.
- pnpm 10.

## Conséquences

Les spikes #23 (UI Android) et #24 (SQLite) fixent les versions de React, Ionic, Capacitor,
Tailwind, des pilotes SQLite et des prérequis Android ; ils complètent cet ADR.
