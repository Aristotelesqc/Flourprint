# ADR 0005 : graphe de processus minimal

Statut : Accepté (#5, #30)

## Contexte

Le protocole de référence (#5) contient des branches parallèles (poolish et autolyse, préchauffage
pendant l'apprêt). Accepter `dependsOn` sans l'exécuter produirait des plannings faux.

## Décision

Petit DAG à dépendances fin → début, tri topologique, détection de cycles, ordonnancement
`asap`/`alap`. Pas de moteur de workflow, pas de langage de règles. L'éditeur reste une liste mobile
en ordre topologique, linéaire par défaut.

## Conséquences

Les dépendances début → début ou les délais entre étapes pourront s'ajouter sans migration. Le
planificateur ne modélise pas la biologie.
