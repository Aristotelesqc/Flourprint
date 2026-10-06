# ADR 0007 : révision par référence, fournée par copie

Statut : Accepté (#7, #20, #30)

## Décision

- Les révisions de formule référencent des versions immuables (`id@version`) du registre et des
  profils; elles ne copient pas leurs propriétés.
- La fournée copie dans `BakeStarted` tout ce qui est nécessaire à sa relecture : formule résolue,
  propriétés consommées, processus résolu, projection initiale, estimations, manifeste des modèles.
- Les valeurs engagées pendant la fournée (overrides calculés, projections acceptées) sont stockées
  dans les événements. Les aperçus ne le sont pas.

## Conséquences

Les versions de registre, profils et paramètres de modèles ne sont jamais supprimées. La sauvegarde
complète les inclut. Détails : `docs/contracts/history.md`.
