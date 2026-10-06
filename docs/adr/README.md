# Architecture Decision Records

Un ADR consigne un choix d'architecture, ses alternatives et ses conséquences. Un ADR accepté
n'est pas réécrit : on le remplace par un nouvel ADR qui le déclare `Remplacé`.

Modèle : `Statut`, `Contexte`, `Décision`, `Conséquences`.

| ADR                                          | Titre                                      | Statut                                   |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| [0001](0001-engine-first-layers.md)          | Moteur d'abord, couches et packages        | Accepté                                  |
| [0002](0002-stack.md)                        | Stack technique                            | Accepté, versions à compléter (#23, #24) |
| [0003](0003-sqlite-json-documents.md)        | Documents JSON versionnés dans SQLite      | Accepté                                  |
| [0004](0004-bake-events-only.md)             | Événements limités aux fournées            | Accepté                                  |
| [0005](0005-process-dag.md)                  | Graphe de processus minimal                | Accepté                                  |
| [0006](0006-numeric-representation.md)       | Représentation numérique et fixtures       | Accepté                                  |
| [0007](0007-history-snapshots.md)            | Révision par référence, fournée par copie  | Accepté                                  |
| [0008](0008-milestones-capability-levels.md) | Jalons Alpha / Engine MVP et niveaux N1–N3 | Accepté                                  |
