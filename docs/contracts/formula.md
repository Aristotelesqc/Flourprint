# Contrat : formule (D1, D2)

Statut : **approuvé** (issue #30). Issues liées : #3, #4, #19, #26.

## Représentation

- Chaque ingrédient porte un **pourcentage boulanger** (`bakerPct`, en points) rapporté à la
  farine totale. Les grammes sont **toujours dérivés**.
- Les farines forment un mélange (`flours[].sharePct`) dont les parts totalisent 100.
- Une formule a **une seule ancre active** :

```ts
type Anchor =
  | { kind: 'flourTotal'; grams: number }
  | { kind: 'doughWeight'; grams: number } // pâte finale, après pertes déclarées
  | { kind: 'pieces'; count: number; gramsEach: number }; // doughWeight = count × gramsEach
```

- Une ancre par moule (#28) se convertit explicitement en `doughWeight`. Jamais d'inférence de
  masse depuis un volume.

## Composants (préferments, scalds)

- Un composant **prélève** sur les totaux de la formule : farine (`flourPct` de F, réparti selon un
  `flourBlend` explicite), eau (`hydrationPct` de sa farine), autres ingrédients (`allocations`).
  Il n'ajoute aucune masse.
- Contrôle **farine par farine** : Σ des prélèvements d'une farine ≤ sa quantité dans la formule,
  sinon `FlourAllocationExceeded { flour, requiredGrams, availableGrams }`. Même contrôle pour
  l'eau et chaque ingrédient alloué.
- Une perte (évaporation) **réduit** la masse. Elle est déclarée sur le composant
  (`waterLossPct` de l'eau du composant), avec sa provenance; elle s'applique à l'étape du
  composant. Aucun taux par défaut autre que 0.

## Commandes d'édition

| Commande                                                    | Constant                       | Recalculé                                        | `IncompatibleConstraint` si…                                          |
| ----------------------------------------------------------- | ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------- |
| `SetBakerPct(ing, pct)`                                     | ancre, autres %                | grammes                                          | l'ingrédient est une farine (→ `SetFlourBlend`)                       |
| `SetFlourBlend(parts)`                                      | ancre, % non-farine            | grammes                                          | Σ parts ≠ 100 ou allocation de composant dépassée                     |
| `SetIngredientGrams(ing, g, hold: 'otherGrams')` **défaut** | grammes des autres ingrédients | tous les %, F, valeur de l'ancre (type conservé) | F ≤ 0                                                                 |
| `SetIngredientGrams(ing, g, hold: 'anchor')`                | ancre, autres %                | % de l'ingrédient, puis grammes                  | g ≥ W + L; farine sous `flourTotal` sans farine d'absorption désignée |
| `SetAnchor(anchor, 'rescale')`                              | %                              | grammes                                          | valeur ≤ 0                                                            |
| `SetAnchor(kind, 'reinterpret')`                            | grammes et %                   | valeur de la nouvelle ancre                      | `pieces` sans `count`                                                 |

- Sous `pieces` avec `otherGrams` : `count` est conservé, `gramsEach` recalculé.
- Équation de `hold: 'anchor'` sous `doughWeight` (ingrédient non-farine) :
  `pct = g × S / (W + L − g)`, S = Σ des autres % avec les 100 points de farine.
- Une pesée réelle pendant une fournée n'est **pas** une édition de formule
  (voir `bake-session.md`).
- Une contrainte impossible produit une erreur structurée (`code`, champs, explication), jamais
  une correction silencieuse.

## Grandeurs d'eau

| Nom              | Définition                                                                             |
| ---------------- | -------------------------------------------------------------------------------------- |
| `flourTotal`     | toute la farine (mélange final + composants), aussi par farine                         |
| `pureWaterTotal` | toute l'eau ajoutée comme ingrédient « eau », composants inclus                        |
| `finalMixWater`  | `pureWaterTotal` − eau allouée aux composants; négatif → erreur                        |
| `pureWaterPct`   | `100 × pureWaterTotal / flourTotal`                                                    |
| `totalWater`     | `pureWaterTotal` + Σ (masse × fraction d'eau) des ingrédients au rôle `dough` − pertes |
| `totalWaterPct`  | `100 × totalWater / flourTotal`                                                        |

```ts
interface WaterBalance {
  value: number; // grammes, contributions connues et estimées
  range?: [number, number]; // propagation des plages des contributions estimées
  completeness: 'complete' | 'incomplete';
  unknownContributors: string[]; // ingrédients dont la fraction d'eau est inconnue
}
```

- Une fraction inconnue n'est **jamais** remplacée par 0; elle rend le total `incomplete`.
- Rôles `topping` et `glaze` exclus du bilan de la pâte.
- Aucune grandeur n'est nommée « hydratation conventionnelle ». Un indice de consistance est une
  sortie de modèle (#27, N3), jamais appelé hydratation.

## Frontière Formula / Process

La formule ne connaît pas les étapes. Les incorporations par étape du Process (autolyse,
bassinage, ajout tardif) doivent totaliser exactement les quantités du mélange final; sinon erreur
de validation (voir `process.md`).

## Précision

Calculs en `number` JS sans arrondi intermédiaire. Arrondi uniquement pour l'affichage ou la pesée.
Tolérance de comparaison des fixtures : `1e-9` relatif. Voir ADR 0006.

## Références

Cas chiffrés : `fixtures/` (lean-direct, poolish-tangzhong, enriched-milk-butter).
