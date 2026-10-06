# ADR 0004 : événements limités aux fournées

Statut : Accepté (#6, #21, #30)

## Décision

Seules les sessions de fournée sont représentées par un journal d'événements en ajout seul
(`docs/contracts/bake-session.md`). Les recettes restent des documents versionnés par révisions.
Pas d'event sourcing global.

Commandes et événements sont distincts; idempotence par `commandId` avant le contrôle de
`expectedVersion`; conflit strict; corrections typées; `evolve` structurel.

## Conséquences

La reprise après fermeture est une relecture du journal. Les valeurs calculées doivent être
présentes dans les événements pour que la relecture n'appelle pas le moteur (ADR 0007).
