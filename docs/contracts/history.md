# Contrat : historique et instantanés (D8)

Statut : **approuvé** (issue #30). Issues liées : #7, #10, #20, #26, #28, #29.

## Références et versions

- Une `FormulaRevision` référence `ingredientId@version` (et profils `id@version`) sans copier
  leurs propriétés.
- Les versions du registre, des profils et des paramètres de modèles sont **immuables et jamais
  supprimées** (archivage seulement).

## Instantané de démarrage

L'instantané vit dans le payload de l'événement `BakeStarted`, source unique et immuable.
`bakes.snapshot` n'est qu'un cache.

```ts
interface BakeStartedPayload {
  revisions: { formula: RevisionRef; process: RevisionRef };
  resolvedFormula: ResolvedFormula; // ancre, %, grammes, allocation par farine, composants, eau
  usedProperties: Array<{ ingredient: string; version: number; key: string; value: PropertyValue }>;
  resolvedProcess: ResolvedProcess; // paramètres d'équipement copiés
  initialProjection: Projection;
  estimates: Record<StepId, Estimate>;
  manifest: { engineVersion: string; contractVersion: string; models: ModelRef[] };
}
```

`usedProperties` ne contient que les propriétés effectivement consommées par le calcul.

## Pendant la fournée

- Un override dont l'effet dépend du moteur stocke la saisie **et** les valeurs recalculées
  affectées, avec les `ModelRef` utilisés.
- Une projection est stockée lorsqu'elle est **acceptée** (replanification, override de plan). La
  projection en direct se recalcule à partir des faits et n'est pas journalisée.
- Règle : on stocke les valeurs **engagées** (décisions, projections acceptées, résultats métier
  enregistrés), pas les aperçus ni les affichages transitoires.

## Relecture

- La relecture d'une fournée n'appelle jamais le moteur courant.
- Les schémas d'événements sont versionnés; des upcasters changent la représentation sans
  réinterpréter les valeurs métier.
- « Recalculer avec le moteur actuel » est une comparaison explicite, jamais un remplacement.

## Export

- Sauvegarde complète : recettes, révisions, fournées, événements et toutes les versions de
  registre, profils et paramètres de modèles qu'elles référencent.
- Export de recettes : les révisions et les versions dont elles dépendent.
