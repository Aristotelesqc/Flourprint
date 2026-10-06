# ADR 0003 : documents JSON versionnés dans SQLite

Statut : Accepté (#10, #24, #30)

## Contexte

« Structure stable, contenu flexible » : un nouveau type de pain ou une nouvelle technique ne doit
pas exiger de migration relationnelle. L'export, l'import et une future synchronisation doivent
partager un seul format.

## Décision

- Tables peu nombreuses : recettes, révisions (document JSON), fournées, événements de fournée,
  commandes traitées, métadonnées.
- Les documents et événements sont la source de vérité; les colonnes d'index sont des projections
  reconstructibles, mises à jour dans la même transaction.
- Deux niveaux de migration : SQL (structure, rares) et contenu (`schemaVersion`). Migration de
  contenu : décoder avec le contrat de la version d'entrée → migrer → valider le nouveau format →
  appliquer durablement. Versions futures non supportées refusées explicitement.
- Le même JSON sert à l'export, l'import et la sauvegarde.

## Conséquences

#24 doit prouver : atomicité, reprise après arrêt forcé, migration échouée sans perte, reconstruction
des index. Les colonnes générées SQLite ne sont qu'une option à vérifier sur les pilotes embarqués.
