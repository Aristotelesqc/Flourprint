# Fixtures de référence

Valeurs attendues **calculées hors du moteur**, en arithmétique rationnelle exacte, à partir des
équations ci-dessous (ADR 0006, issue #30). Elles font autorité sur l'implémentation : si le moteur
diverge, c'est le moteur qui est faux, sauf correction explicite et justifiée de la fixture.

Les sorties du CLI ne sont jamais utilisées pour créer ou mettre à jour une fixture.

## Format `flourprint-fixture/0`

| Champ       | Rôle                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `input`     | formule telle que le moteur la reçoit, propriétés d'ingrédients résolues   |
| `expected`  | sorties attendues (grammes et `Pct` en points, voir `values-and-units.md`) |
| `edits`     | commandes d'édition appliquées à `input`, chacune avec son `expected`      |
| `variants`  | modifications ponctuelles de `input` (`change`) et résultat ou erreur      |
| `exact`     | valeurs rationnelles exactes lorsque le décimal est arrondi                |
| `tolerance` | tolérance de comparaison des nombres                                       |

Le format est en version 0 : les noms de champs de `input` pourront suivre les types définis à
l'étape 2 (formule). Les **valeurs** ne changent pas avec le format.

## Équations

Notations : F farine totale, `pct_i` pourcentage boulanger de l'ingrédient i, S = Σ des `pct`
(100 points de farine inclus), L pertes déclarées en grammes.

- Grammes : `g_i = F × pct_i / 100`.
- Poids de pâte : `W = F × S / 100 − L`.
- Ancre `doughWeight` : `F = 100 × (W + L) / S`.
- `SetIngredientGrams(i, g, hold: 'anchor')`, ingrédient non-farine, S hors i :
  `pct_i = g × S / (W + L − g)`.
- `SetIngredientGrams(i, g, hold: 'otherGrams')` : les autres grammes restent, `pct = 100 × g / F`,
  l'ancre prend la nouvelle valeur.
- Composant : farine `= F × flourPct / 100`, répartie selon `flourBlend`; eau
  `= farine du composant × hydrationPct / 100`; perte `= eau du composant × waterLossPct / 100`.
- Mélange final : totaux de la formule − allocations des composants, farine par farine.
- `pureWaterPct = 100 × pureWaterTotal / F`; `totalWaterPct = 100 × totalWater / F`.
- `totalWater = pureWaterTotal + Σ g_i × waterPct_i / 100 − L`, sur les ingrédients de rôle `dough`
  dont la fraction est connue ou estimée. `range` ne propage que les plages des contributions
  estimées; les contributions inconnues rendent le total `incomplete`.

## Cas

### `lean-direct.json`

S = 100 + 70 + 2 + 0,5 = 172,5; W = 1725 → F = 1000. Eau 700, sel 20, levure 5.

- `otherGrams`, sel à 22 g : F reste 1000, sel = 2,2 %, W = 1727.
- `anchor`, sel à 22 g : S hors sel = 170,5; `pct_sel = 22 × 170,5 / 1703 = 3751/1703 ≈ 2,2025837`;
  F = 172500 / (170,5 + 3751/1703) = 340600/341 ≈ 998,82698. Eau = 238420/341, levure = 1703/341,
  somme = 1725.

### `poolish-tangzhong.json`

F = 1000 : farine à pain 800, complète 200. Eau 750, sel 20, levure 4.

- Poolish : 300 g de farine à pain, eau 300, levure 1 (0,1 % de F) → 601 g.
- Tangzhong : 50 g de farine à pain, eau 250 (hydratation 500 %) → 300 g.
- Contrôle par farine : farine à pain allouée 350 ≤ 800.
- Mélange final : farine à pain 450, complète 200, eau 750 − 300 − 250 = 200, sel 20, levure 3.
  873 + 601 + 300 = 1774 = W.
- Variante perte 8 % de l'eau du tangzhong : L = 20 → tangzhong 280, W = 1754, `totalWater` 730
  (73 %), `pureWaterPct` inchangé à 75.
- Variante poolish en farine complète : 300 g requis > 200 g disponibles → `FlourAllocationExceeded`,
  bien que 300 < F.

### `enriched-milk-butter.json`

F = 500 : lait 300, beurre 50, sel 10, levure 5, W = 865. Aucune eau pure : `pureWaterPct` = 0.
Lait estimé à 87,5 % [86; 89] → 262,5 g [258; 267]. Beurre et levure inconnus → `incomplete`.
`totalWaterPct` = 52,5.
