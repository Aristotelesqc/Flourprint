# Contract: flour registry

Status: **draft for Alpha** (owner decision of 2026-10-11, brought forward from #26). Related
issues: #26, #27, #30.

The flour part of the ingredient registry (#26) is brought into Alpha so that every bake records
which flour it used and what is known about it. **No model consumes these properties yet**: they
are recorded for later calibration (#14) and enzyme-aware fermentation domains (#30, step 8).
The rest of #26 (other ingredients, barcode scan, external lookup) is unchanged and later.

## Entries

```ts
interface FlourEntry {
  id: string; // the id used in Formula.flours[].id
  version: number; // 1, 2, …; a version is immutable once written
  name?: string; // display name of a personal entry; a built-in entry is named by message key
  builtIn: boolean;
  cereal: 'wheat' | 'spelt' | 'rye' | 'corn' | 'other' | 'unknown';
  refinement: 'white' | 'partial' | 'wholeGrain' | 'unknown';
  classification?: { system: string; code: string }; // e.g. { system: 'FR', code: 'T65' }, { system: 'IT', code: '00' }
  brand?: string;
  product?: string;
  organic: PropertyValue; // boolean
  properties: {
    proteinPct: PropertyValue; // points of flour mass
    ashPct: PropertyValue; // points of flour mass
    fallingNumberS: PropertyValue; // Hagberg falling number, seconds (amylase activity: lower = more active)
    alveographW: PropertyValue; // strength W, unit '1e-4 J'
    alveographPL: PropertyValue; // P/L, no unit
    malted: PropertyValue; // boolean: malt or fungal amylase added by the mill
  };
  basedOn?: { id: string; version: number }; // a personal entry copied from another entry
  notes?: string;
  archived: boolean;
  createdAt: Instant;
}
```

- `PropertyValue` is the one of `values-and-units.md`. An unset property is `{ status: 'unknown' }`,
  never zero and never a default.
- `basis` of a percentage: `asIs` (as sold), `moisture14` (14 % moisture, common for protein and
  ash), or `dryMatter`. A label value given per serving is converted to points with its serving
  mass and keeps `basis: 'asIs'` and its `source`; the conversion adds no significant digits.
- `SourceRef` of a flour property: `{ kind: 'package' | 'producer' | 'lab' | 'reference' |
'personal'; detail?: string }` (label, mill spec sheet, lab analysis, published reference, the
  baker's own judgement).
- `classification.system` is an open code (`CA`, `FR`, `IT`, `US`, `DE`, …); the app shows it as
  given and infers nothing from it (a T65 says something about ash, but no ash is derived).

## Built-in entries

Built-in entries ship with the app, are versioned and immutable, and carry **no composition**:
every property is `unknown` (#26: a generic name does not justify a precise composition). They
give a recipe a named flour without creating one.

| id                  | Name (fr)                 | cereal | refinement | Note                                                           |
| ------------------- | ------------------------- | ------ | ---------- | -------------------------------------------------------------- |
| `all-purpose-flour` | Farine blanche tout usage | wheat  | white      |                                                                |
| `bread-flour`       | Farine à pain             | wheat  | white      |                                                                |
| `bise-flour`        | Farine bise               | wheat  | partial    | high-extraction flour, between white and whole grain           |
| `whole-wheat`       | Farine de blé entier      | wheat  | partial    | Canada: bran kept, part of the germ may be removed (to verify) |
| `whole-grain-wheat` | Farine de blé intégral    | wheat  | wholeGrain | the whole kernel                                               |
| `flour`             | Farine                    | wheat  | unknown    | generic, kept for existing recipes                             |
| `spelt-flour`       | Farine d’épeautre         | spelt  | unknown    |                                                                |
| `brown-flour`       | Farine brune              | wheat  | partial    |                                                                |
| `tipo-00-flour`     | Farine tipo 00            | wheat  | white      | `classification: { system: 'IT', code: '00' }`                 |
| `cornmeal`          | Semoule de maïs           | corn   | unknown    |                                                                |

A built-in entry is never edited. **Customizing** it writes a personal entry with a new id,
`basedOn` the built-in version, and the same names and fields until changed. A new version of the
built-ins never overwrites a personal entry.

## Personal entries

- Creating a flour writes version 1 with a new id; editing writes the next version. Earlier
  versions stay readable (history.md: registry versions are immutable and never deleted).
- Archiving hides the entry from the flour picker; formulas and bakes that use it still resolve it.
- A formula refers to a flour by `id` only (formula.md). A flour id with no registry entry stays
  valid: it is shown by name and has no properties (recipes imported or typed before the registry).

## Bakes

`StartBake` carries `flours?: Array<{ id: string; version: number }>`: for each flour of the
started formula that has a registry entry, the entry's current version. The snapshot keeps it
(`BakeStartedPayload.flours`, history.md); a ref to a flour absent from the formula is refused
(`InvalidCommand`). Snapshots written before `0.8.0` have none: unknown, not "no registry flour".

The feedback export (history.md) includes, for each bake, its flour refs, and in the backup every
referenced entry version.

## Persistence

SQLite schema 4 adds `flours (id TEXT NOT NULL, version INTEGER NOT NULL, archived INTEGER NOT
NULL, schema_version INTEGER NOT NULL, document TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY
KEY (id, version))`. Built-in entries are not stored: they are code. A full backup holds every
personal entry version; restoring validates them like any document (persistence.md).
