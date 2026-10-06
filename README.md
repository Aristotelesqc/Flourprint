# Flourprint

Moteur de formulation, de planification et de suivi de fournées de pain, local-first et
mobile-first. Le moteur est le produit; l'application Android, le CLI et les futurs outils d'agents
en sont des clients.

- Besoins et backlog : issues GitHub (arbitrage de référence : #30).
- Contrats de données : [`docs/contracts/`](docs/contracts/README.md).
- Décisions d'architecture : [`docs/adr/`](docs/adr/README.md).
- Instructions pour les agents : [`AGENTS.md`](AGENTS.md).

## Démarrage

Prérequis : Node ≥ 22, pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm check
node apps/cli/dist/main.js --version
```

## Structure

```text
packages/core     domain (calculs purs), application (cas d'usage, ports), contracts (frontières)
apps/cli          CLI Commander, client du moteur
docs/contracts    sémantique des données et fixtures de référence
docs/adr          décisions d'architecture
```

`packages/ui`, `packages/adapters` et `apps/mobile` arriveront avec les étapes 5 et 6 (ADR 0008).
