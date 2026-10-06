# ADR 0006 : représentation numérique et fixtures de référence

Statut : Accepté (#16, #19, #30)

## Décision

- Calculs en `number` JS (double précision), sans arrondi intermédiaire; arrondi uniquement à
  l'affichage ou à la pesée. Pas de bibliothèque décimale ni d'entiers en milligrammes.
- Unités canoniques persistées : grammes, °C, secondes, instants UTC, pourcentages en points
  (`docs/contracts/values-and-units.md`).
- Fixtures de référence calculées hors du moteur (arithmétique rationnelle exacte, équations
  documentées). Les sorties du CLI ne servent qu'à la régression après validation.
- Comparaisons à tolérance relative déclarée par fixture (`1e-9` par défaut); égalité exacte pour
  les IDs, séquences et valeurs discrètes.

## Conséquences

Si un cas réel montre une dérive incompatible avec la tolérance, cet ADR sera remplacé avec un
exemple chiffré.
