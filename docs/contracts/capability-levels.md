# Contrat : niveaux de capacité et jalons (D4, D5)

Statut : **approuvé** (issue #30). Issues liées : #9, #17, #26, #27, #28, #29.

- **N1** : représentable dans le modèle de données.
- **N2** : exécutable, persistant, reprenable après fermeture.
- **N3** : prédit quantitativement par un modèle versionné et validé dans un domaine déclaré.

Le calcul de formule est exact et déterministe : il est hors grille et **complet dès Alpha**.

| Capacité                                       | Dogfood Alpha                                                                  | Engine MVP                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------ |
| Formula (#3, #4, #19)                          | complet                                                                        | —                              |
| Process riche + DAG (#5)                       | N1 + N2                                                                        | —                              |
| Bake / session / historique (#6, #7, #20, #21) | N1 + N2                                                                        | —                              |
| Registre manuel d'ingrédients (#26)            | N1 + N2, scan hors Alpha                                                       | —                              |
| Équipement / cuisson (#28)                     | N1 + N2 : phases = étapes du Process, profils utilisateur + quelques presets   | —                              |
| Interactions (#27)                             | N1; analyses qualitatives facultatives, avec source et test, jamais bloquantes | —                              |
| Fermentation (#9, #29)                         | N1 + collecte des données; `Estimate` toujours `unsupported`                   | **premier N3**, livrable ferme |

## Données qu'Alpha doit collecter pour Engine MVP

Type et dose de levure (répartition préferment / mélange final), températures de pâte mesurées,
températures des conditions, heures réelles, critère de fin observé.

## Simulateur (#29)

- Un seul `simulate()`; les solveurs inverses (dose ↔ durée) le réutilisent et resimulent.
- Domaine étroit et déclaré; ailleurs `unsupported`, `out_of_domain` ou `insufficient_data`.
- L'étude du modèle à partir de références externes commence en parallèle d'Alpha.
