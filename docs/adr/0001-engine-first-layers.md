# ADR 0001 : moteur d'abord, couches et packages

Statut : Accepté (2026-10-06, #1, #22, #30)

## Contexte

Le moteur de domaine est le produit. L'UI mobile, le CLI, les outils d'agents et un futur LLM en
sont des clients. Les calculs ne doivent exister qu'à un seul endroit.

## Décision

```text
apps/mobile, apps/cli        assemblage et présentation
packages/ui                  tokens et blocs Flourprint (aucun calcul boulanger)
packages/adapters            implémentations des ports (SQLite, fichiers, natif)
packages/core/contracts      schémas aux frontières (Zod), formats d'échange
packages/core/application    cas d'usage et ports (Clock, IdGenerator, repositories)
packages/core/domain         types, calculs et invariants purs
```

- `core/domain` n'importe ni Node, ni Zod, ni React/Ionic/Capacitor, ni `application`/`contracts`.
- `core/application` dépend du domaine; horloge, IDs et stockage sont injectés.
- Exports publics par sous-chemins (`@flourprint/core/domain`…). Adaptateurs Android et Node dans
  des entrées distinctes; jamais de réexport global.
- Frontières vérifiées par ESLint (`no-restricted-imports`) et par un test d'architecture.

## Conséquences

Un adaptateur sera séparé dans son propre package si les sous-chemins ne suffisent pas à isoler
son installation ou son build. Le build mobile devra prouver qu'il n'embarque aucun module Node.
