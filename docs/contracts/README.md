# Contrats de données

Source de vérité de la **sémantique** des données et des calculs de Flourprint. Le code, le CLI,
l'UI et les fixtures s'y conforment. Les choix d'architecture sont dans `../adr/`.

| Contrat                                      | Décision | Contenu                                                       |
| -------------------------------------------- | -------- | ------------------------------------------------------------- |
| [formula.md](formula.md)                     | D1, D2   | ancres, commandes d'édition, composants, grandeurs d'eau      |
| [values-and-units.md](values-and-units.md)   | D6       | unités canoniques, `Observation`, `Estimate`, `PropertyValue` |
| [process.md](process.md)                     | D3       | graphe d'étapes, `asap`/`alap`, projection                    |
| [bake-session.md](bake-session.md)           | D7       | commandes, événements, idempotence, corrections               |
| [history.md](history.md)                     | D8       | instantanés, valeurs engagées, export                         |
| [capability-levels.md](capability-levels.md) | D4, D5   | N1/N2/N3, Alpha et Engine MVP                                 |
| [fixtures/](fixtures/README.md)              | —        | cas de référence calculés hors du moteur                      |

Origine : issue #30 (arbitrage approuvé le 2026-10-06). Toute évolution passe par une modification
de ces fichiers dans une PR, pas par un commentaire d'issue. `CONTRACT_VERSION`
(`@flourprint/core/contracts`) augmente à chaque changement de contrat persisté.
