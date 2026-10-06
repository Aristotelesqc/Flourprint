# ADR 0008 : jalons Alpha / Engine MVP et niveaux N1–N3

Statut : Accepté (#17, #29, #30)

## Décision

- **Dogfood Alpha** : formule complète, Process riche, sessions, historique, registre manuel,
  équipement (N1 + N2), interactions en N1, fermentation sans modèle numérique (`unsupported`) mais
  avec collecte des données nécessaires. APK autonome hors ligne.
- **Engine MVP** : jalon suivant explicite; premier simulateur N3 de #29 (direct + inverse dose ↔
  durée, domaine étroit), livrable ferme.

Matrice détaillée : `docs/contracts/capability-levels.md`.

## Ordre de développement

1. Docs + scaffold. 2. Formule. 3. Process. 4. Session et historique (Node pur).
2. Persistance (après #24). 6. Mobile (après #23). 7. Dogfood Alpha. 8. Engine MVP.
   Les spikes #23 et #24 et l'étude du modèle de fermentation avancent en parallèle.
