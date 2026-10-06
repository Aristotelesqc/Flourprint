# Contrat : processus (D3)

Statut : **approuvé** (issue #30). Issues liées : #5, #9, #21, #28.

## Modèle

Un processus est une liste ouverte d'**instances d'étapes** répétables (ID stable par instance),
reliées par des dépendances fin → début. Le contenu métier d'une étape (opération, objet concerné,
état de la pâte, conditions, incorporations) suit #5; ce contrat fixe le graphe et le temps.

```ts
interface ProcessStep {
  id: StepId;
  dependsOn: StepId[]; // fin → début
  schedule: 'asap' | 'alap';
  plannedDurationS?: number; // absent = inconnu
  endCriterion?: EndCriterion; // observation ou décision de l'utilisateur
}
```

## Validation

- Références existantes, pas d'auto-dépendance, pas de cycle.
- L'ordre de la liste est un **ordre topologique valide** : la liste mobile se lit de haut en bas.
- Une étape ajoutée dans la liste reçoit par défaut `dependsOn = [étape précédente]`.
- `alap` sans successeur → erreur.
- Les incorporations par étape totalisent exactement les quantités du mélange final de la formule.
- `dependsOn` n'est jamais accepté puis ignoré, ni supprimé à l'import.

## Projection

- Modes : démarrer maintenant, démarrer à une heure, prêt pour une heure (cible : une étape
  terminale désignée).
- `asap` : au plus tôt après ses dépendances. `alap` : au plus tard, la référence étant la plus
  tardive des heures de début planifiées de ses successeurs (préchauffage, tangzhong).
- Recalcul pendant une fournée : figer les faits réels (débuts et fins enregistrés) → passe avant
  pour les étapes `asap` → passe arrière pour les `alap` non commencées. Le recalcul couvre **tout
  le plan futur**, pas seulement les successeurs de l'étape modifiée.
- Une fin conditionnée à une observation, sans estimation acceptée, rend les heures en aval
  `unknownAfter: StepId[]`.
- Aucune étape n'est terminée automatiquement parce que sa durée prévue est écoulée.
- Le planificateur ne fait que de l'arithmétique de temps. La continuité biologique (fermentation
  pendant les manipulations) relève de #9/#29.

Utilitaires implémentés : `topologicalSort`, `isTopologicalOrder`, `validateReferences`
(`@flourprint/core/domain`).
