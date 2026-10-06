# Contrat : session de fournée (D7)

Statut : **approuvé** (issue #30). Issues liées : #6, #21, #24.

## Commandes et événements

```ts
interface BakeCommand<P> {
  commandId: string; // stable entre retries
  bakeId: string;
  expectedVersion: number; // dernier seq connu
  issuedAt: Instant;
  payload: P;
}

interface BakeEvent<P> {
  eventId: string;
  bakeId: string;
  seq: number; // 1, 2, 3… par fournée
  causationId: string; // commandId
  occurredAt: Instant; // temps métier, déclarable par l'utilisateur
  recordedAt: Instant; // horloge de l'appareil à l'écriture
  schemaVersion: number;
  type: string;
  payload: P;
}
```

## Domaine pur

- `decide(state, command, now) → Result<EventPayload[], DomainError>` valide les transitions
  (pas deux complétions d'une étape, correction ciblant un événement existant et corrigeable).
- `evolve(state, event) → state` est **structurel** : il n'appelle jamais le moteur de calcul. Les
  valeurs calculées sont dans les événements (`history.md`).
- Une commande peut produire plusieurs événements, écrits atomiquement.
- Corrections : événements typés (`StepTimeCorrected { targetEventId, newOccurredAt }`,
  `StepCompletionRetracted { targetEventId }`…). L'original n'est jamais modifié.
- Le réel (`actual`) comprend les heures, les observations et les mesures physiques facultatives
  (`Observation`). Une donnée absente reste absente.

## Repository (adaptateur SQLite)

Une transaction par commande :

1. `commandId` déjà enregistré avec le même hash de contenu → renvoyer le résultat stocké; hash
   différent → `CommandIdReused`. **Ce contrôle précède le contrôle de version.**
2. Version courante ≠ `expectedVersion` → `VersionConflict { currentVersion }`.
3. Ajouter les événements (`UNIQUE(bake_id, seq)`), mettre à jour l'index, enregistrer la commande,
   valider.

- Conflit **strict**, sans fusion de commandes compatibles : l'UI relit et redécide.
- L'UI ne confirme une action qu'après le succès de l'écriture durable.
- `BEGIN IMMEDIATE`, `SQLITE_BUSY` (connexion unique sur mobile, retries bornés) : à éprouver
  dans #24.

## Recettes

Pas d'événements pour les recettes : une modification crée une nouvelle révision, avec contrôle
optimiste de la tête de révision attendue.
