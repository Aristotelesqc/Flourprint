# Contrat : valeurs, unités, observations, estimations (D6)

Statut : **approuvé** (issue #30). Issues liées : #6, #9, #26, #27, #28, #29.

## Unités canoniques des documents persistés

| Grandeur    | Unité        | Convention                                                      |
| ----------- | ------------ | --------------------------------------------------------------- |
| masse       | gramme       | `number`                                                        |
| température | °C           | `number`                                                        |
| durée       | seconde      | `number`, champs suffixés `S` (`plannedDurationS`)              |
| instant     | ISO 8601 UTC | chaîne terminée par `Z` (`Instant`)                             |
| pourcentage | **points**   | 70 = 70 %, champs suffixés `Pct`; aucune fraction 0–1 persistée |

Les fractions 0–1 n'existent que dans les calculs internes. `Quantity { value, unit }` n'est utilisé
qu'aux frontières : saisie dans une autre unité, étiquettes de produit, import.

## Provenance

Pas d'enveloppe sur chaque nombre. La provenance d'une valeur planifiée est portée par la structure
(révision de formule, événement d'override, référence de preset) et produite par `explain`.

## Types

```ts
interface Observation<T = number> {
  value: T;
  unit: Unit;
  observedAt: Instant;
  method?: 'measured' | 'reported';
  uncertainty?: number; // précision de l'instrument, même unité
  note?: string;
}

type Estimate<T = number> =
  | { status: 'ok'; value: T; range?: [T, T]; model: ModelRef; assumptions: string[] }
  | {
      status: 'unsupported' | 'out_of_domain' | 'insufficient_data';
      model?: ModelRef;
      missing?: string[];
      reason: string;
    };

type PropertyValue =
  | {
      status: 'known' | 'estimated';
      value: number | boolean | string; // composition, pH, densité, activité, bio…
      unit?: Unit;
      basis?: 'per100g' | 'perServing' | 'dryMatter';
      source: SourceRef;
      uncertainty?: number;
    }
  | { status: 'unknown' };

interface ModelRef {
  id: string;
  version: string;
}
```

- L'incertitude n'apparaît que là où elle a un sens : `Observation`, `Estimate`, `PropertyValue`.
- Les paramètres d'un modèle sont des données versionnées et immuables, embarquées avec l'app et
  exportées avec toute fournée qui les référence. Un hash éventuel ne sert qu'à l'intégrité.
- Une suggestion calculée (`Estimate`) ne devient jamais une observation (`Observation`).
