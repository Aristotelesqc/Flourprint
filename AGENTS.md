# Instructions pour les agents (Claude, Codex, autres)

## Sources de vérité

1. `docs/contracts/` : sémantique des données et des calculs. Ne pas la reconstruire à partir des
   commentaires d'issues.
2. `docs/adr/` : choix d'architecture.
3. Issue #30 : trace de l'arbitrage; les issues décrivent les besoins, pas les contrats.

Une implémentation qui contredit un contrat est fausse. Un contrat à changer se modifie dans une PR
dédiée, avant le code qui en dépend.

## Règles

- Aucun calcul boulanger hors de `packages/core/domain` (ni UI, ni CLI, ni adaptateurs, ni SQL).
- `core/domain` n'importe ni Node, ni Zod, ni UI/plateforme, ni `application`/`contracts`
  (lint + test d'architecture).
- Les fixtures de `docs/contracts/fixtures/` sont calculées hors du moteur; ne jamais les
  régénérer à partir d'une sortie du moteur ou du CLI.
- Unités persistées : grammes, °C, secondes, instants UTC, pourcentages en points.
- Pas de nouvelle dépendance sans besoin démontré.

## Commandes

```bash
pnpm install
pnpm check        # format, lint, typecheck (sources + tests), tests
pnpm build        # tsc -b
pnpm vitest run   # tests seuls (après build)
node apps/cli/dist/main.js --version
```

## Ordre de développement

Voir ADR 0008. Étape courante : 2, contrat de formule (`docs/contracts/formula.md`).
